from rest_framework import serializers

from .models import Banner, ContactMessage, FAQ, NewsletterSubscriber, Page, SiteSettings
from .sanitizers import (
    MAX_LENGTH as BADGE_MAX_LENGTH,
    MAX_RICH_LENGTH,
    sanitize_badge_html,
    sanitize_rich_html,
)


def clean_rich_html(value, field_label='محتوا'):
    """محتوای HTML واردشده از پنل مدیر پیش از ذخیره امن‌سازی می‌شود."""
    value = (value or '').strip()
    if not value:
        return ''
    if len(value) > MAX_RICH_LENGTH:
        raise serializers.ValidationError(f'{field_label} بیش از حد طولانی است.')
    return sanitize_rich_html(value)


# فیلدهایی که هرگز نباید به کاربر عمومی برسند.
SECRET_SETTINGS_FIELDS = (
    'gateway_merchant_id',
    'sms_api_key',
    'sms_username',
    'sms_password',
    'sms_admin_phone',
)


class PublicSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        exclude = SECRET_SETTINGS_FIELDS + ('singleton_id',)
        read_only_fields = [field.name for field in SiteSettings._meta.fields]


class AdminSettingsSerializer(serializers.ModelSerializer):
    """نسخه ادمین — همه فیلدها قابل ویرایش، اما رمزها فقط write-only هستند."""

    sms_api_key = serializers.CharField(required=False, allow_blank=True, style={'input_type': 'password'})
    sms_password = serializers.CharField(required=False, allow_blank=True, style={'input_type': 'password'})
    has_sms_api_key = serializers.SerializerMethodField()
    has_gateway_merchant_id = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        exclude = ('singleton_id',)

    def get_has_sms_api_key(self, obj) -> bool:
        return bool(obj.sms_api_key)

    def get_has_gateway_merchant_id(self, obj) -> bool:
        return bool(obj.gateway_merchant_id)

    def validate_primary_color(self, value):
        value = value.strip()
        if value and not (value.startswith('#') and len(value) in (4, 7, 9)):
            raise serializers.ValidationError('رنگ باید به فرمت هگز مانند #ff6b3d باشد.')
        return value

    @staticmethod
    def _clean_badge(value):
        """کد نماد پیش از ذخیره به تگ‌های امن محدود می‌شود (این HTML به همه بازدیدکنندگان می‌رسد)."""
        value = (value or '').strip()
        if not value:
            return ''
        if len(value) > BADGE_MAX_LENGTH:
            raise serializers.ValidationError(f'کد نماد نباید بیش از {BADGE_MAX_LENGTH} نویسه باشد.')
        cleaned = sanitize_badge_html(value)
        if not cleaned:
            raise serializers.ValidationError(
                'کد نماد معتبر نیست. فقط کد رسمی نماد (شامل تگ‌های <a> و <img>) را وارد کنید.'
            )
        return cleaned

    def validate_enamad_html(self, value):
        return self._clean_badge(value)

    def validate_samandehi_html(self, value):
        return self._clean_badge(value)

    def validate(self, attrs):
        gateway = attrs.get('payment_gateway', getattr(self.instance, 'payment_gateway', 'zarinpal'))
        merchant = attrs.get('gateway_merchant_id', getattr(self.instance, 'gateway_merchant_id', ''))
        online = attrs.get('online_payment_enabled', getattr(self.instance, 'online_payment_enabled', True))
        if online and gateway == 'zarinpal' and merchant and len(merchant.strip()) != 36:
            raise serializers.ValidationError({'gateway_merchant_id': 'مرچنت‌کد زرین‌پال باید ۳۶ کاراکتر باشد.'})

        sms_enabled = attrs.get('sms_enabled', getattr(self.instance, 'sms_enabled', False))
        provider = attrs.get('sms_provider', getattr(self.instance, 'sms_provider', 'console'))
        api_key = attrs.get('sms_api_key', getattr(self.instance, 'sms_api_key', ''))
        username = attrs.get('sms_username', getattr(self.instance, 'sms_username', ''))
        if sms_enabled and provider != 'console':
            if provider in {'kavenegar', 'smsir'} and not api_key.strip():
                raise serializers.ValidationError({'sms_api_key': 'برای این سرویس‌دهنده کلید API الزامی است.'})
            if provider == 'melipayamak' and not username.strip():
                raise serializers.ValidationError({'sms_username': 'برای ملی پیامک نام کاربری الزامی است.'})
        return attrs

    def update(self, instance, validated_data):
        # رشته خالی برای فیلدهای محرمانه یعنی «تغییر نده»، نه «پاک کن».
        for field in ('sms_api_key', 'sms_password'):
            if field in validated_data and validated_data[field] == '':
                validated_data.pop(field)
        return super().update(instance, validated_data)


class BannerSerializer(serializers.ModelSerializer):
    # پنل مدیر باید ببیند بنر با توجه به بازه زمانی، همین حالا نمایش داده می‌شود یا نه.
    is_live = serializers.ReadOnlyField()

    class Meta:
        model = Banner
        fields = '__all__'

    def validate(self, attrs):
        starts_at = attrs.get('starts_at', getattr(self.instance, 'starts_at', None))
        ends_at = attrs.get('ends_at', getattr(self.instance, 'ends_at', None))
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError({'ends_at': 'زمان پایان باید بعد از زمان شروع باشد.'})
        return attrs


class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = '__all__'

    def validate_content(self, value):
        return clean_rich_html(value, 'محتوای صفحه')


class PageSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ('slug', 'title', 'order')


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = '__all__'

    def validate_answer(self, value):
        return clean_rich_html(value, 'پاسخ')


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ('id', 'name', 'phone', 'email', 'subject', 'message', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate_phone(self, value):
        from config.validators import normalize_iran_mobile

        return normalize_iran_mobile(value)

    def validate_message(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError('متن پیام باید حداقل ۱۰ کاراکتر باشد.')
        return value


class AdminContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'
        read_only_fields = ('name', 'phone', 'email', 'subject', 'message', 'created_at')


class NewsletterSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ('email',)

    def create(self, validated_data):
        subscriber, _ = NewsletterSubscriber.objects.update_or_create(
            email=validated_data['email'].lower(),
            defaults={'is_active': True},
        )
        return subscriber
