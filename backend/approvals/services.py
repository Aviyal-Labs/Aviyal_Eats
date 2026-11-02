from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.exceptions import ValidationError

from accounts.models import User
from restaurants.models import Restaurant

from .models import ApprovalAuditLog


class InvalidStatusTransition(APIException):
    status_code = 409
    default_detail = "Restaurant status has already changed."
    default_code = "INVALID_STATUS_TRANSITION"


def require_super_admin(actor):
    if (
        not actor.is_authenticated
        or not actor.is_active
        or actor.role != User.Role.SUPER_ADMIN
        or not actor.is_staff
        or not actor.is_superuser
    ):
        raise PermissionDenied("Only Super Admins can perform this action.")


@transaction.atomic
def approve_restaurant(restaurant_id, actor):
    require_super_admin(actor)

    restaurant = Restaurant.objects.select_for_update().get(pk=restaurant_id)

    if restaurant.status != Restaurant.Status.PENDING:
        raise InvalidStatusTransition()

    now = timezone.now()

    restaurant.status = Restaurant.Status.APPROVED
    restaurant.approved_at = now
    restaurant.approved_by = actor
    restaurant.rejection_reason = ""

    restaurant.save(
        update_fields=[
            "status",
            "approved_at",
            "approved_by",
            "rejection_reason",
            "updated_at",
        ]
    )

    ApprovalAuditLog.objects.create(
        restaurant=restaurant,
        actor=actor,
        action=ApprovalAuditLog.Action.APPROVED,
        previous_status=Restaurant.Status.PENDING,
        new_status=Restaurant.Status.APPROVED,
        reason="",
    )

    return restaurant


@transaction.atomic
def reject_restaurant(restaurant_id, actor, reason):
    require_super_admin(actor)

    reason = reason.strip() if isinstance(reason, str) else ""

    if not reason:
        raise ValidationError({"reason": ["A rejection reason is required."]})

    restaurant = Restaurant.objects.select_for_update().get(pk=restaurant_id)

    if restaurant.status != Restaurant.Status.PENDING:
        raise InvalidStatusTransition()

    restaurant.status = Restaurant.Status.REJECTED
    restaurant.rejection_reason = reason
    restaurant.approved_at = None
    restaurant.approved_by = None

    restaurant.save(
        update_fields=[
            "status",
            "rejection_reason",
            "approved_at",
            "approved_by",
            "updated_at",
        ]
    )

    ApprovalAuditLog.objects.create(
        restaurant=restaurant,
        actor=actor,
        action=ApprovalAuditLog.Action.REJECTED,
        previous_status=Restaurant.Status.PENDING,
        new_status=Restaurant.Status.REJECTED,
        reason=reason,
    )

    return restaurant
