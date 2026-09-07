from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'status', 'amount', 'gateway', 'ref_id', 'created_at')
    list_filter = ('status', 'gateway', 'created_at')
    search_fields = ('id', 'order__order_number', 'authority', 'ref_id', 'user__username')
    readonly_fields = (
        'id', 'order', 'user', 'amount', 'status', 'gateway', 'authority',
        'ref_id', 'card_pan', 'created_at', 'updated_at',
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
