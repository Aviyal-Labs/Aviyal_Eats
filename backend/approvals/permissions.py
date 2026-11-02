from rest_framework.permissions import BasePermission
from accounts.models import User

class IsSuperAdmin(BasePermission):
    message = "Only Super Admins can perform this action."

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.role == User.Role.SUPER_ADMIN
            and user.is_staff
            and user.is_superuser
        )
