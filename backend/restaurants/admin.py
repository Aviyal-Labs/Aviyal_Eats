from django.contrib import admin

from .models import Restaurant


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "slug",
        "owner",
        "city",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "city",
    )

    search_fields = (
        "name",
        "slug",
        "owner__email",
        "owner__full_name",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "approved_at",
        "approved_by",
        "status",
        "rejection_reason",
    )
