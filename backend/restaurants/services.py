from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import APIException, PermissionDenied

from accounts.models import User
from approvals.models import ApprovalAuditLog

from .models import Restaurant


class RestaurantNotEditable(APIException):
    status_code = 409
    default_detail = "Only rejected restaurants can be edited or resubmitted."
    default_code = "RESTAURANT_NOT_EDITABLE"


def require_owner(user):
    if not user.is_authenticated or not user.is_active or user.role != User.Role.OWNER:
        raise PermissionDenied("Only restaurant owners can perform this action.")


@transaction.atomic
def update_rejected_restaurant(owner, validated_data):
    require_owner(owner)

    restaurant = get_object_or_404(
        Restaurant.objects.select_for_update(),
        owner=owner,
    )

    if restaurant.status != Restaurant.Status.REJECTED:
        raise RestaurantNotEditable()

    for field, value in validated_data.items():
        setattr(restaurant, field, value)

    restaurant.save(update_fields=[*validated_data.keys(), "updated_at"])

    return restaurant


@transaction.atomic
def resubmit_rejected_restaurant(owner):
    require_owner(owner)

    restaurant = get_object_or_404(
        Restaurant.objects.select_for_update(),
        owner=owner,
    )

    if restaurant.status != Restaurant.Status.REJECTED:
        raise RestaurantNotEditable()

    old_status = restaurant.status

    restaurant.status = Restaurant.Status.PENDING
    restaurant.rejection_reason = ""
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
        actor=owner,
        action=ApprovalAuditLog.Action.RESUBMITTED,
        previous_status=old_status,
        new_status=Restaurant.Status.PENDING,
        reason="",
    )

    return restaurant
