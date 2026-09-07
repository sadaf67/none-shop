from datetime import timedelta

from django.db import models
from django.utils import timezone


class SmsLog(models.Model):
    STATUS_CHOICES = [
        ('sent', 'ارسال شد'),
        ('failed', 'ناموفق'),
        ('skipped', 'ارسال نشد (غیرفعال)'),
    ]
    KIND_CHOICES = [
        ('otp', 'کد تأیید'),
        ('order', 'اطلاع‌رسانی سفارش'),
        ('admin', 'اطلاع به مدیر'),
        ('test', 'تست'),
        ('manual', 'ارسال دستی'),
    ]

    phone = models.CharField(max_length=20, db_index=True)
    message = models.TextField()
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='manual')
    provider = models.CharField(max_length=30, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    provider_message_id = models.CharField(max_length=120, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'گزارش پیامک'
        verbose_name_plural = 'گزارش‌های پیامک'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.phone} — {self.get_status_display()}'


class OtpCode(models.Model):
    PURPOSE_CHOICES = [
        ('login', 'ورود / ثبت‌نام'),
        ('verify', 'تأیید شماره'),
    ]

    MAX_ATTEMPTS = 5
    TTL_SECONDS = 120
    RESEND_COOLDOWN_SECONDS = 60

    phone = models.CharField(max_length=20, db_index=True)
    code_hash = models.CharField(max_length=128)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default='login')
    attempts = models.PositiveSmallIntegerField(default=0)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'کد یکبارمصرف'
        verbose_name_plural = 'کدهای یکبارمصرف'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['phone', 'purpose', 'is_used'])]

    def __str__(self):
        return f'{self.phone} — {self.purpose}'

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @property
    def can_resend_at(self):
        return self.created_at + timedelta(seconds=self.RESEND_COOLDOWN_SECONDS)
