from rest_framework import serializers
from .models import Coupon


class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField()
    order_amount = serializers.DecimalField(max_digits=12, decimal_places=0)

    def validate(self, attrs):
        try:
            coupon = Coupon.objects.get(code=attrs['code'])
        except Coupon.DoesNotExist:
            raise serializers.ValidationError({'code': 'کد تخفیف یافت نشد'})

        if not coupon.is_valid:
            raise serializers.ValidationError({'code': 'کد تخفیف منقضی یا غیرفعال است'})

        if attrs['order_amount'] < coupon.min_order_amount:
            raise serializers.ValidationError({
                'code': f'حداقل مبلغ سفارش برای این کد {coupon.min_order_amount:,.0f} تومان است'
            })

        attrs['coupon'] = coupon
        return attrs
