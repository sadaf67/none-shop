from django.db import transaction
from rest_framework import serializers

from products.models import Product, ProductVariant
from products.serializers import ProductListSerializer, ProductVariantSerializer

from .models import Cart, CartItem, Order, OrderItem


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)
    variant = ProductVariantSerializer(read_only=True)
    variant_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = (
            'id', 'product', 'product_id', 'variant', 'variant_id',
            'quantity', 'total_price',
        )

    def validate(self, attrs):
        try:
            product = Product.objects.prefetch_related('variants').get(
                pk=attrs['product_id'],
                status='active',
            )
        except Product.DoesNotExist as exc:
            raise serializers.ValidationError({'product_id': 'محصول یافت نشد.'}) from exc

        active_variants = product.variants.filter(is_active=True)
        variant_id = attrs.get('variant_id')
        variant = None

        if active_variants.exists():
            if not variant_id:
                raise serializers.ValidationError({'variant_id': 'انتخاب سایز کفش الزامی است.'})
            try:
                variant = active_variants.get(pk=variant_id)
            except ProductVariant.DoesNotExist as exc:
                raise serializers.ValidationError({'variant_id': 'سایز انتخاب‌شده معتبر نیست.'}) from exc
            available_stock = variant.stock
        else:
            if variant_id:
                raise serializers.ValidationError({'variant_id': 'این تنوع برای محصول انتخاب‌شده معتبر نیست.'})
            available_stock = product.stock

        quantity = attrs.get('quantity', 1)
        if quantity < 1:
            raise serializers.ValidationError({'quantity': 'تعداد باید حداقل یک باشد.'})
        if quantity > available_stock:
            raise serializers.ValidationError({'quantity': 'تعداد درخواستی بیشتر از موجودی است.'})

        attrs['_product'] = product
        attrs['_variant'] = variant
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        cart = validated_data.pop('cart')
        product = validated_data.pop('_product')
        variant = validated_data.pop('_variant')
        validated_data.pop('product_id', None)
        validated_data.pop('variant_id', None)
        quantity = validated_data.get('quantity', 1)

        available_stock = variant.stock if variant else product.stock
        item = CartItem.objects.select_for_update().filter(
            cart=cart,
            product=product,
            variant=variant,
        ).first()
        next_quantity = quantity + (item.quantity if item else 0)
        if next_quantity > available_stock:
            raise serializers.ValidationError({'quantity': 'مجموع تعداد سبد بیشتر از موجودی است.'})

        if item:
            item.quantity = next_quantity
            item.save(update_fields=['quantity'])
            return item

        return CartItem.objects.create(
            cart=cart,
            product=product,
            variant=variant,
            quantity=quantity,
        )


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.ReadOnlyField()
    items_count = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ('id', 'items', 'total', 'items_count')


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            'id', 'product_name', 'product_sku', 'variant_label', 'variant_sku',
            'product_image', 'unit_price', 'quantity', 'total_price',
        )


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'order_number', 'status', 'status_display',
            'receiver_name', 'receiver_phone', 'province', 'city',
            'street', 'postal_code', 'subtotal', 'discount_amount',
            'shipping_cost', 'total', 'coupon_code', 'notes',
            'tracking_code', 'items', 'created_at',
        )
        read_only_fields = (
            'id', 'order_number', 'status', 'subtotal', 'discount_amount',
            'total', 'tracking_code',
        )


class CreateOrderSerializer(serializers.Serializer):
    address_id = serializers.IntegerField()
    coupon_code = serializers.CharField(required=False, allow_blank=True, max_length=50)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
