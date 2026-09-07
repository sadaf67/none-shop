from django.db.models import Count, Max, Q, Sum
from drf_spectacular.utils import extend_schema, extend_schema_field, inline_serializer
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .models import Address, User

PAID_STATUSES = ('paid', 'processing', 'shipped', 'delivered')


class AdminAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ('id', 'title', 'receiver_name', 'phone', 'province', 'city',
                  'street', 'postal_code', 'is_default')


class AdminCustomerSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    orders_count = serializers.IntegerField(read_only=True)
    paid_orders_count = serializers.IntegerField(read_only=True)
    total_spent = serializers.IntegerField(read_only=True)
    last_order_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'full_name', 'first_name', 'last_name', 'email',
                  'phone', 'city', 'address', 'postal_code', 'is_active', 'is_verified',
                  'is_staff', 'date_joined', 'last_login',
                  'orders_count', 'paid_orders_count', 'total_spent', 'last_order_at')
        read_only_fields = ('id', 'username', 'date_joined', 'last_login', 'is_staff')


class AdminCustomerDetailSerializer(AdminCustomerSerializer):
    addresses = AdminAddressSerializer(many=True, read_only=True)
    recent_orders = serializers.SerializerMethodField()

    class Meta(AdminCustomerSerializer.Meta):
        fields = AdminCustomerSerializer.Meta.fields + ('addresses', 'recent_orders')

    @extend_schema_field(serializers.ListSerializer(child=serializers.DictField()))
    def get_recent_orders(self, obj):
        orders = obj.orders.order_by('-created_at')[:20]
        return [{
            'id': str(order.id),
            'order_number': order.order_number,
            'status': order.status,
            'status_label': order.get_status_display(),
            'total': int(order.total),
            'created_at': order.created_at,
        } for order in orders]


class AdminCustomerViewSet(viewsets.ModelViewSet):
    """مدیریت مشتریان — فقط مشاهده، ویرایش اطلاعات تماس و فعال/غیرفعال کردن."""
    # مقدار واقعی در get_queryset ساخته می‌شود؛ این فقط برای تشخیص مدل توسط اسکیما است.
    queryset = User.objects.none()
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'patch', 'head', 'options']
    search_fields = ['username', 'first_name', 'last_name', 'email', 'phone']
    filterset_fields = ['is_active', 'is_verified']
    ordering_fields = ['date_joined', 'total_spent', 'orders_count', 'last_order_at']
    ordering = ['-date_joined']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AdminCustomerDetailSerializer
        return AdminCustomerSerializer

    def get_queryset(self):
        queryset = User.objects.annotate(
            orders_count=Count('orders', distinct=True),
            paid_orders_count=Count('orders', filter=Q(orders__status__in=PAID_STATUSES), distinct=True),
            total_spent=Sum('orders__total', filter=Q(orders__status__in=PAID_STATUSES)),
            last_order_at=Max('orders__created_at'),
        )
        if self.request.query_params.get('include_staff') != '1':
            queryset = queryset.filter(is_staff=False)
        segment = self.request.query_params.get('segment')
        if segment == 'buyers':
            queryset = queryset.filter(paid_orders_count__gt=0)
        elif segment == 'leads':
            queryset = queryset.filter(paid_orders_count=0)
        elif segment == 'loyal':
            queryset = queryset.filter(paid_orders_count__gte=3)
        return queryset

    @extend_schema(
        request=None,
        responses=inline_serializer('AdminCustomerToggleActive', {'is_active': serializers.BooleanField()}),
    )
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        if user.is_superuser:
            return Response({'error': 'امکان غیرفعال کردن مدیر ارشد وجود ندارد.'}, status=400)
        if user.pk == request.user.pk:
            return Response({'error': 'نمی‌توانید حساب خود را غیرفعال کنید.'}, status=400)
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({'is_active': user.is_active})


@extend_schema(
    responses=inline_serializer('AdminCustomerStats', {
        'total': serializers.IntegerField(),
        'active': serializers.IntegerField(),
        'verified': serializers.IntegerField(),
        'new_last_30_days': serializers.IntegerField(),
        'buyers': serializers.IntegerField(),
    }),
)
@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_customer_stats(request):
    from django.utils import timezone
    from datetime import timedelta

    customers = User.objects.filter(is_staff=False)
    month_ago = timezone.now() - timedelta(days=30)
    buyers = customers.filter(orders__status__in=PAID_STATUSES).distinct().count()
    return Response({
        'total': customers.count(),
        'active': customers.filter(is_active=True).count(),
        'verified': customers.filter(is_verified=True).count(),
        'new_last_30_days': customers.filter(date_joined__gte=month_ago).count(),
        'buyers': buyers,
    })
