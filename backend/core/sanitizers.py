"""پاک‌سازی HTMLهایی که مدیر فروشگاه از پنل وارد می‌کند.

کد نمادهای اعتماد (اینماد و ساماندهی) و محتوای صفحات CMS مستقیماً به همه
بازدیدکنندگان رندر می‌شود؛ پس باید پیش از ذخیره به یک زیرمجموعه امن محدود
شود تا کسی نتواند از این مسیر اسکریپت تزریق کند.
"""

from __future__ import annotations

import re
from html import escape
from html.parser import HTMLParser

# --- زیرمجموعه نمادها: دقیقاً همان تگ‌هایی که کد رسمی اینماد و ساماندهی دارد.
BADGE_TAGS = {'a', 'img', 'div', 'span', 'p', 'br'}

# --- زیرمجموعه محتوای صفحات: تگ‌های متنی رایج ویرایشگر.
RICH_TAGS = BADGE_TAGS | {
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 's',
    'blockquote', 'hr', 'pre', 'code', 'small', 'sup', 'sub',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'figure', 'figcaption',
}

VOID_TAGS = {'img', 'br', 'hr'}

# ویژگی‌های مجاز به تفکیک تگ (`*` یعنی برای همه تگ‌ها).
ALLOWED_ATTRS = {
    '*': {'id', 'class', 'style', 'title', 'dir'},
    'a': {'href', 'target', 'rel', 'referrerpolicy'},
    'img': {'src', 'alt', 'width', 'height', 'referrerpolicy', 'loading', 'code'},
    'td': {'colspan', 'rowspan'},
    'th': {'colspan', 'rowspan', 'scope'},
    'ol': {'start'},
}

# تگ‌هایی که علاوه بر خودشان، محتوای داخلشان هم باید دور ریخته شود.
DROP_CONTENT_TAGS = {'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg'}

URL_ATTRS = {'href', 'src'}
SAFE_URL = re.compile(r'^(https?://|/|mailto:|tel:)[^\s"\'<>]*$', re.IGNORECASE)
# استایل فقط اعلان‌های ساده مجاز است؛ url() و expression() اجازه ندارند.
SAFE_STYLE = re.compile(r'^[\w\s:;,.%#()\-]*$')
UNSAFE_STYLE = re.compile(r'url\s*\(|expression\s*\(|@import|javascript:', re.IGNORECASE)

# سقف طول کد نماد (کد رسمی حدود ۴۰۰ نویسه است).
MAX_LENGTH = 4000
# سقف طول محتوای صفحات CMS.
MAX_RICH_LENGTH = 120_000


class _Cleaner(HTMLParser):
    """بازسازی HTML فقط از تگ‌ها و ویژگی‌های سفیدشده."""

    def __init__(self, allowed_tags: set[str]) -> None:
        super().__init__(convert_charrefs=True)
        self.allowed_tags = allowed_tags
        self.parts: list[str] = []
        self.open_tags: list[str] = []
        self.skip_depth = 0

    # --- کمکی‌ها -------------------------------------------------------
    @staticmethod
    def _clean_attrs(tag: str, attrs) -> str:
        allowed = ALLOWED_ATTRS['*'] | ALLOWED_ATTRS.get(tag, set())
        out: list[str] = []
        for name, value in attrs:
            name = (name or '').lower()
            value = value or ''
            if name.startswith('on') or name not in allowed:
                continue
            if name in URL_ATTRS and not SAFE_URL.match(value.strip()):
                continue
            if name == 'style' and (UNSAFE_STYLE.search(value) or not SAFE_STYLE.match(value)):
                continue
            if name == 'target' and value.lower() != '_blank':
                continue
            out.append(f'{name}="{escape(value.strip(), quote=True)}"')
        if tag == 'a':
            names = {part.split('=', 1)[0] for part in out}
            if 'target' in names and 'rel' not in names:
                # جلوگیری از دسترسی صفحه مقصد به window.opener
                out.append('rel="noopener noreferrer"')
        return (' ' + ' '.join(out)) if out else ''

    # --- قلاب‌های پارسر -------------------------------------------------
    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in DROP_CONTENT_TAGS:
            self.skip_depth += 1
            return
        if self.skip_depth or tag not in self.allowed_tags:
            return
        if tag in VOID_TAGS:
            self.parts.append(f'<{tag}{self._clean_attrs(tag, attrs)} />')
        else:
            self.parts.append(f'<{tag}{self._clean_attrs(tag, attrs)}>')
            self.open_tags.append(tag)

    def handle_startendtag(self, tag, attrs):
        tag = tag.lower()
        if not self.skip_depth and tag in self.allowed_tags:
            self.parts.append(f'<{tag}{self._clean_attrs(tag, attrs)} />')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in DROP_CONTENT_TAGS:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if self.skip_depth or tag in VOID_TAGS or tag not in self.allowed_tags:
            return
        if tag in self.open_tags:
            # بستن تگ‌های بازِ تودرتو تا ساختار خروجی سالم بماند
            while self.open_tags:
                current = self.open_tags.pop()
                self.parts.append(f'</{current}>')
                if current == tag:
                    break

    def handle_data(self, data):
        if self.skip_depth:
            return
        self.parts.append(escape(data, quote=False))

    def result(self) -> str:
        self.close()
        while self.open_tags:
            self.parts.append(f'</{self.open_tags.pop()}>')
        return ''.join(self.parts).strip()


def _sanitize(value: str, allowed_tags: set[str]) -> str:
    if not value:
        return ''
    cleaner = _Cleaner(allowed_tags)
    cleaner.feed(value)
    return cleaner.result()


def sanitize_badge_html(value: str) -> str:
    """HTML نماد اعتماد را به تگ‌ها و ویژگی‌های امن محدود می‌کند."""
    return _sanitize(value, BADGE_TAGS)


def sanitize_rich_html(value: str) -> str:
    """محتوای متنی صفحات و پرسش‌های متداول را به تگ‌های امن محدود می‌کند."""
    return _sanitize(value, RICH_TAGS)
