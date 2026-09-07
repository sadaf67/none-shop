from django.urls import path

from . import views

urlpatterns = [
    path('admin/logs/', views.AdminSmsLogListView.as_view(), name='admin-sms-logs'),
    path('admin/send/', views.admin_send_sms, name='admin-sms-send'),
    path('admin/stats/', views.admin_sms_stats, name='admin-sms-stats'),
]
