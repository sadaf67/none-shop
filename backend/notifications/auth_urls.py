from django.urls import path

from . import views

urlpatterns = [
    path('otp/request/', views.request_otp, name='otp-request'),
    path('otp/verify/', views.verify_otp_login, name='otp-verify'),
]
