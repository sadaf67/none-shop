from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from .views import health

urlpatterns = [
    path(settings.DJANGO_ADMIN_PATH, admin.site.urls),
    path('health/', health, name='health'),
    path('api/core/', include('core.urls')),
    path('api/auth/', include('users.urls')),
    path('api/auth/', include('notifications.auth_urls')),
    path('api/sms/', include('notifications.urls')),
    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/discounts/', include('discounts.urls')),
    path('', include('feeds.urls')),
]

if settings.ENABLE_API_DOCS:
    urlpatterns += [
        path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
