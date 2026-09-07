from django.test import SimpleTestCase

from .sanitizers import sanitize_badge_html

ENAMAD = (
    "<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=123456&Code=aBcD'>"
    "<img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=123456&Code=aBcD' "
    "alt='' style='cursor:pointer' code='aBcD'></a>"
)

SAMANDEHI = (
    "<a referrerpolicy='origin' target='_blank' href='https://logo.samandehi.ir/Verify.aspx?id=9999&p=xyz'>"
    "<img referrerpolicy='origin' id='rgvp' style='cursor:pointer' onclick=\"window.open('http://evil')\" "
    "alt='logo-samandehi' src='https://logo.samandehi.ir/logo.aspx?id=9999&p=xyz'></a>"
)


class BadgeSanitizerTests(SimpleTestCase):
    """کد نمادها به همه بازدیدکنندگان رندر می‌شود، پس باید کاملاً امن شود."""

    def test_official_enamad_code_survives(self):
        cleaned = sanitize_badge_html(ENAMAD)
        self.assertIn('trustseal.enamad.ir/logo.aspx', cleaned)
        self.assertIn('code="aBcD"', cleaned)
        self.assertIn('<img', cleaned)

    def test_official_samandehi_code_survives_without_onclick(self):
        cleaned = sanitize_badge_html(SAMANDEHI)
        self.assertIn('logo.samandehi.ir/logo.aspx', cleaned)
        self.assertNotIn('onclick', cleaned.lower())

    def test_target_blank_gets_rel_noopener(self):
        cleaned = sanitize_badge_html("<a href='https://ok.ir' target='_blank'>ok</a>")
        self.assertIn('rel="noopener noreferrer"', cleaned)

    def test_dangerous_input_is_stripped(self):
        payloads = [
            '<script>alert(document.cookie)</script>',
            '<div onmouseover=\'fetch("//evil")\'>hi</div>',
            "<a href='javascript:alert(1)'>click</a>",
            "<img src='x' onerror='alert(1)'>",
            "<div style='background:url(javascript:alert(1))'>x</div>",
            "<iframe src='https://evil.com'></iframe>",
            '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">',
            '<svg><script>alert(1)</script></svg>',
            '<a href="https://ok.ir" onfocus="alert(1)" autofocus>x</a>',
        ]
        forbidden = ('javascript:', 'onerror', 'onclick', 'onmouseover', 'onfocus',
                     '<script', '<iframe', '<svg', 'data:text')
        for payload in payloads:
            cleaned = sanitize_badge_html(payload).lower()
            for token in forbidden:
                self.assertNotIn(token, cleaned, msg=f'{token!r} از {payload!r} عبور کرد')

    def test_empty_input(self):
        self.assertEqual(sanitize_badge_html(''), '')
        self.assertEqual(sanitize_badge_html('   '), '')
