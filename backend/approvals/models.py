import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
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


# EMAIL NOTIFICATION MODEL
class EmailNotification(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"

    class Event(models.TextChoices):
        RESTAURANT_APPROVED = ("RESTAURANT_APPROVED", "Restaurant Approved")
        RESTAURANT_REJECTED = ("RESTAURANT_REJECTED", "Restaurant Rejected")
        RESTAURANT_RESUBMITTED = ("RESTAURANT_RESUBMITTED", "Restaurant Resubmitted")

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT,
        related_name="email_notifications",
    )

    event = models.CharField(
        max_length=40,
        choices=Event.choices,
    )

    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    body = models.TextField()

    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.PENDING,
    )

    attempt_count = models.PositiveIntegerField(default=0)

    next_attempt_at = models.DateTimeField(
        default=timezone.now,
    )

    processing_started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    sent_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    last_error = models.CharField(
        max_length=500,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "approvals_email_notification"
        ordering = ["created_at"]
        indexes = [
            models.Index(
                fields=["status", "next_attempt_at"],
                name="email_queue_status_idx",
            ),
        ]

    def __str__(self):
        return f"{self.event} - {self.status}"
