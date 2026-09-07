import logging
import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from core.models import SiteSettings

from .models import OtpCode, SmsLog
from .providers import SmsSendError, get_provider

logger = logging.getLogger('notifications')


def send_sms(phone: str, message: str, *, kind: str = 'manual', template: str = '', tokens=None) -> SmsLog:
    """ارسال پیامک و ثبت گزارش. هرگز استثنا به بیرون نمی‌دهد تا جریان سفارش قطع نشود."""
    config = SiteSettings.load()
    if not config.sms_enabled:
        return SmsLog.objects.create(
            phone=phone, message=message, kind=kind,
            provider=config.sms_provider, status='skipped',
            error='پنل پیامکی غیرفعال است.',
        )

    provider = get_provider(config)
    try:
        message_id = provider.send(phone, message, template=template, tokens=tokens)
    except SmsSendError as exc:
        logger.warning('SMS to %s failed: %s', phone, exc)
        return SmsLog.objects.create(
            phone=phone, message=message, kind=kind,
            provider=provider.name, status='failed', error=str(exc),
        )
    except Exception as exc:  # درایور شخص ثالث ممکن است هر خطایی بدهد
        logger.exception('Unexpected SMS failure for %s', phone)
        return SmsLog.objects.create(
            phone=phone, message=message, kind=kind,
            provider=provider.name, status='failed', error=repr(exc),
        )

    return SmsLog.objects.create(
        phone=phone, message=message, kind=kind,
        provider=provider.name, status='sent', provider_message_id=message_id or '',
    )


# ─────────────────────────── کد یکبارمصرف ───────────────────────────

def create_otp(phone: str, purpose: str = 'login') -> tuple[OtpCode | None, str | None]:
    """کد جدید می‌سازد و ارسال می‌کند. اگر هنوز در فاصله ارسال مجدد باشیم، خطا برمی‌گرداند."""
    now = timezone.now()
    last = OtpCode.objects.filter(phone=phone, purpose=purpose).order_by('-created_at').first()
    if last and not last.is_used and now < last.can_resend_at:
        remaining = int((last.can_resend_at - now).total_seconds())
        return None, f'برای ارسال مجدد {remaining} ثانیه صبر کنید.'

    OtpCode.objects.filter(phone=phone, purpose=purpose, is_used=False).update(is_used=True)

    code = f'{secrets.randbelow(100000):05d}'
    otp = OtpCode.objects.create(
        phone=phone,
        code_hash=make_password(code),
        purpose=purpose,
        expires_at=now + timedelta(seconds=OtpCode.TTL_SECONDS),
    )

    config = SiteSettings.load()
    site_name = config.site_name
    send_sms(
        phone,
        f'کد ورود شما به {site_name}: {code}\nاین کد تا ۲ دقیقه معتبر است.',
        kind='otp',
        template=config.sms_otp_template,
        tokens=[code],
    )
    return otp, None


def verify_otp(phone: str, code: str, purpose: str = 'login') -> tuple[bool, str | None]:
    otp = OtpCode.objects.filter(phone=phone, purpose=purpose, is_used=False).order_by('-created_at').first()
    if not otp:
        return False, 'ابتدا درخواست کد تأیید بدهید.'
    if otp.is_expired:
        otp.is_used = True
        otp.save(update_fields=['is_used'])
        return False, 'کد تأیید منقضی شده است؛ دوباره درخواست بدهید.'
    if otp.attempts >= OtpCode.MAX_ATTEMPTS:
        otp.is_used = True
        otp.save(update_fields=['is_used'])
        return False, 'تعداد تلاش‌های مجاز تمام شد؛ کد جدید بگیرید.'

    if not check_password(code, otp.code_hash):
        otp.attempts += 1
        otp.save(update_fields=['attempts'])
        return False, 'کد تأیید نادرست است.'

    otp.is_used = True
    otp.save(update_fields=['is_used'])
    return True, None


# ─────────────────────────── اطلاع‌رسانی سفارش ───────────────────────────

ORDER_MESSAGES = {
    'created': 'سفارش {number} در {site} ثبت شد. مبلغ: {total} {currency}',
    'paid': 'پرداخت سفارش {number} با موفقیت انجام شد. از خرید شما در {site} سپاسگزاریم.',
    'shipped': 'سفارش {number} ارسال شد. کد رهگیری: {tracking}',
    'delivered': 'سفارش {number} تحویل داده شد. خوشحال می‌شویم نظرتان را در {site} ثبت کنید.',
}

ORDER_TOGGLES = {
    'created': 'sms_on_order_created',
    'paid': 'sms_on_order_paid',
    'shipped': 'sms_on_order_shipped',
    'delivered': 'sms_on_order_delivered',
}


def notify_order(order, event: str) -> None:
    config = SiteSettings.load()
    if not config.sms_enabled or not getattr(config, ORDER_TOGGLES.get(event, ''), False):
        return

    phone = (order.receiver_phone or '').strip()
    if phone:
        message = ORDER_MESSAGES[event].format(
            number=order.order_number,
            site=config.site_name,
            total=f'{int(order.total):,}',
            currency=config.currency_label,
            tracking=order.tracking_code or '—',
        )
        send_sms(phone, message, kind='order')

    if event == 'created' and config.sms_notify_admin_on_order and config.sms_admin_phone:
        send_sms(
            config.sms_admin_phone,
            f'سفارش جدید {order.order_number} به مبلغ {int(order.total):,} {config.currency_label} ثبت شد.',
            kind='admin',
        )
