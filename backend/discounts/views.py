from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .serializers import CouponValidateSerializer
from .models import CouponUsage
from orders.models import Cart


@extend_schema(
    request=CouponValidateSerializer,
    responses={200: inline_serializer('CouponValidationResult', {
        'code': serializers.CharField(),
        'discount_type': serializers.CharField(),
        'value': serializers.DecimalField(max_digits=10, decimal_places=0),
        'discount_amount': serializers.DecimalField(max_digits=12, decimal_places=0),
        'final_amount': serializers.DecimalField(max_digits=12, decimal_places=0),
    })},
)
@api_view(['POST'])
@permission_classes([AllowAny])
def validate_coupon(request):
    serializer = CouponValidateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    coupon = serializer.validated_data['coupon']
    cart = None
    if request.user.is_authenticated:
        cart = Cart.objects.filter(user=request.user).prefetch_related('items__product').first()
        if coupon.per_user_limit and CouponUsage.objects.filter(coupon=coupon, user=request.user).count() >= coupon.per_user_limit:
            raise ValidationError({'code': 'سقف استفاده شما از این کد تخفیف تمام شده است.'})
    elif request.session.session_key:
        cart = Cart.objects.filter(session_key=request.session.session_key).prefetch_related('items__product').first()

    amount = cart.total if cart else serializer.validated_data['order_amount']
    if amount < coupon.min_order_amount:
        raise ValidationError({'code': 'حداقل مبلغ لازم برای این کد تخفیف تأمین نشده است.'})

    allowed_products = set(coupon.products.values_list('id', flat=True))
    allowed_categories = set(coupon.categories.values_list('id', flat=True))
    if allowed_products or allowed_categories:
        if not cart:
            raise ValidationError({'code': 'برای بررسی این کد، ابتدا محصول مجاز را به سبد اضافه کنید.'})
        eligible_amount = sum(
            item.product.price * item.quantity
            for item in cart.items.all()
            if item.product_id in allowed_products or item.product.category_id in allowed_categories
        )
        if eligible_amount <= 0:
            raise ValidationError({'code': 'این کد برای محصولات سبد شما قابل استفاده نیست.'})
    else:
        eligible_amount = amount

    discount = coupon.calculate_discount(eligible_amount)
    return Response({
        'code': coupon.code,
        'discount_type': coupon.discount_type,
        'value': coupon.value,
        'discount_amount': discount,
        'final_amount': amount - discount,
    })
