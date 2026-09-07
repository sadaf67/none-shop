from decimal import Decimal
from xml.etree.ElementTree import fromstring

from django.core.cache import cache
from django.test import TestCase

from core.models import SiteSettings
from products.models import Brand, Category, Product

GOOGLE_NS = {'g': 'http://base.google.com/ns/1.0'}


class FeedTestCase(TestCase):
    """پایهٔ مشترک: یک محصول تخفیف‌خورده و یک محصول ساده.

    ویوهای فید با `cache_page` پوشیده شده‌اند؛ بدون پاک‌کردن کش، پاسخِ یک تست
    به تست بعدی نشت می‌کند و نتیجه‌ها بی‌معنی می‌شوند.
    """

    @classmethod
    def setUpTestData(cls):
        cls.category = Category.objects.create(name='کفش مردانه', slug='کفش-مردانه')
        cls.brand = Brand.objects.create(name='ن وان', slug='ن-وان')
        cls.discounted = Product.objects.create(
            name='کتانی رانینگ',
            slug='کتانی-رانینگ',
            sku='SKU-RUN',
            barcode='6260000000001',
            price=Decimal('1290000'),
            compare_price=Decimal('1690000'),
            stock=4,
            status='active',
            include_in_feeds=True,
            category=cls.category,
            brand=cls.brand,
        )
        cls.plain = Product.objects.create(
            name='جوراب ساق کوتاه',
            slug='جوراب-ساق-کوتاه',
            sku='',
            price=Decimal('90000'),
            stock=0,
            status='active',
            include_in_feeds=True,
            category=cls.category,
            brand=cls.brand,
        )
        cls.hidden = Product.objects.create(
            name='محصول پنهان',
            slug='محصول-پنهان',
            sku='SKU-HIDDEN',
            price=Decimal('50000'),
            stock=3,
            status='active',
            include_in_feeds=False,
            category=cls.category,
        )

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def get_xml(self, url):
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        return fromstring(response.content)


class GoogleMerchantFeedTests(FeedTestCase):
    """قالب RSS 2.0 گوگل مرچنت — مرجعِ اکثر موتورهای مقایسه قیمت."""

    def test_discounted_item_puts_original_in_price_and_current_in_sale_price(self):
        """اگر جای این دو عوض شود، گوگل تخفیف را «افزایش قیمت» می‌بیند و آگهی رد می‌شود."""
        root = self.get_xml('/feeds/google.xml')
        item = root.find(".//item[title='کتانی رانینگ']")
        self.assertIsNotNone(item)
        # قیمت‌ها در پایگاه داده تومان‌اند و در فید باید ریال باشند (×۱۰).
        self.assertEqual(item.find('g:price', GOOGLE_NS).text, '16900000 IRR')
        self.assertEqual(item.find('g:sale_price', GOOGLE_NS).text, '12900000 IRR')

    def test_plain_item_has_single_price_and_no_sale_price(self):
        root = self.get_xml('/feeds/google.xml')
        item = root.find(".//item[title='جوراب ساق کوتاه']")
        self.assertEqual(item.find('g:price', GOOGLE_NS).text, '900000 IRR')
        self.assertIsNone(item.find('g:sale_price', GOOGLE_NS))

    def test_availability_follows_stock(self):
        root = self.get_xml('/feeds/google.xml')
        in_stock = root.find(".//item[title='کتانی رانینگ']")
        out_of_stock = root.find(".//item[title='جوراب ساق کوتاه']")
        self.assertEqual(in_stock.find('g:availability', GOOGLE_NS).text, 'in stock')
        self.assertEqual(out_of_stock.find('g:availability', GOOGLE_NS).text, 'out of stock')

    def test_every_item_carries_an_identifier(self):
        """گوگل کالای بدون شناسه را حذف می‌کند، مگر پرچم identifier_exists بیاید.

        مدل Product در صورت خالی‌بودن، خودش SKU می‌سازد؛ پس در عمل همیشه
        `g:mpn` وجود دارد و پرچم فقط تورِ ایمنی است. این تست همان چیزی را
        می‌سنجد که گوگل واقعاً لازم دارد: هیچ آیتمی بی‌شناسه نماند.
        """
        root = self.get_xml('/feeds/google.xml')
        items = root.findall('.//item')
        self.assertEqual(len(items), 2)
        for item in items:
            has_id = (
                item.find('g:gtin', GOOGLE_NS) is not None
                or item.find('g:mpn', GOOGLE_NS) is not None
                or item.find('g:identifier_exists', GOOGLE_NS) is not None
            )
            self.assertTrue(has_id, item.find('title').text)

    def test_barcode_is_published_as_gtin(self):
        root = self.get_xml('/feeds/google.xml')
        item = root.find(".//item[title='کتانی رانینگ']")
        self.assertEqual(item.find('g:gtin', GOOGLE_NS).text, '6260000000001')

    def test_products_excluded_from_feeds_are_absent(self):
        root = self.get_xml('/feeds/google.xml')
        titles = [node.text for node in root.findall('.//item/title')]
        self.assertNotIn('محصول پنهان', titles)

    def test_link_uses_frontend_products_route(self):
        root = self.get_xml('/feeds/google.xml')
        link = root.find(".//item[title='کتانی رانینگ']/link").text
        self.assertIn('/products/', link)

    def test_disabled_feed_returns_404(self):
        site = SiteSettings.load()
        site.google_feed_enabled = False
        site.save()
        self.assertEqual(self.client.get('/feeds/google.xml').status_code, 404)


class TorobEmallsFeedTests(FeedTestCase):
    """ترب و ایمالز قالب اختصاصی دارند؛ نام تگ‌ها نباید سهواً تغییر کند."""

    def test_torob_item_carries_required_tags(self):
        root = self.get_xml('/feeds/torob.xml')
        product = root.find(".//product[title='کتانی رانینگ']")
        self.assertIsNotNone(product)
        self.assertEqual(product.find('current_price').text, '12900000')
        self.assertEqual(product.find('old_price').text, '16900000')
        self.assertEqual(product.find('availability').text, 'instock')
        self.assertIn('/products/', product.find('page_url').text)

    def test_emalls_exist_flag_is_boolean_string(self):
        root = self.get_xml('/feeds/emalls.xml')
        in_stock = root.find(".//product[name='کتانی رانینگ']")
        out_of_stock = root.find(".//product[name='جوراب ساق کوتاه']")
        self.assertEqual(in_stock.find('exist').text, '1')
        self.assertEqual(out_of_stock.find('exist').text, '0')

    def test_json_feed_reports_count_and_currency(self):
        payload = self.client.get('/feeds/products.json').json()
        self.assertEqual(payload['currency'], 'IRR')
        self.assertEqual(payload['count'], 2)


class SitemapTests(FeedTestCase):
    """آدرس‌های نقشهٔ سایت باید همان‌هایی باشند که فیلترِ محصولات می‌پذیرد."""

    def test_category_and_brand_urls_use_slug(self):
        root = self.get_xml('/sitemap.xml')
        locations = [node.text for node in root.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
        joined = '\n'.join(locations)
        self.assertIn('category=', joined)
        self.assertIn('brand=', joined)

    def test_product_urls_are_indexable_and_present(self):
        root = self.get_xml('/sitemap.xml')
        locations = [node.text for node in root.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
        self.assertTrue(any('/products/' in loc for loc in locations))

    def test_robots_points_to_sitemap_and_blocks_private_paths(self):
        body = self.client.get('/robots.txt').content.decode('utf-8')
        self.assertIn('Sitemap:', body)
        self.assertIn('Disallow: /admin/', body)
        self.assertIn('Disallow: /checkout', body)
