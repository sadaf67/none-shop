from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator


class Coupon(models.Model):
    DISCOUNT_TYPE = [
        ('percent', 'درصدی'),
        ('fixed', 'مبلغ ثابت'),
    ]

    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE, default='percent')
    value = models.DecimalField(max_digits=10, decimal_places=0, validators=[MinValueValidator(0)])
    max_discount = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True, validators=[MinValueValidator(0)], help_text='سقف تخفیف برای نوع درصدی')
    min_order_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, validators=[MinValueValidator(0)])
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    per_user_limit = models.PositiveIntegerField(default=1)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    categories = models.ManyToManyField('products.Category', blank=True)
    products = models.ManyToManyField('products.Product', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'کوپن'
        verbose_name_plural = 'کوپن‌ها'
        constraints = [
            models.CheckConstraint(condition=models.Q(value__gte=0), name='coupon_value_nonnegative'),
            models.CheckConstraint(
                condition=models.Q(discount_type='fixed') | models.Q(value__lte=100),
                name='percent_coupon_at_most_100',
            ),
            models.CheckConstraint(condition=models.Q(min_order_amount__gte=0), name='coupon_min_order_nonnegative'),
        ]

    def __str__(self):
        return self.code

    def clean(self):
        errors = {}
        if self.discount_type == 'percent' and self.value > 100:
            errors['value'] = 'درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.'
        if self.valid_from and self.valid_until and self.valid_until <= self.valid_from:
            errors['valid_until'] = 'زمان پایان باید بعد از زمان شروع باشد.'
        if errors:
            raise ValidationError(errors)

    @property
    def is_valid(self) -> bool:
        now = timezone.now()
        if not self.is_active:
            return False
        if now < self.valid_from or now > self.valid_until:
            return False
        if self.usage_limit and self.used_count >= self.usage_limit:
            return False
        return True

    def calculate_discount(self, amount):
        if self.discount_type == 'percent':
            discount = amount * self.value / 100
            if self.max_discount:
                discount = min(discount, self.max_discount)
        else:
            discount = self.value
        return min(discount, amount)


class CouponUsage(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE)
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('coupon', 'order')
