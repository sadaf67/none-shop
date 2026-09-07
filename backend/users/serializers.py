from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from config.validators import normalize_iran_mobile, normalize_postal_code
from .models import User, Address


def clean_mobile(value: str, *, required: bool = True) -> str:
    if not value:
        if required:
            raise serializers.ValidationError('شماره موبایل الزامی است.')
        return value
    try:
        return normalize_iran_mobile(value)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.messages[0]) from exc


def clean_postal_code(value: str) -> str:
    try:
        return normalize_postal_code(value)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.messages[0]) from exc


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=10)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'phone', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'رمزهای عبور مطابقت ندارند'})
        candidate = User(
            username=attrs.get('username', ''),
            email=attrs.get('email', ''),
            first_name=attrs.get('first_name', ''),
            last_name=attrs.get('last_name', ''),
        )
        validate_password(attrs['password'], user=candidate)
        return attrs

    def validate_phone(self, value):
        return clean_mobile(value, required=False)

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(**attrs)
        if not user:
            raise serializers.ValidationError('نام کاربری یا رمز عبور اشتباه است')
        if not user.is_active:
            raise serializers.ValidationError('حساب کاربری غیرفعال است')
        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'phone',
                  'avatar', 'address', 'city', 'postal_code', 'is_verified',
                  'full_name', 'date_joined', 'is_staff', 'is_superuser')
        read_only_fields = ('id', 'is_verified', 'date_joined', 'is_staff', 'is_superuser')

    def validate_phone(self, value):
        return clean_mobile(value, required=False)

    def validate_postal_code(self, value):
        if not value:
            return value
        return clean_postal_code(value)


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = '__all__'
        read_only_fields = ('user',)

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        if validated_data.get('is_default'):
            Address.objects.filter(user=validated_data['user'], is_default=True).update(is_default=False)
        return super().create(validated_data)

    def validate_phone(self, value):
        return clean_mobile(value)

    def validate_postal_code(self, value):
        return clean_postal_code(value)

    def update(self, instance, validated_data):
        if validated_data.get('is_default'):
            Address.objects.filter(user=instance.user, is_default=True).update(is_default=False)
        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=10)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({'new_password': 'رمزهای عبور مطابقت ندارند'})
        user = self.context.get('request').user if self.context.get('request') else None
        validate_password(attrs['new_password'], user=user)
        return attrs
