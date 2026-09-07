from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator
from config.validators import validate_image_upload
import uuid


class Category(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, allow_unicode=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    image = models.ImageField(upload_to='categories/', blank=True, null=True, validators=[validate_image_upload])
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'دسته‌بندی'
        verbose_name_plural = 'دسته‌بندی‌ها'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)

    @property
    def is_root(self):
        return self.parent is None

    @property
    def full_path(self):
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name

    def descendant_ids(self):
        """شناسهٔ خود دسته به‌همراه همهٔ زیرشاخه‌ها در هر عمقی.

        محصولات معمولاً به برگ‌های درخت وصل می‌شوند؛ بنابراین فیلترِ دقیقِ
        «category=<ریشه>» هیچ محصولی برنمی‌گرداند. مجموعهٔ زیر برای فیلتر کردن
        محصولات یک شاخهٔ کامل استفاده می‌شود.
        """
        ids = {self.pk}
        frontier = [self.pk]
        while frontier:
            children = list(
                Category.objects.filter(parent_id__in=frontier)
                .exclude(pk__in=ids)  # جلوگیری از حلقهٔ بی‌نهایت در دادهٔ خراب
                .values_list('pk', flat=True)
            )
            if not children:
                break
            ids.update(children)
            frontier = children
        return ids

    @classmethod
    def subtree_product_counts(cls, status='active'):
        """نقشهٔ «شناسهٔ دسته → تعداد محصولات خود و همهٔ زیرشاخه‌ها».

        کل درخت را با دو کوئری می‌سازد و شمارش برگ‌ها را رو به بالا جمع می‌زند،
        تا برای نمایش لیست دسته‌ها به ازای هر گره کوئری جداگانه اجرا نشود.
        """
        parents = dict(cls.objects.values_list('pk', 'parent_id'))
        direct = (
            cls.objects.filter(products__status=status)
            .annotate(n=models.Count('products'))
            .values_list('pk', 'n')
        )
        totals = {pk: 0 for pk in parents}
        for pk, count in direct:
            node, seen = pk, set()
            while node is not None and node not in seen:
                seen.add(node)
                totals[node] = totals.get(node, 0) + count
                node = parents.get(node)
        return totals


class Brand(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, allow_unicode=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True, validators=[validate_image_upload])
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'برند'
        verbose_name_plural = 'برندها'
        # بدون ترتیب مشخص، صفحه‌بندی ممکن است یک برند را تکرار یا حذف کند.
        ordering = ['name']

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True, allow_unicode=True)

    class Meta:
        verbose_name = 'تگ'
        verbose_name_plural = 'تگ‌ها'

    def __str__(self):
        return self.name


class Product(models.Model):
    STATUS_CHOICES = [
        ('active', 'فعال'),
        ('draft', 'پیش‌نویس'),
        ('archived', 'آرشیو'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True, allow_unicode=True)
    sku = models.CharField(max_length=100, unique=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    tags = models.ManyToManyField(Tag, blank=True, related_name='products')
    short_description = models.TextField(blank=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=12, decimal_places=0, validators=[MinValueValidator(0)])
    compare_price = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, validators=[MinValueValidator(0)])
    cost_price = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, validators=[MinValueValidator(0)])
    stock = models.PositiveIntegerField(default=0)
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='kg')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_featured = models.BooleanField(default=False)
    is_digital = models.BooleanField(default=False)
    guarantee = models.CharField(max_length=150, blank=True, verbose_name='گارانتی')
    barcode = models.CharField(max_length=64, blank=True, verbose_name='بارکد / EAN')
    video_url = models.URLField(blank=True, verbose_name='ویدیو معرفی')
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=320, blank=True)
    include_in_feeds = models.BooleanField(default=True, verbose_name='نمایش در ترب و ایمالز')
    views_count = models.PositiveIntegerField(default=0)
    sold_count = models.PositiveIntegerField(default=0)
    display_order = models.PositiveIntegerField(default=0, help_text='اولویت نمایش — کمتر = بالاتر')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'محصول'
        verbose_name_plural = 'محصولات'
        ordering = ['display_order', '-created_at']
        constraints = [
            models.CheckConstraint(condition=models.Q(price__gte=0), name='product_price_nonnegative'),
            models.CheckConstraint(
                condition=models.Q(compare_price__isnull=True) | models.Q(compare_price__gte=0),
                name='product_compare_price_nonnegative',
            ),
            models.CheckConstraint(
                condition=models.Q(cost_price__isnull=True) | models.Q(cost_price__gte=0),
                name='product_cost_price_nonnegative',
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        if not self.sku:
            self.sku = str(uuid.uuid4()).split('-')[0].upper()
        super().save(*args, **kwargs)

    @property
    def discount_percent(self) -> int:
        if self.compare_price and self.compare_price > self.price:
            return int((1 - self.price / self.compare_price) * 100)
        return 0

    @property
    def is_in_stock(self) -> bool:
        active_variants = [variant for variant in self.variants.all() if variant.is_active]
        if active_variants:
            return any(variant.stock > 0 for variant in active_variants)
        return self.stock > 0

    @property
    def available_stock(self) -> int:
        active_variants = [variant for variant in self.variants.all() if variant.is_active]
        if active_variants:
            return sum(variant.stock for variant in active_variants)
        return self.stock

    @property
    def main_image(self):
        img = self.images.filter(is_main=True).first()
        if not img:
            img = self.images.first()
        return img

    @property
    def average_rating(self) -> float:
        reviews = self.reviews.filter(is_approved=True)
        if reviews.exists():
            return round(sum(r.rating for r in reviews) / reviews.count(), 1)
        return 0

    @property
    def reviews_count(self) -> int:
        return self.reviews.filter(is_approved=True).count()


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/', validators=[validate_image_upload])
    alt_text = models.CharField(max_length=200, blank=True)
    is_main = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'تصویر محصول'
        verbose_name_plural = 'تصاویر محصول'
        ordering = ['order']

    def save(self, *args, **kwargs):
        if self.is_main:
            self.product.images.filter(is_main=True).update(is_main=False)
        super().save(*args, **kwargs)


class ProductAttribute(models.Model):
    name = models.CharField(max_length=100)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='attributes', null=True, blank=True)

    class Meta:
        verbose_name = 'ویژگی'
        verbose_name_plural = 'ویژگی‌ها'

    def __str__(self):
        return self.name


class ProductAttributeValue(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='attributes')
    attribute = models.ForeignKey(ProductAttribute, on_delete=models.CASCADE)
    value = models.CharField(max_length=300)

    class Meta:
        verbose_name = 'مقدار ویژگی'
        verbose_name_plural = 'مقادیر ویژگی'
        unique_together = ('product', 'attribute')

    def __str__(self):
        return f"{self.attribute.name}: {self.value}"


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    size = models.CharField(max_length=30)
    color = models.CharField(max_length=80, blank=True)
    sku = models.CharField(max_length=100, unique=True)
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'تنوع سایز/رنگ'
        verbose_name_plural = 'تنوع‌های سایز/رنگ'
        ordering = ['order', 'size', 'color']
        constraints = [
            models.UniqueConstraint(fields=('product', 'size', 'color'), name='unique_product_size_color'),
        ]

    @property
    def label(self) -> str:
        return f"سایز {self.size}" + (f" · {self.color}" if self.color else '')

    @property
    def is_in_stock(self) -> bool:
        return self.is_active and self.stock > 0

    def __str__(self):
        return f"{self.product.name} — {self.label}"


class Wishlist(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')
        verbose_name = 'علاقه‌مندی'
        verbose_name_plural = 'علاقه‌مندی‌ها'
