import logging
from datetime import timedelta

import requests
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.models import SiteSettings
from notifications.services import notify_order
from orders.models import Order
from .models import Payment


logger = logging.getLogger(__name__)

SANDBOX_ENDPOINTS = {
    'request': 'https://sandbox.zarinpal.com/pg/v4/payment/request.json',
    'verify': 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json',
    'gateway': 'https://sandbox.zarinpal.com/pg/StartPay/',
}
PRODUCTION_ENDPOINTS = {
    'request': 'https://api.zarinpal.com/pg/v4/payment/request.json',
    'verify': 'https://api.zarinpal.com/pg/v4/payment/verify.json',
    'gateway': 'https://www.zarinpal.com/pg/StartPay/',
}

PLACEHOLDER_MERCHANTS = {'YOUR_MERCHANT_ID', 'CHANGE_ME_WITH_REAL_MERCHANT_ID', ''}


def gateway_config():
    """پیکربندی درگاه از پنل مدیر، با مقادیر env به‌عنوان مقدار اولیه."""
    site = SiteSettings.load()
    merchant_id = (site.gateway_merchant_id or settings.ZARINPAL_MERCHANT_ID or '').strip()
    sandbox = site.gateway_sandbox if site.gateway_merchant_id else settings.ZARINPAL_SANDBOX
    return {
        'merchant_id': merchant_id,
        'sandbox': sandbox,
        'enabled': site.online_payment_enabled,
        'endpoints': SANDBOX_ENDPOINTS if sandbox else PRODUCTION_ENDPOINTS,
    }


def get_endpoints():
    return gateway_config()['endpoints']


def gateway_ready():
    config = gateway_config()
    merchant_id = config['merchant_id']
    return bool(
        config['enabled']
        and merchant_id not in PLACEHOLDER_MERCHANTS
        and not merchant_id.startswith('CHANGE_ME')
    )


@extend_schema(responses={200: inline_serializer('PaymentConfig', {
    'online_enabled': serializers.BooleanField(),
    'cod_enabled': serializers.BooleanField(),
    'gateway': serializers.CharField(),
    'gateway_label': serializers.CharField(),
    'sandbox': serializers.BooleanField(),
})})
@api_view(['GET'])
@permission_classes([AllowAny])
def payment_config(request):
    """وضعیت روش‌های پرداخت برای نمایش در صفحه تسویه‌حساب."""
    site = SiteSettings.load()
    return Response({
        'online_enabled': gateway_ready(),
        'cod_enabled': site.cod_enabled,
        'gateway': site.payment_gateway,
        'gateway_label': site.get_payment_gateway_display(),
        'sandbox': gateway_config()['sandbox'],
    })


@extend_schema(request=None, responses={200: inline_serializer('PaymentRequestResult', {
    'payment_url': serializers.URLField(),
    'authority': serializers.CharField(),
})})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payment_request(request, order_id):
    config = gateway_config()
    if not gateway_ready():
        return Response({'error': 'درگاه پرداخت هنوز پیکربندی نشده است'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    endpoints = config['endpoints']
    with transaction.atomic():
        order = get_object_or_404(
            Order.objects.select_for_update(),
            id=order_id,
            user=request.user,
            status='pending',
            inventory_reserved=True,
            inventory_released=False,
        )
        existing_payment = Payment.objects.select_for_update().filter(order=order).first()
        if existing_payment and existing_payment.status == 'success':
            return Response({'error': 'این سفارش قبلاً پرداخت شده است.'}, status=status.HTTP_409_CONFLICT)
        reusable_after = timezone.now() - timedelta(minutes=settings.PAYMENT_AUTHORITY_REUSE_MINUTES)
        if (
            existing_payment
            and existing_payment.status == 'pending'
            and existing_payment.authority
            and existing_payment.updated_at >= reusable_after
        ):
            return Response({
                'payment_url': f"{endpoints['gateway']}{existing_payment.authority}",
                'authority': existing_payment.authority,
            })

        payload = {
            'merchant_id': config['merchant_id'],
            'amount': int(order.total) * 10,
            'description': f'پرداخت سفارش {order.order_number}',
            'callback_url': f'{settings.FRONTEND_URL}/payment/verify',
            'metadata': {
                'email': request.user.email or '',
                'mobile': request.user.phone or '',
            },
        }

        try:
            gateway_response = requests.post(endpoints['request'], json=payload, timeout=12)
            gateway_response.raise_for_status()
            result = gateway_response.json()
        except (requests.RequestException, ValueError):
            logger.exception('Zarinpal payment request failed for order %s', order.id)
            return Response({'error': 'ارتباط امن با درگاه پرداخت برقرار نشد.'}, status=status.HTTP_502_BAD_GATEWAY)

        if result.get('data', {}).get('code') != 100:
            logger.warning('Zarinpal rejected payment request for order %s: %s', order.id, result.get('errors'))
            return Response({'error': 'درگاه درخواست پرداخت را نپذیرفت.'}, status=status.HTTP_502_BAD_GATEWAY)

        authority = result['data']['authority']
        Payment.objects.update_or_create(
            order=order,
            defaults={
                'user': request.user,
                'amount': order.total,
                'status': 'pending',
                'gateway': 'zarinpal',
                'authority': authority,
                'ref_id': '',
            },
        )
        return Response({
            'payment_url': f"{endpoints['gateway']}{authority}",
            'authority': authority,
        })


@extend_schema(
    request=inline_serializer('PaymentVerifyRequest', {
        'authority': serializers.CharField(),
        'status': serializers.CharField(help_text='مقدار بازگشتی درگاه؛ OK یا NOK'),
    }),
    responses={200: inline_serializer('PaymentVerifyResult', {
        'success': serializers.BooleanField(),
        'ref_id': serializers.CharField(required=False),
        'order_number': serializers.CharField(required=False),
        'message': serializers.CharField(required=False),
    })},
)
@api_view(['POST'])
@permission_classes([AllowAny])
def payment_verify(request):
    if not gateway_ready():
        return Response({'error': 'درگاه پرداخت هنوز پیکربندی نشده است'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    authority = str(request.data.get('authority', '')).strip()
    status_code = str(request.data.get('status', '')).upper().strip()
    if not authority:
        return Response({'error': 'شناسه تراکنش ارسال نشده است'}, status=status.HTTP_400_BAD_REQUEST)

    payment = get_object_or_404(Payment.objects.select_related('order'), authority=authority)
    if payment.status == 'success':
        return Response({
            'success': True,
            'ref_id': payment.ref_id,
            'order_number': payment.order.order_number,
        })

    if status_code != 'OK':
        Payment.objects.filter(pk=payment.pk, status='pending').update(status='failed')
        return Response({'success': False, 'message': 'پرداخت توسط کاربر لغو شد'})

    config = gateway_config()
    endpoints = config['endpoints']
    payload = {
        'merchant_id': config['merchant_id'],
        'amount': int(payment.amount) * 10,
        'authority': authority,
    }

    try:
        gateway_response = requests.post(endpoints['verify'], json=payload, timeout=12)
        gateway_response.raise_for_status()
        result = gateway_response.json()
    except (requests.RequestException, ValueError):
        logger.exception('Zarinpal verification failed for payment %s', payment.id)
        return Response({'error': 'تأیید پرداخت از درگاه دریافت نشد'}, status=status.HTTP_502_BAD_GATEWAY)

    gateway_code = result.get('data', {}).get('code')
    if gateway_code not in (100, 101):
        Payment.objects.filter(pk=payment.pk, status='pending').update(status='failed')
        logger.warning('Zarinpal rejected verification for payment %s: %s', payment.id, result.get('errors'))
        return Response({'success': False, 'message': 'پرداخت توسط درگاه تأیید نشد'})

    ref_id = str(result['data']['ref_id'])
    just_paid = False
    with transaction.atomic():
        locked_payment = Payment.objects.select_for_update().select_related('order').get(pk=payment.pk)
        if locked_payment.status != 'success':
            locked_payment.status = 'success'
            locked_payment.ref_id = ref_id
            locked_payment.save(update_fields=['status', 'ref_id', 'updated_at'])
            order = locked_payment.order
            if order.status == 'pending' and order.inventory_reserved and not order.inventory_released:
                order.status = 'paid'
                order.save(update_fields=['status', 'updated_at'])
                just_paid = True
                for item in order.items.select_related('product'):
                    if item.product_id:
                        item.product.__class__.objects.filter(pk=item.product_id).update(sold_count=F('sold_count') + item.quantity)

    if just_paid:
        notify_order(payment.order, 'paid')

    payment.refresh_from_db(fields=['status', 'ref_id'])
    payment.order.refresh_from_db(fields=['status', 'order_number', 'inventory_released'])
    if payment.order.status != 'paid':
        logger.critical(
            'Verified payment %s belongs to non-payable order %s with status %s',
            payment.id,
            payment.order_id,
            payment.order.status,
        )
        return Response(
            {
                'success': False,
                'requires_manual_refund': True,
                'message': 'پرداخت تأیید شد اما رزرو سفارش منقضی شده است؛ پشتیبانی باید وجه را بررسی کند.',
                'ref_id': payment.ref_id,
                'order_number': payment.order.order_number,
            },
            status=status.HTTP_409_CONFLICT,
        )

    return Response({
        'success': True,
        'ref_id': payment.ref_id,
        'order_number': payment.order.order_number,
    })
