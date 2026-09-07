from django.contrib import admin

from .models import OtpCode, SmsLog


@admin.register(SmsLog)
class SmsLogAdmin(admin.ModelAdmin):
    list_display = ('phone', 'kind', 'provider', 'status', 'created_at')
    list_filter = ('status', 'kind', 'provider')
    search_fields = ('phone', 'message')
    readonly_fields = tuple(field.name for field in SmsLog._meta.fields)


@admin.register(OtpCode)
class OtpCodeAdmin(admin.ModelAdmin):
    list_display = ('phone', 'purpose', 'attempts', 'is_used', 'expires_at', 'created_at')
    list_filter = ('purpose', 'is_used')
    search_fields = ('phone',)
    readonly_fields = tuple(field.name for field in OtpCode._meta.fields)
