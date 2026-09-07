from django.db import transaction
from django.utils.text import slugify
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import (
    Brand,
    Category,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductImage,
    ProductVariant,
    Tag,
)
from .serializers import ProductImageSerializer, ProductVariantSerializer


class AdminCategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source='parent.name', read_only=True)

    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'parent', 'parent_name', 'image', 'description',
                  'is_active', 'order', 'products_count', 'created_at')
        read_only_fields = ('created_at',)
        extra_kwargs = {'slug': {'required': False, 'allow_blank': True}}

    def get_products_count(self, obj) -> int:
        return obj.products.count()

    def validate(self, attrs):
        parent = attrs.get('parent')
        if parent and self.instance:
            node = parent
            while node is not None:
                if node.pk == self.instance.pk:
                    raise serializers.ValidationError({'parent': 'دسته‌بندی نمی‌تواند زیرمجموعه خودش باشد.'})
                node = node.parent
        return attrs


class AdminBrandSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ('id', 'name', 'slug', 'logo', 'description', 'is_active', 'products_count')
        extra_kwargs = {'slug': {'required': False, 'allow_blank': True}}

    def get_products_count(self, obj) -> int:
        return obj.products.count()


class AdminTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'name', 'slug')
        extra_kwargs = {'slug': {'required': False, 'allow_blank': True}}


class AdminProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('id', 'product', 'image', 'alt_text', 'is_main', 'order')


class AdminProductVariantSerializer(serializers.ModelSerializer):
    label = serializers.ReadOnlyField()

    class Meta:
        model = ProductVariant
        fields = ('id', 'product', 'size', 'color', 'sku', 'stock', 'is_active', 'order', 'label')
        extra_kwargs = {'sku': {'required': False, 'allow_blank': True}}

    def validate(self, attrs):
        product = attrs.get('product', getattr(self.instance, 'product', None))
        size = attrs.get('size', getattr(self.instance, 'size', ''))
        color = attrs.get('color', getattr(self.instance, 'color', ''))
        duplicates = ProductVariant.objects.filter(product=product, size=size, color=color)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError({'size': 'این ترکیب سایز و رنگ قبلاً ثبت شده است.'})
        return attrs

    def create(self, validated_data):
        if not validated_data.get('sku'):
            validated_data['sku'] = _unique_variant_sku(validated_data['product'])
        return super().create(validated_data)


class AttributePairSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    value = serializers.CharField(max_length=300)


class AdminProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    attribute_pairs = AttributePairSerializer(many=True, required=False, write_only=True)
    attributes_list = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    discount_percent = serializers.ReadOnlyField()
    available_stock = serializers.ReadOnlyField()
    main_image = ProductImageSerializer(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'slug', 'sku', 'category', 'category_name', 'brand', 'brand_name',
            'tags', 'short_description', 'description', 'price', 'compare_price', 'cost_price',
            'stock', 'weight', 'status', 'is_featured', 'is_digital', 'guarantee', 'barcode',
            'video_url', 'meta_title', 'meta_description', 'include_in_feeds', 'display_order',
            'views_count', 'sold_count', 'created_at', 'updated_at',
            'images', 'main_image', 'variants', 'attribute_pairs', 'attributes_list',
            'discount_percent', 'available_stock',
        )
        read_only_fields = ('views_count', 'sold_count', 'created_at', 'updated_at')
        extra_kwargs = {
            'slug': {'required': False, 'allow_blank': True},
            'sku': {'required': False, 'allow_blank': True},
        }

    @extend_schema_field(serializers.ListSerializer(child=serializers.DictField()))
    def get_attributes_list(self, obj):
        return [
            {'id': item.id, 'name': item.attribute.name, 'value': item.value}
            for item in obj.attributes.select_related('attribute')
        ]

    def validate(self, attrs):
        price = attrs.get('price', getattr(self.instance, 'price', None))
        compare_price = attrs.get('compare_price', getattr(self.instance, 'compare_price', None))
        if price is not None and compare_price and compare_price <= price:
            raise serializers.ValidationError({
                'compare_price': 'قیمت قبل از تخفیف باید بیشتر از قیمت فروش باشد.',
            })
        return attrs

    def validate_slug(self, value):
        value = (value or '').strip()
        if not value:
            return value
        duplicates = Product.objects.filter(slug=value)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError('این نامک قبلاً استفاده شده است.')
        return value

    @transaction.atomic
    def create(self, validated_data):
        pairs = validated_data.pop('attribute_pairs', None)
        tags = validated_data.pop('tags', None)
        validated_data['slug'] = _unique_product_slug(validated_data.get('slug'), validated_data['name'])
        product = super().create(validated_data)
        if tags is not None:
            product.tags.set(tags)
        if pairs is not None:
            _sync_attributes(product, pairs)
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        pairs = validated_data.pop('attribute_pairs', None)
        if 'slug' in validated_data:
            validated_data['slug'] = _unique_product_slug(
                validated_data.get('slug'),
                validated_data.get('name', instance.name),
                exclude_pk=instance.pk,
            )
        product = super().update(instance, validated_data)
        if pairs is not None:
            _sync_attributes(product, pairs)
        return product


def _sync_attributes(product, pairs):
    product.attributes.all().delete()
    for pair in pairs:
        name = pair['name'].strip()
        value = pair['value'].strip()
        if not name or not value:
            continue
        attribute, _ = ProductAttribute.objects.get_or_create(name=name, category=product.category)
        ProductAttributeValue.objects.update_or_create(
            product=product, attribute=attribute, defaults={'value': value},
        )


def _unique_product_slug(slug, name, exclude_pk=None):
    base = (slug or '').strip() or slugify(name, allow_unicode=True) or 'product'
    candidate = base
    counter = 1
    while True:
        query = Product.objects.filter(slug=candidate)
        if exclude_pk:
            query = query.exclude(pk=exclude_pk)
        if not query.exists():
            return candidate
        counter += 1
        candidate = f'{base}-{counter}'


def _unique_variant_sku(product):
    base = f'{product.sku or "VAR"}-{product.variants.count() + 1}'
    candidate = base
    counter = 1
    while ProductVariant.objects.filter(sku=candidate).exists():
        counter += 1
        candidate = f'{base}-{counter}'
    return candidate
