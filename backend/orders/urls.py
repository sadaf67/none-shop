from django.urls import path
from . import views

urlpatterns = [
    path('cart/', views.CartView.as_view(), name='cart'),
    path('cart/add/', views.add_to_cart, name='cart-add'),
    path('cart/items/<int:item_id>/', views.update_cart_item, name='cart-item-update'),
    path('cart/items/<int:item_id>/remove/', views.remove_from_cart, name='cart-item-remove'),
    path('cart/clear/', views.clear_cart, name='cart-clear'),
    path('', views.OrderListView.as_view(), name='order-list'),
    path('create/', views.create_order, name='order-create'),
    path('<uuid:pk>/', views.OrderDetailView.as_view(), name='order-detail'),
    # Admin
    path('admin/all/', views.AdminOrderListView.as_view(), name='admin-order-list'),
    path('admin/<uuid:order_id>/status/', views.admin_update_order_status, name='admin-order-status'),
    path('admin/report/', views.sales_report, name='sales-report'),
]
