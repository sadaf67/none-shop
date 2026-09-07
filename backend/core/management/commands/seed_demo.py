"""داده‌ی اولیه و نمونه برای راه‌اندازی سریع فروشگاه «ن وان»."""
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import FAQ, Page, SiteSettings
from discounts.models import Coupon
from products.models import Brand, Category, Product, ProductVariant

PAGES = [
    ('about', 'درباره ما', 'فروشگاه اینترنتی ن وان با هدف عرضه‌ی کالای اصل و باکیفیت با قیمت منصفانه راه‌اندازی شده است. '
                           'ما تلاش می‌کنیم تجربه‌ی خریدی ساده، سریع و مطمئن را برای شما فراهم کنیم.'),
    ('contact-info', 'تماس با ما', 'برای ارتباط با پشتیبانی ن وان می‌توانید از فرم تماس، تلفن یا شبکه‌های اجتماعی استفاده کنید. '
                                   'کارشناسان ما همه‌روزه پاسخگوی شما هستند.'),
    ('terms', 'قوانین و مقررات', 'با ثبت سفارش در ن وان، شما قوانین فروشگاه شامل شرایط ارسال، بازگشت کالا و حریم خصوصی را می‌پذیرید.'),
    ('privacy', 'حریم خصوصی', 'اطلاعات شخصی شما نزد ن وان محفوظ است و تنها برای پردازش سفارش و اطلاع‌رسانی استفاده می‌شود. '
                              'هیچ اطلاعاتی در اختیار اشخاص ثالث قرار نمی‌گیرد.'),
    ('shipping', 'شیوه ارسال', 'سفارش‌ها پس از تأیید، طی ۱ تا ۳ روز کاری ارسال می‌شوند. ارسال به سراسر ایران از طریق پست پیشتاز و تیپاکس انجام می‌شود.'),
    ('returns', 'رویه بازگشت کالا', 'تا ۷ روز پس از دریافت کالا، در صورت سالم بودن بسته‌بندی و عدم استفاده، امکان بازگشت وجود دارد.'),
]

FAQS = [
    ('سفارش من چه زمانی ارسال می‌شود؟', 'سفارش‌های ثبت‌شده تا ساعت ۱۴ همان روز، و پس از آن روز کاری بعد پردازش و ارسال می‌شوند.', 'ارسال'),
    ('هزینه ارسال چقدر است؟', 'برای سفارش‌های بالای ۵۰۰ هزار تومان ارسال رایگان است؛ در غیر این صورت ۳۰ هزار تومان محاسبه می‌شود.', 'ارسال'),
    ('امکان پرداخت در محل وجود دارد؟', 'بله، در صورت فعال بودن این گزینه در تنظیمات فروشگاه، می‌توانید هنگام تحویل پرداخت کنید.', 'پرداخت'),
    ('کالا اصل است؟', 'تمام کالاهای ن وان اصل و دارای گارانتی اصالت هستند.', 'خرید'),
    ('چطور کالا را مرجوع کنم؟', 'از طریق صفحه‌ی سفارش‌ها درخواست مرجوعی ثبت کنید یا با پشتیبانی تماس بگیرید.', 'خرید'),
]

CATEGORIES = [
    ('کفش مردانه', ['کتانی مردانه', 'کلاسیک مردانه']),
    ('کفش زنانه', ['کتانی زنانه', 'پاشنه‌دار']),
    ('اکسسوری', ['جوراب', 'کیف']),
]

BRANDS = ['ن وان', 'اسپرت لاین', 'آرکا', 'وینتو']

SAMPLES = [
    ('کفش کتانی روزمره مدل الوند', 'کتانی مردانه', 1_290_000, 1_690_000),
    ('کفش کتانی سبک مدل دنا', 'کتانی مردانه', 1_450_000, None),
    ('کفش کلاسیک چرم مدل کاسپین', 'کلاسیک مردانه', 2_390_000, 2_890_000),
    ('کفش کلاسیک مجلسی مدل آرین', 'کلاسیک مردانه', 2_150_000, None),
    ('کفش کتانی زنانه مدل ونوس', 'کتانی زنانه', 1_390_000, 1_750_000),
    ('کفش کتانی زنانه مدل نیلا', 'کتانی زنانه', 1_190_000, None),
    ('کفش پاشنه‌دار مدل رزا', 'پاشنه‌دار', 1_890_000, 2_290_000),
    ('کفش پاشنه‌دار مدل سوگل', 'پاشنه‌دار', 1_690_000, None),
    ('جوراب نخی بسته ۳ عددی', 'جوراب', 189_000, 249_000),
    ('کیف دوشی چرم مصنوعی', 'کیف', 890_000, None),
]

MEN_SIZES = ['40', '41', '42', '43', '44']
WOMEN_SIZES = ['36', '37', '38', '39']
COLORS = ['مشکی', 'سفید', 'قهوه‌ای']


class Command(BaseCommand):
    help = 'ساخت داده‌ی اولیه (تنظیمات، صفحات، سؤالات متداول، دسته‌بندی، برند و محصولات نمونه)'

    def add_arguments(self, parser):
        parser.add_argument('--with-products', action='store_true',
                            help='محصولات نمونه هم ساخته شود')

    @transaction.atomic
    def handle(self, *args, **options):
        self._seed_settings()
        self._seed_pages()
        self._seed_faqs()
        if options['with_products']:
            self._seed_catalog()
            self._seed_coupon()
        self.stdout.write(self.style.SUCCESS('داده‌ی اولیه با موفقیت ساخته شد.'))

    def _seed_settings(self):
        site = SiteSettings.load()
        if not site.meta_title:
            site.meta_title = 'ن وان | فروشگاه اینترنتی کفش و اکسسوری'
            site.meta_description = ('خرید آنلاین کفش مردانه و زنانه، کتانی، کلاسیک و اکسسوری از فروشگاه ن وان '
                                     'با ضمانت اصالت کالا، ارسال سریع و امکان پرداخت در محل.')
            site.meta_keywords = 'خرید کفش، کفش مردانه، کفش زنانه، کتانی، ن وان'
            site.tagline = 'انتخاب اول شما'
            site.working_hours = 'شنبه تا پنجشنبه، ۹ تا ۱۸'
            site.feed_default_guarantee = 'ضمانت اصالت و سلامت کالا'
            site.save()
            self.stdout.write('  تنظیمات سایت مقداردهی شد.')

    def _seed_pages(self):
        created = 0
        for slug, title, content in PAGES:
            _, is_new = Page.objects.get_or_create(
                slug=slug,
                defaults={'title': title, 'content': content, 'meta_title': f'{title} | ن وان'},
            )
            created += int(is_new)
        self.stdout.write(f'  صفحات: {created} مورد جدید.')

    def _seed_faqs(self):
        created = 0
        for order, (question, answer, group) in enumerate(FAQS):
            _, is_new = FAQ.objects.get_or_create(
                question=question,
                defaults={'answer': answer, 'group': group, 'order': order},
            )
            created += int(is_new)
        self.stdout.write(f'  سؤالات متداول: {created} مورد جدید.')

    def _seed_catalog(self):
        brands = [Brand.objects.get_or_create(name=name, defaults={'slug': name.replace(' ', '-')})[0]
                  for name in BRANDS]

        leaves = {}
        for order, (parent_name, children) in enumerate(CATEGORIES):
            parent, _ = Category.objects.get_or_create(
                name=parent_name,
                defaults={'slug': parent_name.replace(' ', '-'), 'order': order},
            )
            for child_order, child_name in enumerate(children):
                child, _ = Category.objects.get_or_create(
                    name=child_name,
                    defaults={'slug': child_name.replace(' ', '-'), 'parent': parent, 'order': child_order},
                )
                leaves[child_name] = child

        random.seed(1)
        created = 0
        for index, (name, category_name, price, compare_price) in enumerate(SAMPLES):
            if Product.objects.filter(name=name).exists():
                continue
            product = Product.objects.create(
                name=name,
                category=leaves[category_name],
                brand=brands[index % len(brands)],
                short_description=f'{name} — ساخت ایران، مناسب استفاده‌ی روزمره.',
                description=(f'{name} با رویه‌ی باکیفیت و زیره‌ی سبک و انعطاف‌پذیر طراحی شده است. '
                             'این محصول برای استفاده‌ی طولانی‌مدت راحت است و در سایزهای متنوع عرضه می‌شود.'),
                price=price,
                compare_price=compare_price,
                stock=0,
                status='active',
                is_featured=index < 4,
                guarantee='ضمانت اصالت و سلامت کالا',
                display_order=index,
            )
            sizes = WOMEN_SIZES if 'زنانه' in category_name or category_name == 'پاشنه‌دار' else MEN_SIZES
            if category_name in ('جوراب', 'کیف'):
                product.stock = random.randint(10, 40)
                product.save(update_fields=['stock'])
            else:
                for size in sizes:
                    for color in COLORS[:2]:
                        ProductVariant.objects.create(
                            product=product, size=size, color=color,
                            sku=f'{product.sku}-{size}-{COLORS.index(color)}',
                            stock=random.randint(0, 12),
                        )
            created += 1
        self.stdout.write(f'  محصولات: {created} مورد جدید.')

    def _seed_coupon(self):
        if Coupon.objects.filter(code='NONE10').exists():
            return
        now = timezone.now()
        Coupon.objects.create(
            code='NONE10',
            discount_type='percent',
            value=10,
            min_order_amount=500_000,
            max_discount=200_000,
            usage_limit=100,
            valid_from=now,
            valid_until=now + timedelta(days=30),
            is_active=True,
        )
        self.stdout.write('  کوپن نمونه NONE10 ساخته شد.')
