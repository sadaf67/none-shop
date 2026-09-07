from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_field
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Coupon, CouponUsage


class AdminCouponSerializer(serializers.ModelSerializer):
    is_valid = serializers.ReadOnlyField()
    remaining_uses = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = '__all__'
        read_only_fields = ('used_count', 'created_at')

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_remaining_uses(self, obj):
        if obj.usage_limit is None:
            return None
        return max(0, obj.usage_limit - obj.used_count)

    def validate_code(self, value):
        value = value.strip().upper()
        duplicates = Coupon.objects.filter(code__iexact=value)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError('این کد تخفیف قبلاً ثبت شده است.')
        return value

    def validate(self, attrs):
        discount_type = attrs.get('discount_type', getattr(self.instance, 'discount_type', 'percent'))
        value = attrs.get('value', getattr(self.instance, 'value', 0))
        valid_from = attrs.get('valid_from', getattr(self.instance, 'valid_from', None))
        valid_until = attrs.get('valid_until', getattr(self.instance, 'valid_until', None))

        if discount_type == 'percent' and value > 100:
            raise serializers.ValidationError({'value': 'درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.'})
        if valid_from and valid_until and valid_until <= valid_from:
            raise serializers.ValidationError({'valid_until': 'زمان پایان باید بعد از زمان شروع باشد.'})
        return attrs


class AdminCouponUsageSerializer(serializers.ModelSerializer):
    user_label = serializers.CharField(source='user.full_name', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = CouponUsage
        fields = ('id', 'user_label', 'order_number', 'used_at')


class AdminCouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.prefetch_related('products', 'categories').order_by('-created_at')
    serializer_class = AdminCouponSerializer
    permission_classes = [permissions.IsAdminUser]
    search_fields = ['code']
    filterset_fields = ['is_active', 'discount_type']

    def get_queryset(self):
        queryset = super().get_queryset()
        state = self.request.query_params.get('state')
        now = timezone.now()
        if state == 'active':
            queryset = queryset.filter(is_active=True, valid_from__lte=now, valid_until__gte=now)
        elif state == 'expired':
            queryset = queryset.filter(valid_until__lt=now)
        elif state == 'scheduled':
            queryset = queryset.filter(valid_from__gt=now)
        return queryset

    @extend_schema(responses=AdminCouponUsageSerializer(many=True))
    @action(detail=True, methods=['get'])
    def usages(self, request, pk=None):
        coupon = self.get_object()
        usages = coupon.usages.select_related('user', 'order').order_by('-used_at')[:100]
        return Response(AdminCouponUsageSerializer(usages, many=True).data)
