from decimal import Decimal

from django.db import models, transaction
from django.db.models import F
import uuid


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'در انتظار پرداخت'),
        ('paid', 'پرداخت شده'),
        ('processing', 'در حال پردازش'),
        ('shipped', 'ارسال شده'),
        ('delivered', 'تحویل داده شده'),
        ('cancelled', 'لغو شده'),
        ('refunded', 'بازگشت وجه'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=20, unique=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    # Address snapshot
    receiver_name = models.CharField(max_length=150)
    receiver_phone = models.CharField(max_length=15)
    province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    street = models.TextField()
    postal_code = models.CharField(max_length=20)
    # Pricing
    subtotal = models.DecimalField(max_digits=12, decimal_places=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=0)
    # Discount
    coupon_code = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    tracking_code = models.CharField(max_length=100, blank=True)
    inventory_reserved = models.BooleanField(default=False)
    inventory_released = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'سفارش'
        verbose_name_plural = 'سفارش‌ها'
        ordering = ['-created_at']

    def __str__(self):
        return f"سفارش {self.order_number}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            import random, string
            self.order_number = ''.join(random.choices(string.digits, k=10))
        super().save(*args, **kwargs)

    @transaction.atomic
    def release_inventory(self):
        locked_order = Order.objects.select_for_update().get(pk=self.pk)
        if not locked_order.inventory_reserved or locked_order.inventory_released:
            return False

        for item in locked_order.items.select_related('product', 'variant'):
            if item.variant_id:
                item.variant.__class__.objects.filter(pk=item.variant_id).update(stock=F('stock') + item.quantity)
            elif item.product_id:
                item.product.__class__.objects.filter(pk=item.product_id).update(stock=F('stock') + item.quantity)

        from discounts.models import Coupon, CouponUsage
        usages = CouponUsage.objects.filter(order=locked_order)
        for usage in usages.select_related('coupon'):
            Coupon.objects.filter(pk=usage.coupon_id, used_count__gt=0).update(used_count=F('used_count') - 1)
        usages.delete()

        locked_order.inventory_released = True
        locked_order.save(update_fields=['inventory_released', 'updated_at'])
        self.inventory_released = True
        return True


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.SET_NULL, null=True)
    product_name = models.CharField(max_length=300)  # snapshot
    product_sku = models.CharField(max_length=100)
    variant = models.ForeignKey('products.ProductVariant', on_delete=models.SET_NULL, null=True, blank=True)
    variant_label = models.CharField(max_length=120, blank=True)
    variant_sku = models.CharField(max_length=100, blank=True)
    product_image = models.CharField(max_length=500, blank=True)
    unit_price = models.DecimalField(max_digits=12, decimal_places=0)
    quantity = models.PositiveIntegerField(default=1)
    total_price = models.DecimalField(max_digits=12, decimal_places=0)

    class Meta:
        verbose_name = 'آیتم سفارش'
        verbose_name_plural = 'آیتم‌های سفارش'
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gt=0), name='order_item_quantity_positive'),
            models.CheckConstraint(condition=models.Q(unit_price__gte=0), name='order_item_unit_price_nonnegative'),
            models.CheckConstraint(condition=models.Q(total_price__gte=0), name='order_item_total_price_nonnegative'),
        ]

    def save(self, *args, **kwargs):
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"


class Cart(models.Model):
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='cart', null=True, blank=True)
    session_key = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'سبد خرید'
        verbose_name_plural = 'سبدهای خرید'
        constraints = [
            models.UniqueConstraint(
                fields=('session_key',),
                condition=models.Q(user__isnull=True) & ~models.Q(session_key=''),
                name='unique_nonempty_guest_cart_session',
            ),
        ]

    def __str__(self):
        return f"Cart - {self.user or self.session_key}"

    @property
    def total(self) -> Decimal:
        return sum(item.total_price for item in self.items.all())

    @property
    def items_count(self) -> int:
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    variant = models.ForeignKey('products.ProductVariant', on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'آیتم سبد'
        verbose_name_plural = 'آیتم‌های سبد'
        constraints = [
            models.UniqueConstraint(fields=('cart', 'product', 'variant'), name='unique_cart_product_variant'),
            models.UniqueConstraint(fields=('cart', 'product'), condition=models.Q(variant__isnull=True), name='unique_cart_product_without_variant'),
            models.CheckConstraint(condition=models.Q(quantity__gt=0), name='cart_item_quantity_positive'),
        ]

    @property
    def total_price(self) -> Decimal:
        return self.product.price * self.quantity
