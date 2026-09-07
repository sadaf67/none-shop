from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from config.validators import validate_image_upload


class SiteSettings(models.Model):
    """تنظیمات سراسری فروشگاه — تک‌ردیفی و کاملاً قابل ویرایش از پنل مدیر."""

    PAYMENT_GATEWAYS = [
        ('zarinpal', 'زرین‌پال'),
        ('zibal', 'زیبال'),
        ('idpay', 'آیدی‌پی'),
        ('nextpay', 'نکست‌پی'),
    ]
    SMS_PROVIDERS = [
        ('kavenegar', 'کاوه‌نگار'),
        ('smsir', 'اس‌ام‌اس دات آی‌آر'),
        ('melipayamak', 'ملی پیامک'),
        ('console', 'فقط ثبت در لاگ (تست)'),
    ]

    singleton_id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)

    # هویت برند
    site_name = models.CharField(max_length=120, default='ن وان')
    site_name_en = models.CharField(max_length=120, default='N ONE')
    tagline = models.CharField(max_length=200, blank=True, default='فروشگاه اینترنتی ن وان')
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='branding/', blank=True, null=True, validators=[validate_image_upload])
    logo_light = models.ImageField(upload_to='branding/', blank=True, null=True, validators=[validate_image_upload])
    favicon = models.ImageField(upload_to='branding/', blank=True, null=True, validators=[validate_image_upload])
    og_image = models.ImageField(upload_to='branding/', blank=True, null=True, validators=[validate_image_upload])
    primary_color = models.CharField(max_length=9, blank=True, default='')

    # اطلاعات تماس
    phone = models.CharField(max_length=20, blank=True)
    phone_secondary = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    working_hours = models.CharField(max_length=200, blank=True)
    map_lat = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    map_lng = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)

    # شبکه‌های اجتماعی
    instagram = models.URLField(blank=True)
    telegram = models.URLField(blank=True)
    whatsapp = models.CharField(max_length=40, blank=True)
    twitter = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)
    aparat = models.URLField(blank=True)
    youtube = models.URLField(blank=True)

    # نمادهای اعتماد
    enamad_html = models.TextField(blank=True, help_text='کد HTML نماد اعتماد الکترونیکی')
    samandehi_html = models.TextField(blank=True, help_text='کد HTML نشان ساماندهی')
    business_license = models.CharField(max_length=100, blank=True)
    legal_owner = models.CharField(max_length=200, blank=True)

    # ارسال و مالی
    free_shipping_threshold = models.PositiveIntegerField(default=500000, validators=[MinValueValidator(0)])
    flat_shipping_cost = models.PositiveIntegerField(default=30000, validators=[MinValueValidator(0)])
    shipping_note = models.CharField(max_length=250, blank=True)
    tax_percent = models.PositiveSmallIntegerField(default=0, help_text='درصد مالیات بر ارزش افزوده')
    currency_label = models.CharField(max_length=20, default='تومان')

    # درگاه پرداخت
    payment_gateway = models.CharField(max_length=20, choices=PAYMENT_GATEWAYS, default='zarinpal')
    gateway_merchant_id = models.CharField(max_length=200, blank=True)
    gateway_sandbox = models.BooleanField(default=True)
    cod_enabled = models.BooleanField(default=False, verbose_name='پرداخت در محل فعال باشد')
    online_payment_enabled = models.BooleanField(default=True)

    # پنل پیامکی
    sms_enabled = models.BooleanField(default=False)
    sms_provider = models.CharField(max_length=20, choices=SMS_PROVIDERS, default='console')
    sms_api_key = models.CharField(max_length=300, blank=True)
    sms_username = models.CharField(max_length=150, blank=True)
    sms_password = models.CharField(max_length=150, blank=True)
    sms_sender = models.CharField(max_length=40, blank=True)
    sms_otp_template = models.CharField(max_length=100, blank=True, help_text='نام پترن/الگوی کد تأیید')
    sms_admin_phone = models.CharField(max_length=20, blank=True)
    sms_on_order_created = models.BooleanField(default=True)
    sms_on_order_paid = models.BooleanField(default=True)
    sms_on_order_shipped = models.BooleanField(default=True)
    sms_on_order_delivered = models.BooleanField(default=False)
    sms_notify_admin_on_order = models.BooleanField(default=True)
    otp_login_enabled = models.BooleanField(default=True)

    # سئو و فیدها
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=320, blank=True)
    meta_keywords = models.CharField(max_length=320, blank=True)
    google_analytics_id = models.CharField(max_length=60, blank=True)
    google_site_verification = models.CharField(max_length=120, blank=True)
    torob_feed_enabled = models.BooleanField(default=True)
    emalls_feed_enabled = models.BooleanField(default=True)
    google_feed_enabled = models.BooleanField(default=True)
    feed_default_guarantee = models.CharField(max_length=120, blank=True, default='گارانتی اصالت کالا')
    feed_shipping_days = models.PositiveSmallIntegerField(default=3)

    # نوار اعلان و حالت تعمیر
    announcement_enabled = models.BooleanField(default=True)
    announcement_text = models.CharField(max_length=250, blank=True)
    announcement_link = models.CharField(max_length=300, blank=True)
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'تنظیمات سایت'
        verbose_name_plural = 'تنظیمات سایت'

    def __str__(self):
        return self.site_name

    def save(self, *args, **kwargs):
        self.singleton_id = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('تنظیمات سایت قابل حذف نیست.')

    @classmethod
    def load(cls) -> 'SiteSettings':
        instance, _ = cls.objects.get_or_create(singleton_id=1)
        return instance


class Banner(models.Model):
    POSITIONS = [
        ('hero', 'اسلایدر اصلی'),
        ('strip', 'بنر نواری'),
        ('category', 'بنر دسته‌بندی'),
        ('sidebar', 'بنر کناری'),
        ('popup', 'پاپ‌آپ'),
    ]

    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True)
    badge = models.CharField(max_length=60, blank=True)
    image = models.ImageField(upload_to='banners/', validators=[validate_image_upload])
    mobile_image = models.ImageField(upload_to='banners/', blank=True, null=True, validators=[validate_image_upload])
    link = models.CharField(max_length=300, blank=True)
    button_text = models.CharField(max_length=60, blank=True)
    position = models.CharField(max_length=20, choices=POSITIONS, default='hero')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'بنر'
        verbose_name_plural = 'بنرها'
        ordering = ['position', 'order', '-created_at']

    def __str__(self):
        return f'{self.get_position_display()} — {self.title}'

    def clean(self):
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValidationError({'ends_at': 'زمان پایان باید بعد از زمان شروع باشد.'})

    @property
    def is_live(self) -> bool:
        now = timezone.now()
        if not self.is_active:
            return False
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        return True


class Page(models.Model):
    slug = models.SlugField(max_length=120, unique=True, allow_unicode=True)
    title = models.CharField(max_length=200)
    content = models.TextField(help_text='محتوای صفحه (HTML ساده)')
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=320, blank=True)
    show_in_footer = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'صفحه'
        verbose_name_plural = 'صفحه‌ها'
        ordering = ['order', 'title']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title, allow_unicode=True)
        super().save(*args, **kwargs)


class FAQ(models.Model):
    question = models.CharField(max_length=300)
    answer = models.TextField()
    group = models.CharField(max_length=100, blank=True, default='عمومی')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'پرسش متداول'
        verbose_name_plural = 'پرسش‌های متداول'
        ordering = ['group', 'order']

    def __str__(self):
        return self.question


class ContactMessage(models.Model):
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'پیام تماس'
        verbose_name_plural = 'پیام‌های تماس'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} — {self.subject or "بدون موضوع"}'


class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'عضو خبرنامه'
        verbose_name_plural = 'اعضای خبرنامه'
        ordering = ['-created_at']

    def __str__(self):
        return self.email
