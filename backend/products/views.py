from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, serializers, viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction
from django.db.models import F
from .models import Category, Brand, Tag, Product, Wishlist
from .serializers import (CategorySerializer, BrandSerializer, TagSerializer,
                          ProductListSerializer, ProductDetailSerializer, WishlistSerializer)
from .filters import ProductFilter


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Return only root categories (with children nested)
        return Category.objects.filter(is_active=True, parent=None).prefetch_related('children')


class BrandListView(generics.ListAPIView):
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'sku', 'brand__name', 'tags__name']
    ordering_fields = ['price', 'created_at', 'sold_count', 'views_count']
    ordering = ['-created_at']
    lookup_field = 'slug'

    def get_queryset(self):
        return Product.objects.filter(status='active').select_related(
            'category', 'brand'
        ).prefetch_related('images', 'tags', 'attributes', 'reviews', 'variants').distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        Product.objects.filter(pk=instance.pk).update(views_count=F('views_count') + 1)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        qs = self.get_queryset().filter(is_featured=True)[:8]
        serializer = ProductListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def new_arrivals(self, request):
        qs = self.get_queryset().order_by('-created_at')[:8]
        serializer = ProductListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def best_sellers(self, request):
        qs = self.get_queryset().order_by('-sold_count')[:8]
        serializer = ProductListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def on_sale(self, request):
        qs = self.get_queryset().filter(compare_price__isnull=False).order_by('-created_at')[:12]
        serializer = ProductListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def related(self, request, slug=None):
        product = self.get_object()
        qs = self.get_queryset().filter(
            category=product.category
        ).exclude(pk=product.pk)[:6]
        serializer = ProductListSerializer(qs, many=True)
        return Response(serializer.data)


@extend_schema(
    request=inline_serializer('ReorderCategories', {
        'ids': serializers.ListField(child=serializers.IntegerField()),
    }),
    responses={200: inline_serializer('ReorderResult', {'message': serializers.CharField()})},
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reorder_categories(request):
    """
    body: { "ids": [3, 1, 5, 2, ...] }
    ترتیب آرایه = اولویت نمایش
    """
    if not request.user.is_staff:
        return Response({'error': 'دسترسی ندارید'}, status=403)
    ids = request.data.get('ids', [])
    if not isinstance(ids, list):
        return Response({'error': 'ids باید آرایه باشد'}, status=400)
    with transaction.atomic():
        for idx, cat_id in enumerate(ids):
            Category.objects.filter(pk=cat_id).update(order=idx)
    return Response({'message': 'ترتیب دسته‌بندی‌ها ذخیره شد'})


@extend_schema(
    request=inline_serializer('ReorderProducts', {
        'ids': serializers.ListField(child=serializers.UUIDField()),
    }),
    responses={200: inline_serializer('ReorderProductsResult', {'message': serializers.CharField()})},
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reorder_products(request):
    """
    body: { "ids": ["uuid1", "uuid2", ...] }
    ترتیب آرایه = display_order
    """
    if not request.user.is_staff:
        return Response({'error': 'دسترسی ندارید'}, status=403)
    ids = request.data.get('ids', [])
    if not isinstance(ids, list):
        return Response({'error': 'ids باید آرایه باشد'}, status=400)
    with transaction.atomic():
        for idx, prod_id in enumerate(ids):
            Product.objects.filter(pk=prod_id).update(display_order=idx)
    return Response({'message': 'ترتیب محصولات ذخیره شد'})


@extend_schema(responses={200: ProductListSerializer(many=True)})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_product_list(request):
    """لیست همه محصولات برای ادمین (با display_order)"""
    if not request.user.is_staff:
        return Response({'error': 'دسترسی ندارید'}, status=403)
    qs = Product.objects.select_related('category', 'brand').prefetch_related('images', 'variants').order_by('display_order', '-created_at')
    data = ProductListSerializer(qs, many=True).data
    return Response(data)


@extend_schema(responses={200: CategorySerializer(many=True)})
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_category_list(request):
    """لیست همه دسته‌بندی‌ها برای ادمین (با order)"""
    if not request.user.is_staff:
        return Response({'error': 'دسترسی ندارید'}, status=403)
    qs = Category.objects.order_by('order', 'name')
    data = CategorySerializer(qs, many=True).data
    return Response(data)


class WishlistView(generics.ListCreateAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    # فقط برای تشخیص مدل توسط تولیدکنندهٔ اسکیما؛ در زمان اجرا get_queryset حاکم است.
    queryset = Wishlist.objects.none()

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related(
            'product', 'product__category', 'product__brand'
        ).prefetch_related('product__images', 'product__variants', 'product__reviews')


class WishlistDetailView(generics.DestroyAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Wishlist.objects.none()

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)
