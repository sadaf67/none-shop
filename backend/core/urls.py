from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

admin_router = DefaultRouter()
admin_router.register('banners', views.AdminBannerViewSet, basename='admin-banner')
admin_router.register('pages', views.AdminPageViewSet, basename='admin-page')
admin_router.register('faqs', views.AdminFAQViewSet, basename='admin-faq')
admin_router.register('messages', views.AdminContactMessageViewSet, basename='admin-message')

urlpatterns = [
    path('settings/', views.PublicSettingsView.as_view(), name='public-settings'),
    path('faqs/', views.FAQListView.as_view(), name='faq-list'),
    path('contact/', views.ContactMessageCreateView.as_view(), name='contact-create'),
    path('newsletter/', views.NewsletterCreateView.as_view(), name='newsletter-create'),
    path('pages/<str:slug>/', views.PageDetailView.as_view(), name='page-detail'),
    path('admin/settings/', views.AdminSettingsView.as_view(), name='admin-settings'),
    path('admin/newsletter/', views.admin_newsletter_list, name='admin-newsletter'),
    path('admin/', include(admin_router.urls)),
]
