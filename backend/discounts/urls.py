from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import admin_views, views

admin_router = DefaultRouter()
admin_router.register('coupons', admin_views.AdminCouponViewSet, basename='admin-coupon')

urlpatterns = [
    path('validate/', views.validate_coupon, name='coupon-validate'),
    path('admin/', include(admin_router.urls)),
]
