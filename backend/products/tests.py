from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from .models import Brand, Category, Product


class CategorySubtreeTests(TestCase):
    """محصولات به برگ‌های درخت وصل می‌شوند، پس دستهٔ ریشه باید زیرشاخه‌ها را جمع بزند."""

    @classmethod
    def setUpTestData(cls):
        cls.root = Category.objects.create(name='کفش مردانه', slug='کفش-مردانه')
        cls.child = Category.objects.create(name='کتانی مردانه', slug='کتانی-مردانه', parent=cls.root)
        cls.grandchild = Category.objects.create(name='رانینگ', slug='رانینگ', parent=cls.child)
        cls.other = Category.objects.create(name='اکسسوری', slug='اکسسوری')
        cls.brand = Brand.objects.create(name='ن وان', slug='ن-وان')

        for index, category in enumerate((cls.child, cls.child, cls.grandchild, cls.other)):
            Product.objects.create(
                name=f'محصول {index}',
                slug=f'محصول-{index}',
                sku=f'SKU{index}',
                price=Decimal('100000'),
                stock=5,
                status='active',
                category=category,
                brand=cls.brand,
            )

    def test_root_category_counts_whole_subtree(self):
        counts = Category.subtree_product_counts()
        self.assertEqual(counts[self.root.pk], 3)
        self.assertEqual(counts[self.child.pk], 3)
        self.assertEqual(counts[self.grandchild.pk], 1)
        self.assertEqual(counts[self.other.pk], 1)

    def test_descendant_ids_reaches_every_depth(self):
        self.assertEqual(
            self.root.descendant_ids(),
            {self.root.pk, self.child.pk, self.grandchild.pk},
        )

    def test_filter_by_root_category_id_returns_descendants(self):
        response = self.client.get('/api/products/', {'category': self.root.pk})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 3)

    def test_filter_by_category_slug_matches_sitemap_urls(self):
        """نقشهٔ سایت لینک‌ها را با اسلاگ می‌سازد؛ اگر فیلتر اسلاگ نپذیرد، گوگل صفحهٔ خالی ایندکس می‌کند."""
        response = self.client.get('/api/products/', {'category': self.root.slug})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 3)

    def test_filter_by_brand_slug_and_id_agree(self):
        by_id = self.client.get('/api/products/', {'brand': self.brand.pk}).json()['count']
        by_slug = self.client.get('/api/products/', {'brand': self.brand.slug}).json()['count']
        self.assertEqual(by_id, 4)
        self.assertEqual(by_slug, 4)

    def test_unknown_category_returns_empty_not_error(self):
        response = self.client.get('/api/products/', {'category': 'وجود-ندارد'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 0)


class ProductPageUrlTests(TestCase):
    """آدرس محصول در فید و نقشهٔ سایت باید با مسیر واقعی فرانت‌اند یکی باشد."""

    def test_feed_page_url_uses_products_prefix(self):
        from feeds.services import build_rows

        category = Category.objects.create(name='کفش', slug='کفش')
        Product.objects.create(
            name='کفش تست', slug='کفش-تست', sku='S1', price=Decimal('50000'),
            stock=1, status='active', category=category, include_in_feeds=True,
        )
        request = self.client.get('/health/').wsgi_request
        rows = build_rows(request)
        self.assertTrue(rows)
        # مسیر فرانت‌اند /products/:slug است، نه /product/:slug
        self.assertIn('/products/', rows[0]['page_url'])
        self.assertNotIn('/product/%s' % 'کفش-تست', rows[0]['page_url'])
