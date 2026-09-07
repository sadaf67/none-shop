from urllib.parse import quote
from xml.etree.ElementTree import Element, SubElement, tostring

from django.conf import settings
from django.http import Http404, HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.cache import cache_page

from core.models import Page, SiteSettings
from products.models import Brand, Category

from .services import build_rows

FEED_CACHE_SECONDS = 60 * 30


def _xml_response(root: Element) -> HttpResponse:
    payload = '<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(root, encoding='unicode')
    return HttpResponse(payload, content_type='application/xml; charset=utf-8')


def _text(parent: Element, tag: str, value) -> None:
    if value in (None, ''):
        return
    SubElement(parent, tag).text = str(value)


@cache_page(FEED_CACHE_SECONDS)
def torob_feed(request):
    """فید ترب — https://torob.com  (ساختار XML رسمی ترب)"""
    site = SiteSettings.load()
    if not site.torob_feed_enabled:
        raise Http404('فید ترب غیرفعال است.')

    root = Element('products')
    root.set('shop', site.site_name)
    root.set('generated_at', timezone.now().isoformat())

    for row in build_rows(request, site):
        item = SubElement(root, 'product')
        _text(item, 'product_id', row['id'])
        _text(item, 'title', row['title'])
        _text(item, 'subtitle', row['subtitle'])
        _text(item, 'page_url', row['page_url'])
        _text(item, 'image_link', row['image_url'])
        _text(item, 'current_price', row['price'])
        _text(item, 'old_price', row['old_price'])
        _text(item, 'availability', row['availability'])
        _text(item, 'category_name', row['category_name'])
        _text(item, 'category_path', row['category'])
        _text(item, 'brand', row['brand'])
        _text(item, 'guarantee', row['guarantee'])
        _text(item, 'spec', row['barcode'])
        _text(item, 'shipping_days', row['shipping_days'])
        _text(item, 'registry', row['registry'])
    return _xml_response(root)


@cache_page(FEED_CACHE_SECONDS)
def emalls_feed(request):
    """فید ایمالز — https://emalls.ir"""
    site = SiteSettings.load()
    if not site.emalls_feed_enabled:
        raise Http404('فید ایمالز غیرفعال است.')

    root = Element('root')
    _text(root, 'shopname', site.site_name)
    _text(root, 'shopurl', settings.FRONTEND_URL)
    _text(root, 'date', timezone.now().strftime('%Y-%m-%d %H:%M:%S'))
    products = SubElement(root, 'products')

    for row in build_rows(request, site):
        item = SubElement(products, 'product')
        _text(item, 'id', row['id'])
        _text(item, 'name', row['title'])
        _text(item, 'link', row['page_url'])
        _text(item, 'image', row['image_url'])
        _text(item, 'price', row['price'])
        _text(item, 'oldprice', row['old_price'])
        _text(item, 'exist', '1' if row['availability'] == 'instock' else '0')
        _text(item, 'category', row['category'])
        _text(item, 'brand', row['brand'])
        _text(item, 'guarantee', row['guarantee'])
        _text(item, 'barcode', row['barcode'])
        _text(item, 'sendtime', row['shipping_days'])
    return _xml_response(root)


GOOGLE_NS = 'http://base.google.com/ns/1.0'


@cache_page(FEED_CACHE_SECONDS)
def google_merchant_feed(request):
    """فید RSS 2.0 استاندارد Google Merchant Center.

    این قالب مرجعِ صنعت است و بیشتر موتورهای مقایسه قیمت و شبکه‌های تبلیغاتی
    (به‌جز ترب و ایمالز که قالب اختصاصی دارند) همین را می‌پذیرند؛ بنابراین برای
    هر سرویس جدید لازم نیست فید تازه‌ای نوشته شود.
    """
    site = SiteSettings.load()
    if not site.google_feed_enabled:
        raise Http404('فید گوگل غیرفعال است.')

    root = Element('rss')
    root.set('version', '2.0')
    root.set('xmlns:g', GOOGLE_NS)
    channel = SubElement(root, 'channel')
    _text(channel, 'title', site.site_name)
    _text(channel, 'link', settings.FRONTEND_URL)
    _text(channel, 'description', site.meta_description or site.tagline)

    for row in build_rows(request, site):
        item = SubElement(channel, 'item')
        _text(item, 'g:id', row['id'])
        _text(item, 'title', row['title'])
        _text(item, 'description', row['subtitle'] or row['title'])
        _text(item, 'link', row['page_url'])
        _text(item, 'g:image_link', row['image_url'])
        for extra in row['gallery'][1:]:
            _text(item, 'g:additional_image_link', extra)
        # واحد پول باید صریح و کنار عدد بیاید. وقتی تخفیف هست، طبق مشخصات گوگل
        # price قیمتِ اصلی است و sale_price قیمتِ فعلی — نه برعکس.
        if row['old_price']:
            _text(item, 'g:price', f"{row['old_price']} IRR")
            _text(item, 'g:sale_price', f"{row['price']} IRR")
        else:
            _text(item, 'g:price', f"{row['price']} IRR")
        _text(item, 'g:availability', 'in stock' if row['availability'] == 'instock' else 'out of stock')
        _text(item, 'g:condition', 'new')
        _text(item, 'g:brand', row['brand'])
        _text(item, 'g:product_type', row['category'])
        _text(item, 'g:gtin', row['barcode'])
        _text(item, 'g:mpn', row['sku'])
        # اگر نه بارکد و نه کد سازنده باشد، گوگل بدون این پرچم آیتم را رد می‌کند.
        if not row['barcode'] and not row['sku']:
            _text(item, 'g:identifier_exists', 'no')
    return _xml_response(root)


@cache_page(FEED_CACHE_SECONDS)
def products_feed_json(request):
    """فید عمومی JSON برای هر موتور مقایسه قیمت دیگر."""
    site = SiteSettings.load()
    rows = build_rows(request, site)
    return JsonResponse({
        'shop': site.site_name,
        'shop_url': settings.FRONTEND_URL,
        'currency': 'IRR',
        'generated_at': timezone.now().isoformat(),
        'count': len(rows),
        'products': rows,
    }, json_dumps_params={'ensure_ascii': False})


@cache_page(FEED_CACHE_SECONDS)
def sitemap_xml(request):
    front = (settings.FRONTEND_URL or f"{request.scheme}://{request.get_host()}").rstrip('/')
    now = timezone.now().date().isoformat()

    root = Element('urlset')
    root.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')

    def add(loc: str, lastmod: str, changefreq: str, priority: str) -> None:
        url = SubElement(root, 'url')
        _text(url, 'loc', loc)
        _text(url, 'lastmod', lastmod)
        _text(url, 'changefreq', changefreq)
        _text(url, 'priority', priority)

    # صفحات محتوایی (درباره ما، قوانین و…) پایین‌تر از روی مدل Page اضافه می‌شوند.
    for path, priority in (('', '1.0'), ('/products', '0.9'), ('/contact', '0.5'), ('/faq', '0.5')):
        add(f"{front}{path}", now, 'daily' if priority >= '0.9' else 'monthly', priority)

    for category in Category.objects.filter(is_active=True):
        add(f"{front}/products?category={quote(category.slug)}", now, 'weekly', '0.7')

    for brand in Brand.objects.filter(is_active=True):
        add(f"{front}/products?brand={quote(brand.slug)}", now, 'weekly', '0.6')

    for row in build_rows(request):
        add(row['page_url'], row['updated_at'].date().isoformat(), 'weekly', '0.8')

    for page in Page.objects.filter(is_active=True):
        add(f"{front}/page/{quote(page.slug)}", page.updated_at.date().isoformat(), 'monthly', '0.4')

    return _xml_response(root)


def robots_txt(request):
    front = (settings.FRONTEND_URL or f"{request.scheme}://{request.get_host()}").rstrip('/')
    host = f"{request.scheme}://{request.get_host()}"
    lines = [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin/',
        'Disallow: /api/',
        'Disallow: /checkout',
        'Disallow: /profile',
        'Disallow: /cart',
        '',
        f'Sitemap: {host}/sitemap.xml',
        f'Host: {front}',
        '',
    ]
    return HttpResponse('\n'.join(lines), content_type='text/plain; charset=utf-8')
