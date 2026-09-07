from django.contrib import admin

from .models import Review, ReviewHelpful


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'rating', 'is_approved', 'is_verified_purchase', 'created_at')
    list_filter = ('is_approved', 'is_verified_purchase', 'rating', 'created_at')
    search_fields = ('product__name', 'user__username', 'title', 'body')
    list_editable = ('is_approved',)
    readonly_fields = ('helpful_count', 'created_at')


@admin.register(ReviewHelpful)
class ReviewHelpfulAdmin(admin.ModelAdmin):
    list_display = ('review', 'user')
    search_fields = ('review__product__name', 'user__username')
