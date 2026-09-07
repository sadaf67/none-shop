"""درایورهای سرویس‌دهنده پیامک.

هر درایور یک ``send`` می‌گیرد و ``(provider_message_id, error)`` برمی‌گرداند.
پیکربندی از ``SiteSettings`` می‌آید تا همه چیز از پنل مدیر قابل تغییر باشد.
"""

import logging

import requests

logger = logging.getLogger('notifications')

REQUEST_TIMEOUT = 12


class SmsSendError(Exception):
    pass


class BaseSmsProvider:
    name = 'base'

    def __init__(self, config):
        self.config = config

    @property
    def sender(self):
        return (self.config.sms_sender or '').strip()

    def send(self, phone: str, message: str, template: str = '', tokens: list[str] | None = None) -> str:
        raise NotImplementedError


class ConsoleProvider(BaseSmsProvider):
    """برای توسعه و تست — چیزی ارسال نمی‌کند و فقط در لاگ می‌نویسد."""

    name = 'console'

    def send(self, phone, message, template='', tokens=None):
        logger.info('SMS (console) → %s: %s', phone, message)
        return 'console'


class KavenegarProvider(BaseSmsProvider):
    name = 'kavenegar'

    def send(self, phone, message, template='', tokens=None):
        api_key = (self.config.sms_api_key or '').strip()
        if not api_key:
            raise SmsSendError('کلید API کاوه‌نگار تنظیم نشده است.')

        if template and tokens:
            url = f'https://api.kavenegar.com/v1/{api_key}/verify/lookup.json'
            params = {'receptor': phone, 'template': template}
            for index, token in enumerate(tokens[:3], start=1):
                params['token' if index == 1 else f'token{index}'] = token
        else:
            url = f'https://api.kavenegar.com/v1/{api_key}/sms/send.json'
            params = {'receptor': phone, 'message': message}
            if self.sender:
                params['sender'] = self.sender

        response = requests.post(url, data=params, timeout=REQUEST_TIMEOUT)
        payload = _json_or_error(response)
        status_code = payload.get('return', {}).get('status')
        if status_code != 200:
            raise SmsSendError(payload.get('return', {}).get('message') or 'خطای نامشخص کاوه‌نگار')
        entries = payload.get('entries') or []
        return str(entries[0].get('messageid')) if entries else ''


class SmsIrProvider(BaseSmsProvider):
    name = 'smsir'

    def send(self, phone, message, template='', tokens=None):
        api_key = (self.config.sms_api_key or '').strip()
        if not api_key:
            raise SmsSendError('کلید API سرویس sms.ir تنظیم نشده است.')
        headers = {'X-API-KEY': api_key, 'Accept': 'application/json'}

        if template and tokens:
            url = 'https://api.sms.ir/v1/send/verify'
            body = {
                'mobile': phone,
                'templateId': int(template) if str(template).isdigit() else template,
                'parameters': [{'name': f'TOKEN{i}' if i > 1 else 'CODE', 'value': str(t)} for i, t in enumerate(tokens[:3], start=1)],
            }
        else:
            url = 'https://api.sms.ir/v1/send/bulk'
            body = {'lineNumber': self.sender, 'messageText': message, 'mobiles': [phone]}

        response = requests.post(url, json=body, headers=headers, timeout=REQUEST_TIMEOUT)
        payload = _json_or_error(response)
        if payload.get('status') != 1:
            raise SmsSendError(payload.get('message') or 'خطای نامشخص sms.ir')
        data = payload.get('data')
        if isinstance(data, dict):
            return str(data.get('messageId', ''))
        return str(data or '')


class MelipayamakProvider(BaseSmsProvider):
    name = 'melipayamak'

    def send(self, phone, message, template='', tokens=None):
        username = (self.config.sms_username or '').strip()
        password = (self.config.sms_password or '').strip()
        if not username or not password:
            raise SmsSendError('نام کاربری یا رمز ملی پیامک تنظیم نشده است.')

        if template and tokens:
            url = 'https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber'
            body = {'username': username, 'password': password, 'text': ';'.join(str(t) for t in tokens),
                    'to': phone, 'bodyId': int(template) if str(template).isdigit() else template}
        else:
            url = 'https://rest.payamak-panel.com/api/SendSMS/SendSMS'
            body = {'username': username, 'password': password, 'from': self.sender,
                    'to': phone, 'text': message, 'isflash': False}

        response = requests.post(url, json=body, timeout=REQUEST_TIMEOUT)
        payload = _json_or_error(response)
        rec_id = payload.get('Value') or payload.get('RetStatus')
        if payload.get('RetStatus') != 1 and not str(rec_id or '').isdigit():
            raise SmsSendError(payload.get('StrRetStatus') or 'خطای نامشخص ملی پیامک')
        return str(rec_id or '')


PROVIDERS = {
    'console': ConsoleProvider,
    'kavenegar': KavenegarProvider,
    'smsir': SmsIrProvider,
    'melipayamak': MelipayamakProvider,
}


def get_provider(config) -> BaseSmsProvider:
    provider_class = PROVIDERS.get(config.sms_provider, ConsoleProvider)
    return provider_class(config)


def _json_or_error(response):
    try:
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        raise SmsSendError('ارتباط با سرویس پیامک برقرار نشد.') from exc
    except ValueError as exc:
        raise SmsSendError('پاسخ نامعتبر از سرویس پیامک دریافت شد.') from exc
