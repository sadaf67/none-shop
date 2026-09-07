from django.utils import timezone
from django.db.models import Q
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import Banner, ContactMessage, FAQ, NewsletterSubscriber, Page, SiteSettings
from .serializers import (
    AdminContactMessageSerializer,
    AdminSettingsSerializer,
    BannerSerializer,
    ContactMessageSerializer,
    FAQSerializer,
    NewsletterSerializer,
    PageSerializer,
    PageSummarySerializer,
    PublicSettingsSerializer,
)


class PublicSettingsView(generics.RetrieveAPIView):
    """همه چیزهایی که فرانت‌اند برای رندر داینامیک لازم دارد، در یک درخواست."""

    serializer_class = PublicSettingsSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        return SiteSettings.load()

    def retrieve(self, request, *args, **kwargs):
        settings_obj = self.get_object()
        now = timezone.now()
        live_banners = Banner.objects.filter(
            is_active=True,
        ).filter(
            Q(starts_at__isnull=True) | Q(starts_at__lte=now),
        ).filter(
            Q(ends_at__isnull=True) | Q(ends_at__gte=now),
        )
        footer_pages = Page.objects.filter(is_active=True, show_in_footer=True)
        return Response({
            'settings': PublicSettingsSerializer(settings_obj, context={'request': request}).data,
            'banners': BannerSerializer(live_banners, many=True, context={'request': request}).data,
            'footer_pages': PageSummarySerializer(footer_pages, many=True).data,
        })


class PageDetailView(generics.RetrieveAPIView):
    serializer_class = PageSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'
    queryset = Page.objects.filter(is_active=True)


class FAQListView(generics.ListAPIView):
    serializer_class = FAQSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    queryset = FAQ.objects.filter(is_active=True)


class ContactMessageCreateView(generics.CreateAPIView):
    serializer_class = ContactMessageSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'contact'


class NewsletterCreateView(generics.CreateAPIView):
    serializer_class = NewsletterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'contact'


# ─────────────────────────── پنل مدیر ───────────────────────────

class AdminSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = AdminSettingsSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return SiteSettings.load()


class AdminBannerViewSet(viewsets.ModelViewSet):
    queryset = Banner.objects.all()
    serializer_class = BannerSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None
    filterset_fields = ['position', 'is_active']


class AdminPageViewSet(viewsets.ModelViewSet):
    queryset = Page.objects.all()
    serializer_class = PageSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None
    lookup_field = 'slug'
    lookup_value_regex = '[^/]+'


class AdminFAQViewSet(viewsets.ModelViewSet):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None


class AdminContactMessageViewSet(viewsets.ModelViewSet):
    queryset = ContactMessage.objects.all()
    serializer_class = AdminContactMessageSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
    filterset_fields = ['is_read']


@extend_schema(responses={200: inline_serializer('AdminNewsletterSubscriber', {
    'id': serializers.IntegerField(),
    'email': serializers.EmailField(),
    'created_at': serializers.DateTimeField(),
}, many=True)})
@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_newsletter_list(request):
    subscribers = NewsletterSubscriber.objects.filter(is_active=True).values('id', 'email', 'created_at')
    return Response(list(subscribers))
