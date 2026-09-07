from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import admin_views, views

admin_router = DefaultRouter()
admin_router.register('customers', admin_views.AdminCustomerViewSet, basename='admin-customer')

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('token/refresh/', views.ThrottledTokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('change-password/', views.change_password, name='change-password'),
    path('addresses/', views.AddressListCreateView.as_view(), name='address-list'),
    path('addresses/<int:pk>/', views.AddressDetailView.as_view(), name='address-detail'),
    # Admin user management
    path('admins/', views.AdminUserListView.as_view(), name='admin-list'),
    path('admins/create/', views.admin_create_user, name='admin-create'),
    path('admins/<int:user_id>/delete/', views.admin_delete_user, name='admin-delete'),
    # Admin customer management
    path('admin/customers/stats/', admin_views.admin_customer_stats, name='admin-customer-stats'),
    path('admin/', include(admin_router.urls)),
]
