import re

from django.core.exceptions import ValidationError


MAX_IMAGE_SIZE = 5 * 1024 * 1024
ALLOWED_IMAGE_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp'}

PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
DIGIT_TRANSLATION = str.maketrans(PERSIAN_DIGITS + ARABIC_DIGITS, '0123456789' * 2)

IRAN_MOBILE_RE = re.compile(r'^09\d{9}$')
POSTAL_CODE_RE = re.compile(r'^\d{10}$')


def validate_image_upload(upload):
    if upload.size > MAX_IMAGE_SIZE:
        raise ValidationError('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.')

    content_type = getattr(upload, 'content_type', None)
    if content_type and content_type.lower() not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValidationError('فقط تصویر JPEG، PNG یا WebP مجاز است.')


def to_english_digits(value: str) -> str:
    return str(value or '').translate(DIGIT_TRANSLATION)


def normalize_iran_mobile(value: str) -> str:
    """۰۹۱۲…، +989…، 00989… و 9… را به شکل یکتای 09xxxxxxxxx تبدیل می‌کند."""
    digits = re.sub(r'[\s\-()]', '', to_english_digits(value))
    if digits.startswith('+98'):
        digits = '0' + digits[3:]
    elif digits.startswith('0098'):
        digits = '0' + digits[4:]
    elif digits.startswith('98') and len(digits) == 12:
        digits = '0' + digits[2:]
    elif digits.startswith('9') and len(digits) == 10:
        digits = '0' + digits

    if not IRAN_MOBILE_RE.match(digits):
        raise ValidationError('شماره موبایل باید به شکل ۰۹۱۲۳۴۵۶۷۸۹ باشد.')
    return digits


def validate_iran_mobile(value: str) -> None:
    normalize_iran_mobile(value)


def normalize_postal_code(value: str) -> str:
    digits = re.sub(r'[\s\-]', '', to_english_digits(value))
    if not POSTAL_CODE_RE.match(digits):
        raise ValidationError('کد پستی باید دقیقاً ۱۰ رقم باشد.')
    return digits
