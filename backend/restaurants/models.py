import uuid

from django.conf import settings
from django.db import models
from django.core.validators import RegexValidator


class Restaurant(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="restaurant",
    )

    name = models.CharField(max_length=200)

    phone = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex=r"^\+[1-9]\d{7,14}$",
                message="Use international E.164 phone format.",
            )
        ],
    )

    city = models.CharField(max_length=100)

    slug = models.SlugField(
        max_length=100,
        unique=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    rejection_reason = models.TextField(blank=True)

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="approved_restaurants",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurants_restaurant"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(
                fields=["status", "created_at"],
                name="restaurant_status_created_idx",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.status})"
