from django.db import models
from django.db.models import Q
import uuid


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'در انتظار'),
        ('success', 'موفق'),
        ('failed', 'ناموفق'),
        ('refunded', 'بازگشت داده شده'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='payment')
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    gateway = models.CharField(max_length=50, default='zarinpal')
    authority = models.CharField(max_length=200, blank=True)
    ref_id = models.CharField(max_length=100, blank=True)
    card_pan = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'پرداخت'
        verbose_name_plural = 'پرداخت‌ها'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=('authority',),
                condition=~Q(authority=''),
                name='unique_nonempty_payment_authority',
            ),
            models.UniqueConstraint(
                fields=('ref_id',),
                condition=~Q(ref_id=''),
                name='unique_nonempty_payment_ref_id',
            ),
        ]

    def __str__(self):
        return f"Payment {self.id} - {self.status}"
