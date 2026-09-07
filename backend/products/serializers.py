from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Category, Brand, Tag, Product, ProductImage, ProductAttributeValue, ProductVariant, Wishlist


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'parent', 'image', 'description',
                  'is_active', 'order', 'children', 'products_count')

    # ارجاع به خودِ سریالایزر است؛ برای اسکیما به‌صورت صریح اعلام می‌شود.
    @extend_schema_field(serializers.ListSerializer(child=serializers.DictField()))
    def get_children(self, obj):
        if obj.children.exists():
            # context باید منتقل شود تا نقشهٔ شمارش دوباره ساخته نشود.
            return CategorySerializer(
                obj.children.filter(is_active=True), many=True, context=self.context
            ).data
        return []

    def get_products_count(self, obj) -> int:
        # شمارش شاخه‌ای است نه مستقیم: محصولات به برگ‌ها وصل‌اند، پس دستهٔ ریشه
        # وگرنه همیشه صفر نشان داده می‌شد.
        counts = self.context.get('_subtree_counts')
        if counts is None:
            counts = Category.subtree_product_counts()
            self.context['_subtree_counts'] = counts
        return counts.get(obj.pk, 0)


class BrandSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ('id', 'name', 'slug', 'logo', 'description', 'products_count')

    def get_products_count(self, obj) -> int:
        return obj.products.filter(status='active').count()


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'name', 'slug')


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('id', 'image', 'alt_text', 'is_main', 'order')


class ProductAttributeValueSerializer(serializers.ModelSerializer):
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)

    class Meta:
        model = ProductAttributeValue
        fields = ('id', 'attribute_name', 'value')


class ProductVariantSerializer(serializers.ModelSerializer):
    label = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()

    class Meta:
        model = ProductVariant
        fields = ('id', 'size', 'color', 'sku', 'stock', 'is_active', 'order', 'label', 'is_in_stock')


class ProductListSerializer(serializers.ModelSerializer):
    main_image = ProductImageSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    discount_percent = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    reviews_count = serializers.ReadOnlyField()
    stock = serializers.IntegerField(source='available_stock', read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'name', 'slug', 'sku', 'category_name', 'brand_name',
                  'price', 'compare_price', 'discount_percent', 'stock',
                  'is_in_stock', 'main_image', 'is_featured', 'average_rating',
                  'reviews_count', 'sold_count', 'created_at')


class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    attributes = ProductAttributeValueSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    discount_percent = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    reviews_count = serializers.ReadOnlyField()
    variants = serializers.SerializerMethodField()
    stock = serializers.IntegerField(source='available_stock', read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'name', 'slug', 'sku', 'category', 'brand', 'tags',
                  'short_description', 'description', 'price', 'compare_price',
                  'discount_percent', 'stock', 'is_in_stock', 'weight',
                  'images', 'attributes', 'variants', 'is_featured', 'is_digital',
                  'average_rating', 'reviews_count', 'views_count', 'sold_count',
                  'created_at', 'updated_at')

    @extend_schema_field(ProductVariantSerializer(many=True))
    def get_variants(self, obj):
        active_variants = [variant for variant in obj.variants.all() if variant.is_active]
        return ProductVariantSerializer(active_variants, many=True).data


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Wishlist
        fields = ('id', 'product', 'product_id', 'added_at')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
