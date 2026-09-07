from django.contrib import admin
from .models import Order, OrderItem, Cart, CartItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = (
        'product_name', 'product_sku', 'variant_label', 'variant_sku',
        'unit_price', 'quantity', 'total_price',
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'user', 'status', 'total', 'created_at')
    list_filter = ('status',)
    search_fields = ('order_number', 'user__email', 'receiver_name')
    inlines = [OrderItemInline]
    readonly_fields = (
        'order_number', 'subtotal', 'discount_amount', 'shipping_cost', 'total',
        'inventory_reserved', 'inventory_released', 'created_at', 'updated_at',
    )
