from django.db import transaction
from django.db.models import Count, Q, Sum
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .admin_serializers import (
    AdminBrandSerializer,
    AdminCategorySerializer,
    AdminProductImageSerializer,
    AdminProductSerializer,
    AdminProductVariantSerializer,
    AdminTagSerializer,
)
from .models import Brand, Category, Product, ProductImage, ProductVariant, Tag


class AdminProductViewSet(viewsets.ModelViewSet):
    serializer_class = AdminProductSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_fields = ['name', 'sku', 'barcode', 'description', 'brand__name']
    filterset_fields = ['status', 'category', 'brand', 'is_featured', 'include_in_feeds']
    ordering_fields = ['created_at', 'price', 'stock', 'sold_count', 'display_order', 'name']
    ordering = ['display_order', '-created_at']
    # فقط برای تشخیص مدل توسط تولیدکنندهٔ اسکیما؛ در زمان اجرا get_queryset حاکم است.
    queryset = Product.objects.none()

    def get_queryset(self):
        queryset = Product.objects.select_related('category', 'brand').prefetch_related(
            'images', 'variants', 'tags', 'attributes__attribute',
        )
        stock_filter = self.request.query_params.get('stock_state')
        if stock_filter == 'out':
            queryset = queryset.filter(stock=0).exclude(variants__stock__gt=0)
        elif stock_filter == 'low':
            queryset = queryset.filter(stock__gt=0, stock__lte=5)
        return queryset

    @extend_schema(request=None, responses={201: AdminProductSerializer})
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        source = self.get_object()
        with transaction.atomic():
            clone = Product.objects.get(pk=source.pk)
            clone.pk = None
            clone.id = None
            clone.slug = ''
            clone.sku = ''
            clone.name = f'{source.name} (کپی)'
            clone.status = 'draft'
            clone.views_count = 0
            clone.sold_count = 0
            clone.save()
            clone.tags.set(source.tags.all())
            for variant in source.variants.all():
                ProductVariant.objects.create(
                    product=clone, size=variant.size, color=variant.color,
                    sku=f'{clone.sku}-{variant.size}-{variant.color or "x"}'[:100],
                    stock=0, is_active=variant.is_active, order=variant.order,
                )
        return Response(AdminProductSerializer(clone).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=inline_serializer('AdminProductBulkStatus', {
            'ids': serializers.ListField(child=serializers.UUIDField()),
            'status': serializers.ChoiceField(choices=Product.STATUS_CHOICES),
        }),
        responses={200: inline_serializer('AdminProductBulkResult', {
            'updated': serializers.IntegerField(),
        })},
    )
    @action(detail=False, methods=['post'])
    def bulk_status(self, request):
        ids = request.data.get('ids') or []
        new_status = request.data.get('status')
        if not isinstance(ids, list) or new_status not in dict(Product.STATUS_CHOICES):
            return Response({'error': 'ورودی نامعتبر است.'}, status=status.HTTP_400_BAD_REQUEST)
        updated = Product.objects.filter(pk__in=ids).update(status=new_status)
        return Response({'updated': updated})

    @extend_schema(
        request=inline_serializer('AdminProductBulkPrice', {
            'ids': serializers.ListField(child=serializers.UUIDField()),
            'percent': serializers.FloatField(help_text='بین -۹۰ تا ۹۰۰'),
        }),
        responses={200: inline_serializer('AdminProductBulkPriceResult', {
            'updated': serializers.IntegerField(),
        })},
    )
    @action(detail=False, methods=['post'])
    def bulk_price(self, request):
        """تغییر درصدی قیمت گروهی از محصولات."""
        ids = request.data.get('ids') or []
        try:
            percent = float(request.data.get('percent'))
        except (TypeError, ValueError):
            return Response({'error': 'درصد نامعتبر است.'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(ids, list) or not -90 <= percent <= 900:
            return Response({'error': 'ورودی نامعتبر است.'}, status=status.HTTP_400_BAD_REQUEST)

        factor = 1 + percent / 100
        with transaction.atomic():
            products = Product.objects.select_for_update().filter(pk__in=ids)
            for product in products:
                product.price = max(0, int(product.price * factor))
                product.save(update_fields=['price', 'updated_at'])
        return Response({'updated': len(ids)})


class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.select_related('parent').order_by('order', 'name')
    serializer_class = AdminCategorySerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None
    search_fields = ['name']

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if category.children.exists():
            return Response(
                {'error': 'ابتدا زیردسته‌ها را حذف یا جابه‌جا کنید.'},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)


class AdminBrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.order_by('name')
    serializer_class = AdminBrandSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None
    search_fields = ['name']


class AdminTagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.order_by('name')
    serializer_class = AdminTagSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None
    search_fields = ['name']


class AdminProductImageViewSet(viewsets.ModelViewSet):
    queryset = ProductImage.objects.select_related('product')
    serializer_class = AdminProductImageSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None
    filterset_fields = ['product']


class AdminProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.select_related('product')
    serializer_class = AdminProductVariantSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None
    filterset_fields = ['product']


@extend_schema(responses={200: inline_serializer('AdminCatalogStats', {
    'total': serializers.IntegerField(),
    'active': serializers.IntegerField(),
    'draft': serializers.IntegerField(),
    'archived': serializers.IntegerField(),
    'featured': serializers.IntegerField(),
    'stock_value': serializers.IntegerField(),
    'out_of_stock': serializers.IntegerField(),
    'low_stock': serializers.IntegerField(),
    'categories': serializers.IntegerField(),
    'brands': serializers.IntegerField(),
})})
@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_catalog_stats(request):
    aggregates = Product.objects.aggregate(
        total=Count('id'),
        active=Count('id', filter=Q(status='active')),
        draft=Count('id', filter=Q(status='draft')),
        archived=Count('id', filter=Q(status='archived')),
        featured=Count('id', filter=Q(is_featured=True)),
        stock_value=Sum('price'),
    )
    # همان تعریفی که فیلتر stock_state در لیست محصولات استفاده می‌کند.
    out_of_stock = Product.objects.filter(stock=0).exclude(variants__stock__gt=0).count()
    low_stock = Product.objects.filter(stock__gt=0, stock__lte=5).count()
    return Response({
        **{key: value or 0 for key, value in aggregates.items()},
        'out_of_stock': out_of_stock,
        'low_stock': low_stock,
        'categories': Category.objects.count(),
        'brands': Brand.objects.count(),
    })
