from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, serializers, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Sum, Count, Avg, Q, F
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Order, Cart, CartItem, OrderItem
from .serializers import (OrderSerializer, CartSerializer, CartItemSerializer,
                          CreateOrderSerializer)
from users.models import Address
from core.models import SiteSettings
from discounts.models import Coupon, CouponUsage
from notifications.services import notify_order
from products.models import Product, ProductVariant


def get_or_create_cart(request):
    if request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
    else:
        if not request.session.session_key:
            request.session.create()
        cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key)
    return cart


class CartView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        return get_or_create_cart(self.request)


@extend_schema(request=CartItemSerializer, responses={201: CartSerializer})
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def add_to_cart(request):
    cart = get_or_create_cart(request)
    serializer = CartItemSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save(cart=cart)
    return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


@extend_schema(
    request=inline_serializer('CartItemQuantity', {'quantity': serializers.IntegerField()}),
    responses={200: CartSerializer},
)
@api_view(['PATCH'])
@permission_classes([permissions.AllowAny])
@transaction.atomic
def update_cart_item(request, item_id):
    cart = get_or_create_cart(request)
    item = get_object_or_404(
        CartItem.objects.select_for_update().select_related('product', 'variant'),
        id=item_id,
        cart=cart,
    )
    try:
        quantity = int(request.data.get('quantity', 1))
    except (TypeError, ValueError):
        return Response({'error': 'تعداد نامعتبر است.'}, status=status.HTTP_400_BAD_REQUEST)
    if quantity <= 0:
        item.delete()
        return Response(CartSerializer(cart).data)

    if item.product.status != 'active':
        return Response({'error': 'این محصول دیگر قابل سفارش نیست.'}, status=status.HTTP_409_CONFLICT)
    available_stock = item.variant.stock if item.variant_id else item.product.stock
    if item.variant_id and not item.variant.is_active:
        return Response({'error': 'سایز انتخاب‌شده دیگر فعال نیست.'}, status=status.HTTP_409_CONFLICT)
    if quantity > available_stock:
        return Response({'error': 'تعداد درخواستی بیشتر از موجودی است.'}, status=status.HTTP_409_CONFLICT)

    item.quantity = quantity
    item.save(update_fields=['quantity'])
    return Response(CartSerializer(cart).data)


@extend_schema(request=None, responses={200: CartSerializer})
@api_view(['DELETE'])
@permission_classes([permissions.AllowAny])
def remove_from_cart(request, item_id):
    cart = get_or_create_cart(request)
    item = get_object_or_404(CartItem, id=item_id, cart=cart)
    item.delete()
    return Response(CartSerializer(cart).data)


@extend_schema(
    request=None,
    responses={200: inline_serializer('CartCleared', {'message': serializers.CharField()})},
)
@api_view(['DELETE'])
@permission_classes([permissions.AllowAny])
def clear_cart(request):
    cart = get_or_create_cart(request)
    cart.items.all().delete()
    return Response({'message': 'سبد خرید خالی شد'})


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    # فقط برای تشخیص مدل توسط تولیدکنندهٔ اسکیما؛ در زمان اجرا get_queryset حاکم است.
    queryset = Order.objects.none()

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items')


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Order.objects.none()

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items')


def _validate_coupon(coupon_code, user, locked_items, subtotal):
    if not coupon_code:
        return None, Decimal('0')

    try:
        coupon = Coupon.objects.select_for_update().prefetch_related('products', 'categories').get(
            code__iexact=coupon_code.strip(),
        )
    except Coupon.DoesNotExist as exc:
        raise ValidationError({'coupon_code': 'کد تخفیف نامعتبر است.'}) from exc

    if not coupon.is_valid:
        raise ValidationError({'coupon_code': 'کد تخفیف منقضی یا غیرفعال است.'})
    if subtotal < coupon.min_order_amount:
        raise ValidationError({'coupon_code': 'حداقل مبلغ لازم برای این کد تخفیف تأمین نشده است.'})
    if coupon.per_user_limit and CouponUsage.objects.filter(coupon=coupon, user=user).count() >= coupon.per_user_limit:
        raise ValidationError({'coupon_code': 'سقف استفاده شما از این کد تخفیف تمام شده است.'})

    allowed_products = set(coupon.products.values_list('id', flat=True))
    allowed_categories = set(coupon.categories.values_list('id', flat=True))
    if allowed_products or allowed_categories:
        eligible_subtotal = sum(
            product.price * cart_item.quantity
            for cart_item, product, _variant in locked_items
            if product.id in allowed_products or product.category_id in allowed_categories
        )
        if eligible_subtotal <= 0:
            raise ValidationError({'coupon_code': 'این کد برای محصولات سبد شما قابل استفاده نیست.'})
    else:
        eligible_subtotal = subtotal

    return coupon, coupon.calculate_discount(eligible_subtotal)


@extend_schema(request=CreateOrderSerializer, responses={201: OrderSerializer})
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@transaction.atomic
def create_order(request):
    serializer = CreateOrderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user_cart = get_or_create_cart(request)
    cart = Cart.objects.select_for_update().get(pk=user_cart.pk)
    cart_items = list(
        cart.items.select_for_update()
        .select_related('product', 'variant')
        .order_by('product_id', 'variant_id')
    )
    if not cart_items:
        return Response({'error': 'سبد خرید خالی است.'}, status=status.HTTP_400_BAD_REQUEST)

    address = get_object_or_404(Address, id=serializer.validated_data['address_id'], user=request.user)

    locked_items = []
    for cart_item in cart_items:
        try:
            product = Product.objects.select_for_update().get(pk=cart_item.product_id, status='active')
        except Product.DoesNotExist as exc:
            raise ValidationError({'cart': 'یکی از محصولات سبد دیگر قابل سفارش نیست.'}) from exc

        has_active_variants = ProductVariant.objects.filter(product=product, is_active=True).exists()
        variant = None
        if has_active_variants:
            if not cart_item.variant_id:
                raise ValidationError({'cart': f'برای «{product.name}» باید سایز انتخاب شود.'})
            try:
                variant = ProductVariant.objects.select_for_update().get(
                    pk=cart_item.variant_id,
                    product=product,
                    is_active=True,
                )
            except ProductVariant.DoesNotExist as exc:
                raise ValidationError({'cart': f'سایز انتخاب‌شده برای «{product.name}» معتبر نیست.'}) from exc
            available_stock = variant.stock
        else:
            if cart_item.variant_id:
                raise ValidationError({'cart': f'تنوع انتخاب‌شده برای «{product.name}» معتبر نیست.'})
            available_stock = product.stock

        if cart_item.quantity > available_stock:
            raise ValidationError({'cart': f'موجودی «{product.name}» برای تعداد درخواستی کافی نیست.'})
        locked_items.append((cart_item, product, variant))

    subtotal = sum(product.price * cart_item.quantity for cart_item, product, _variant in locked_items)
    coupon_code = serializer.validated_data.get('coupon_code', '').strip()
    coupon, discount_amount = _validate_coupon(
        coupon_code,
        request.user,
        locked_items,
        subtotal,
    )

    site = SiteSettings.load()
    free_shipping_threshold = Decimal(str(site.free_shipping_threshold))
    shipping_cost = Decimal('0') if subtotal >= free_shipping_threshold else Decimal(str(site.flat_shipping_cost))
    total = subtotal - discount_amount + shipping_cost

    order = Order.objects.create(
        user=request.user,
        receiver_name=address.receiver_name,
        receiver_phone=address.phone,
        province=address.province,
        city=address.city,
        street=address.street,
        postal_code=address.postal_code,
        subtotal=subtotal,
        discount_amount=discount_amount,
        shipping_cost=shipping_cost,
        total=total,
        coupon_code=coupon.code if coupon else '',
        notes=serializer.validated_data.get('notes', ''),
        inventory_reserved=True,
    )

    for cart_item, product, variant in locked_items:
        stock_model = ProductVariant if variant else Product
        stock_pk = variant.pk if variant else product.pk
        updated = stock_model.objects.filter(pk=stock_pk, stock__gte=cart_item.quantity).update(
            stock=F('stock') - cart_item.quantity,
        )
        if updated != 1:
            raise ValidationError({'cart': f'موجودی «{product.name}» هم‌زمان تغییر کرده است؛ دوباره تلاش کنید.'})

        img = product.main_image
        OrderItem.objects.create(
            order=order,
            product=product,
            product_name=product.name,
            product_sku=product.sku,
            variant=variant,
            variant_label=variant.label if variant else '',
            variant_sku=variant.sku if variant else '',
            product_image=img.image.url if img else '',
            unit_price=product.price,
            quantity=cart_item.quantity,
        )

    if coupon:
        CouponUsage.objects.create(coupon=coupon, user=request.user, order=order)
        Coupon.objects.filter(pk=coupon.pk).update(used_count=F('used_count') + 1)

    cart.items.all().delete()
    transaction.on_commit(lambda: notify_order(order, 'created'))
    return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


@extend_schema(responses={200: OpenApiTypes.OBJECT})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def sales_report(request):
    """گزارش جامع فروش — فقط staff"""
    if not request.user.is_staff:
        return Response({'error': 'دسترسی ندارید'}, status=403)

    now = timezone.now()
    today = now.date()
    last_30 = now - timedelta(days=30)
    last_7 = now - timedelta(days=7)

    paid_orders = Order.objects.filter(status__in=['paid', 'processing', 'shipped', 'delivered'])

    # ─── کارت‌های خلاصه ───
    total_revenue = paid_orders.aggregate(s=Sum('total'))['s'] or 0
    total_orders = Order.objects.count()
    paid_count = paid_orders.count()
    cancelled_count = Order.objects.filter(status='cancelled').count()
    pending_count = Order.objects.filter(status='pending').count()

    from users.models import User
    total_customers = User.objects.filter(is_staff=False).count()
    new_customers_30d = User.objects.filter(
        is_staff=False, date_joined__gte=last_30
    ).count()

    revenue_30d = paid_orders.filter(created_at__gte=last_30).aggregate(s=Sum('total'))['s'] or 0
    orders_30d = Order.objects.filter(created_at__gte=last_30).count()
    revenue_7d = paid_orders.filter(created_at__gte=last_7).aggregate(s=Sum('total'))['s'] or 0

    # ─── نمودار درآمد روزانه (۳۰ روز) ───
    daily_revenue = list(
        paid_orders.filter(created_at__gte=last_30)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(revenue=Sum('total'), count=Count('id'))
        .order_by('day')
    )

    # ─── نمودار سفارشات ماهانه (۱۲ ماه) ───
    last_12m = now - timedelta(days=365)
    monthly = list(
        paid_orders.filter(created_at__gte=last_12m)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'), revenue=Sum('total'))
        .order_by('month')
    )

    # ─── پرفروش‌ترین محصولات ───
    top_products = list(
        OrderItem.objects.filter(order__in=paid_orders)
        .values('product_name')
        .annotate(total_qty=Sum('quantity'), total_revenue=Sum('total_price'))
        .order_by('-total_qty')[:10]
    )

    # ─── آخرین سفارشات ───
    recent_orders = OrderSerializer(
        Order.objects.select_related('user').prefetch_related('items')[:20],
        many=True
    ).data

    # ─── توزیع وضعیت سفارشات ───
    status_breakdown = list(
        Order.objects.values('status')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return Response({
        'summary': {
            'total_revenue': total_revenue,
            'revenue_30d': revenue_30d,
            'revenue_7d': revenue_7d,
            'total_orders': total_orders,
            'paid_orders': paid_count,
            'cancelled_orders': cancelled_count,
            'pending_orders': pending_count,
            'orders_30d': orders_30d,
            'total_customers': total_customers,
            'new_customers_30d': new_customers_30d,
        },
        'daily_revenue': [
            {'day': str(r['day']), 'revenue': r['revenue'], 'count': r['count']}
            for r in daily_revenue
        ],
        'monthly': [
            {'month': str(r['month'])[:7], 'count': r['count'], 'revenue': r['revenue'] or 0}
            for r in monthly
        ],
        'top_products': top_products,
        'recent_orders': recent_orders,
        'status_breakdown': status_breakdown,
    })


class AdminOrderListView(generics.ListAPIView):
    """لیست همه سفارشات برای ادمین"""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Order.objects.none()

    def get_queryset(self):
        if not self.request.user.is_staff:
            return Order.objects.none()
        qs = Order.objects.select_related('user').prefetch_related('items').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


@extend_schema(
    request=inline_serializer('AdminOrderStatusUpdate', {
        'status': serializers.ChoiceField(choices=Order.STATUS_CHOICES),
        'tracking_code': serializers.CharField(required=False, allow_blank=True),
        'refund_confirmed': serializers.BooleanField(required=False),
    }),
    responses={200: OrderSerializer},
)
@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
@transaction.atomic
def admin_update_order_status(request, order_id):
    """تغییر وضعیت سفارش توسط ادمین"""
    if not request.user.is_staff:
        return Response({'error': 'دسترسی ندارید'}, status=403)
    order = get_object_or_404(Order.objects.select_for_update(), id=order_id)
    new_status = request.data.get('status')
    transitions = {
        'pending': {'cancelled'},
        'paid': {'processing', 'refunded'},
        'processing': {'shipped', 'refunded'},
        'shipped': {'delivered', 'refunded'},
        'delivered': {'refunded'},
        'cancelled': set(),
        'refunded': set(),
    }
    if new_status == 'paid':
        return Response({'error': 'وضعیت پرداخت فقط با تأیید درگاه تغییر می‌کند.'}, status=status.HTTP_400_BAD_REQUEST)
    if new_status not in transitions.get(order.status, set()):
        return Response({'error': 'این تغییر وضعیت مجاز نیست.'}, status=status.HTTP_409_CONFLICT)
    if new_status == 'refunded' and request.data.get('refund_confirmed') is not True:
        return Response(
            {'error': 'ابتدا بازگشت وجه را در درگاه انجام دهید و refund_confirmed=true بفرستید.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    previous_status = order.status
    order.status = new_status
    update_fields = ['status', 'updated_at']
    if new_status == 'shipped':
        tracking_code = str(request.data.get('tracking_code', '')).strip()
        if not tracking_code:
            return Response({'error': 'ثبت کد رهگیری برای سفارش ارسال‌شده الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)
        order.tracking_code = tracking_code
        update_fields.append('tracking_code')
    order.save(update_fields=update_fields)
    if new_status == 'cancelled' or (new_status == 'refunded' and previous_status in {'paid', 'processing'}):
        order.release_inventory()
    if new_status in {'shipped', 'delivered'}:
        transaction.on_commit(lambda: notify_order(order, new_status))
    return Response(OrderSerializer(order).data)
