import django_filters
from django.db.models import Q

from .models import Brand, Category, Product


class SlugOrPkFilter(django_filters.CharFilter):
    """فیلتری که هم شناسهٔ عددی و هم اسلاگ را می‌پذیرد.

    نقشهٔ سایت لینک‌ها را با اسلاگ می‌سازد (`?category=کفش-مردانه`) چون برای
    سئو خواناتر است، ولی رابط کاربری شناسهٔ عددی می‌فرستد. اگر فقط یکی
    پشتیبانی شود، نیمی از URLها صفحهٔ خالی نشان می‌دهند.
    """

    # نام `model` را نمی‌توان استفاده کرد: خودِ django-filter هنگام اتصال فیلتر
    # به FilterSet آن را با مدلِ FilterSet (اینجا Product) بازنویسی می‌کند.
    lookup_model = None

    def __init__(self, *args, lookup_model=None, **kwargs):
        self.lookup_model = lookup_model
        super().__init__(*args, **kwargs)

    def resolve(self, value):
        lookup = Q(slug=value)
        if str(value).isdigit():
            lookup |= Q(pk=int(value))
        return self.lookup_model.objects.filter(lookup).first()


class CategoryFilter(SlugOrPkFilter):
    def filter(self, queryset, value):
        if not value:
            return queryset
        category = self.resolve(value)
        if category is None:
            return queryset.none()
        # انتخاب یک دستهٔ ریشه باید محصولات همهٔ زیرشاخه‌ها را نشان دهد؛ با
        # تطبیق دقیق، صفحهٔ «کفش مردانه» خالی می‌ماند چون محصولات به
        # زیردسته‌هایی مثل «کتانی مردانه» وصل هستند.
        return queryset.filter(category_id__in=category.descendant_ids())


class BrandFilter(SlugOrPkFilter):
    def filter(self, queryset, value):
        if not value:
            return queryset
        brand = self.resolve(value)
        if brand is None:
            return queryset.none()
        return queryset.filter(brand=brand)


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')
    has_discount = django_filters.BooleanFilter(method='filter_has_discount')
    category = CategoryFilter(lookup_model=Category)
    brand = BrandFilter(lookup_model=Brand)

    class Meta:
        model = Product
        fields = ['category', 'brand', 'tags', 'is_featured', 'status']

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gt=0)
        return queryset.filter(stock=0)

    def filter_has_discount(self, queryset, name, value):
        if value:
            return queryset.filter(compare_price__isnull=False, compare_price__gt=0)
        return queryset
