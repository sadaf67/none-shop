from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_views, views

router = DefaultRouter()
router.register('', views.ProductViewSet, basename='product')

admin_router = DefaultRouter()
admin_router.register('products', admin_views.AdminProductViewSet, basename='admin-product')
admin_router.register('categories-crud', admin_views.AdminCategoryViewSet, basename='admin-category-crud')
admin_router.register('brands', admin_views.AdminBrandViewSet, basename='admin-brand')
admin_router.register('tags', admin_views.AdminTagViewSet, basename='admin-tag')
admin_router.register('images', admin_views.AdminProductImageViewSet, basename='admin-product-image')
admin_router.register('variants', admin_views.AdminProductVariantViewSet, basename='admin-product-variant')

urlpatterns = [
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('brands/', views.BrandListView.as_view(), name='brand-list'),
    path('wishlist/', views.WishlistView.as_view(), name='wishlist'),
    path('wishlist/<int:pk>/', views.WishlistDetailView.as_view(), name='wishlist-detail'),
    # پنل مدیر
    path('admin/all/', views.admin_product_list, name='admin-product-list'),
    path('admin/categories/', views.admin_category_list, name='admin-category-list'),
    path('admin/reorder-products/', views.reorder_products, name='reorder-products'),
    path('admin/reorder-categories/', views.reorder_categories, name='reorder-categories'),
    path('admin/stats/', admin_views.admin_catalog_stats, name='admin-catalog-stats'),
    path('admin/', include(admin_router.urls)),
    path('', include(router.urls)),
]
