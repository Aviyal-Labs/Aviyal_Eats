from django.contrib import admin

from .models import ApprovalAuditLog


@admin.register(ApprovalAuditLog)
class ApprovalAuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "restaurant",
        "actor",
        "action",
        "previous_status",
        "new_status",
        "created_at",
    )

    list_filter = ("action", "created_at")

    search_fields = (
        "restaurant__name",
        "actor__email",
    )

    readonly_fields = (
        "id",
        "restaurant",
        "actor",
        "action",
        "previous_status",
        "new_status",
        "reason",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
