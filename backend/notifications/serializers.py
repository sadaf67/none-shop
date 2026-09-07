from rest_framework import serializers

from config.validators import normalize_iran_mobile, to_english_digits

from .models import SmsLog


class PhoneField(serializers.CharField):
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        try:
            return normalize_iran_mobile(value)
        except Exception as exc:
            raise serializers.ValidationError('شماره موبایل باید به شکل ۰۹۱۲۳۴۵۶۷۸۹ باشد.') from exc


class OtpRequestSerializer(serializers.Serializer):
    phone = PhoneField(max_length=20)


class OtpVerifySerializer(serializers.Serializer):
    phone = PhoneField(max_length=20)
    code = serializers.CharField(max_length=10)

    def validate_code(self, value):
        digits = to_english_digits(value).strip()
        if not digits.isdigit() or len(digits) != 5:
            raise serializers.ValidationError('کد تأیید باید ۵ رقم باشد.')
        return digits


class SmsLogSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = SmsLog
        fields = '__all__'


class SmsSendSerializer(serializers.Serializer):
    phone = PhoneField(max_length=20)
    message = serializers.CharField(max_length=600)

    def validate_message(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('متن پیامک نمی‌تواند خالی باشد.')
        return value
