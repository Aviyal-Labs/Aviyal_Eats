import uuid

from django.conf import settings
from django.db import models

from restaurants.models import Restaurant


class ApprovalAuditLog(models.Model):

    class Action(models.TextChoices):
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        RESUBMITTED = "RESUBMITTED", "Resubmitted"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT,
        related_name="approval_history",
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="approval_actions",
    )

    action = models.CharField(
        max_length=20,
        choices=Action.choices,
    )

    previous_status = models.CharField(
        max_length=20,
        choices=Restaurant.Status.choices,
    )

    new_status = models.CharField(
        max_length=20,
        choices=Restaurant.Status.choices,
    )

    reason = models.TextField(blank=True)

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        db_table = "approvals_audit_log"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=["restaurant", "created_at"],
                name="approval_rest_date_idx",
            ),
        ]

    def __str__(self):
        return f"{self.action} - {self.restaurant.name}"
