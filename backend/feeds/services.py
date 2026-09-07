"""ساخت داده‌ی فید محصولات برای موتورهای مقایسه قیمت (ترب و ایمالز)."""
from decimal import Decimal
from urllib.parse import quote

from django.conf import settings

from core.models import SiteSettings
from products.models import Product

# ترب و ایمالز قیمت را به ریال می‌خواهند، در حالی که قیمت‌ها در پایگاه داده تومان است.
RIAL_MULTIPLIER = 10


def feed_products():
    return (
        Product.objects
        .filter(status='active', include_in_feeds=True)
        .select_related('category', 'brand')
        .prefetch_related('images', 'variants')
        .order_by('display_order', '-created_at')
    )


def _absolute(path: str, base: str) -> str:
    if not path:
        return ''
    if path.startswith('http://') or path.startswith('https://'):
        return path
    return f"{base}{path if path.startswith('/') else '/' + path}"


def _media_base(request) -> str:
    return f"{request.scheme}://{request.get_host()}"


def build_rows(request, site: SiteSettings | None = None) -> list[dict]:
    site = site or SiteSettings.load()
    front = (settings.FRONTEND_URL or _media_base(request)).rstrip('/')
    media_base = _media_base(request)
    default_guarantee = site.feed_default_guarantee or ''
    shipping_days = site.feed_shipping_days

    rows = []
    for product in feed_products():
        image = product.main_image
        gallery = [
            _absolute(img.image.url, media_base)
            for img in product.images.all()[:5]
            if img.image
        ]
        price = Decimal(product.price) * RIAL_MULTIPLIER
        old_price = (
            Decimal(product.compare_price) * RIAL_MULTIPLIER
            if product.compare_price and product.compare_price > product.price
            else None
        )
        rows.append({
            'id': str(product.id),
            'sku': product.sku,
            'barcode': product.barcode,
            'title': product.name,
            'subtitle': product.short_description[:200],
            'page_url': f"{front}/products/{quote(product.slug)}",
            'image_url': _absolute(image.image.url, media_base) if image and image.image else '',
            'gallery': gallery,
            'price': int(price),
            'old_price': int(old_price) if old_price is not None else None,
            'availability': 'instock' if product.is_in_stock else 'outofstock',
            'stock': product.available_stock,
            'category': product.category.full_path if product.category else '',
            'category_name': product.category.name if product.category else '',
            'brand': product.brand.name if product.brand else '',
            'guarantee': product.guarantee or default_guarantee,
            'shipping_days': shipping_days,
            'registry': site.business_license,
            'updated_at': product.updated_at,
        })
    return rows
