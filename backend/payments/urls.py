from django.urls import path
from . import views

urlpatterns = [
    path('config/', views.payment_config, name='payment-config'),
    path('<uuid:order_id>/request/', views.payment_request, name='payment-request'),
    path('verify/', views.payment_verify, name='payment-verify'),
]
