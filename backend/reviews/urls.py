from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import admin_views, views

admin_router = DefaultRouter()
admin_router.register('reviews', admin_views.AdminReviewViewSet, basename='admin-review')

urlpatterns = [
    path('products/<slug:product_slug>/reviews/', views.ProductReviewsView.as_view(), name='product-reviews'),
    path('create/', views.CreateReviewView.as_view(), name='review-create'),
    path('<int:review_id>/helpful/', views.mark_helpful, name='review-helpful'),
    path('admin/stats/', admin_views.admin_review_stats, name='admin-review-stats'),
    path('admin/', include(admin_router.urls)),
]
