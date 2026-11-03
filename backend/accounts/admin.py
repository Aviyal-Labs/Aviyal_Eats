from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import AuthSession
from .models import User
from .models import GoogleIdentity

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User

    list_display = (
        "email",
        "full_name",
        "mobile",
        "role",
        "is_active",
        "is_staff",
    )

    list_filter = (
        "role",
        "is_active",
        "is_staff",
        "is_superuser",
    )

    search_fields = (
        "email",
        "full_name",
        "mobile",
    )

    ordering = ("email",)
    readonly_fields = ("last_login", "date_joined")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal Information",
            {"fields": ("full_name", "mobile")},
        ),
        (
            "Aviyal Eats",
            {"fields": ("role", "email_verified_at")},
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (
            "Important Dates",
            {"fields": ("last_login", "date_joined")},
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "full_name",
                    "mobile",
                    "role",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )

    filter_horizontal = ("groups", "user_permissions")


@admin.register(AuthSession)
class AuthSessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "created_at",
        "expires_at",
        "revoked_at",
    )

    list_filter = ("created_at", "revoked_at")

    search_fields = ("user__email",)

    readonly_fields = (
        "id",
        "user",
        "refresh_token_hash",
        "created_at",
        "updated_at",
        "last_used_at",
        "expires_at",
        "revoked_at",
        "revocation_reason",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(GoogleIdentity)
class GoogleIdentityAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "google_email",
        "created_at",
    )

    search_fields = (
        "user__email",
        "google_email",
    )

    readonly_fields = (
        "user",
        "google_sub",
        "google_email",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
