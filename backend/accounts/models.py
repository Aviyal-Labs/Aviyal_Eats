import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):

    class Role(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        OWNER = "OWNER", "Restaurant Owner"
        STAFF = "STAFF", "Restaurant Staff"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    email = models.EmailField(max_length=254, unique=True)

    mobile = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        validators=[
            RegexValidator(
                regex=r"^\+[1-9]\d{7,14}$",
                message="Use E.164 format, e.g. +919876543210.",
            )
        ],
    )

    full_name = models.CharField(max_length=150)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.OWNER,
        db_index=True,
    )

    email_verified_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    date_joined = models.DateTimeField(
        default=timezone.now,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "accounts_user"
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                name="unique_user_email_case_insensitive",
            ),
        ]

    def save(self, *args, **kwargs):
        self.email = User.objects.normalize_email_address(self.email)
        self.mobile = User.objects.normalize_mobile(self.mobile)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name or self.email} ({self.role})"

    @property
    def is_super_admin(self):
        return self.role == self.Role.SUPER_ADMIN

    @property
    def is_owner(self):
        return self.role == self.Role.OWNER

    @property
    def is_restaurant_staff(self):
        return self.role == self.Role.STAFF
