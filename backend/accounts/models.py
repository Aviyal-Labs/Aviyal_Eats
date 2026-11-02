import uuid
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from .managers import UserManager


# ---------------------------
#       USER MODEL
# --------------------------


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


# -------------------------------------
#       PENDING REGISTRATION MODEL
# -------------------------------------

class PendingRegistration(models.Model):
    """Temporary owner registration before email verification."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    email = models.EmailField(max_length=254)

    mobile = models.CharField(max_length=20)

    owner_full_name = models.CharField(max_length=150)

    password_hash = models.CharField(max_length=128)

    restaurant_name = models.CharField(max_length=200)

    restaurant_phone = models.CharField(max_length=20)

    city = models.CharField(max_length=100)

    requested_slug = models.SlugField(max_length=100)

    expires_at = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_pending_registration"
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                name="unique_pen_reg_email_ci",
            ),
        ]
        indexes = [
            models.Index(
                fields=["expires_at"],
                name="pending_reg_expiry_idx",
            ),
        ]

    def __str__(self):
        return self.email


# -------------------------------------
#       EMAIL OTP MODEL
# -------------------------------------
class EmailOTP(models.Model):
    """Single-use email verification code metadata."""

    class Purpose(models.TextChoices):
        REGISTRATION = "REGISTRATION", "Registration"
        PASSWORD_RESET = "PASSWORD_RESET", "Password Reset"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    purpose = models.CharField(
        max_length=20,
        choices=Purpose.choices,
    )

    pending_registration = models.ForeignKey(
        "accounts.PendingRegistration",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="otps",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="email_otps",
    )

    otp_hash = models.CharField(max_length=255)

    expires_at = models.DateTimeField()

    attempt_count = models.PositiveSmallIntegerField(default=0)

    verified_at = models.DateTimeField(null=True, blank=True)
    consumed_at = models.DateTimeField(null=True, blank=True)
    invalidated_at = models.DateTimeField(null=True, blank=True)

    last_sent_at = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_email_otp"
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(
                        purpose="REGISTRATION",
                        pending_registration__isnull=False,
                        user__isnull=True,
                    )
                    | models.Q(
                        purpose="PASSWORD_RESET",
                        pending_registration__isnull=True,
                        user__isnull=False,
                    )
                ),
                name="email_otp_correct_target",
            ),
        ]
        indexes = [
            models.Index(
                fields=["purpose", "expires_at"],
                name="email_otp_purpose_expiry_idx",
            ),
        ]

    def __str__(self):
        return f"{self.purpose} OTP"


# -------------------------------------
#       Auth Session Model
# -------------------------------------
class AuthSession(models.Model):
    """Tracks refresh token sessions for each user."""

    class RevocationReason(models.TextChoices):
        LOGOUT = "LOGOUT", "Logout"
        LOGOUT_ALL = "LOGOUT_ALL", "Logout All Devices"
        PASSWORD_RESET = "PASSWORD_RESET", "Password Reset"
        ROTATION_COMPROMISE = (
            "ROTATION_COMPROMISE",
            "Refresh Token Replay",
        )

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="auth_sessions",
    )

    refresh_token_hash = models.CharField(
        max_length=255,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    expires_at = models.DateTimeField()

    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    revocation_reason = models.CharField(
        max_length=30,
        choices=RevocationReason.choices,
        blank=True,
    )

    class Meta:
        db_table = "accounts_auth_session"

        indexes = [
            models.Index(
                fields=["user", "revoked_at"],
                name="auth_session_user_rev_idx",
            ),
            models.Index(
                fields=["expires_at"],
                name="auth_session_expiry_idx",
            ),
        ]

    def __str__(self):
        return f"Session {self.id} - {self.user.email}"

    @property
    def is_active(self):
        now = timezone.now()

        return self.revoked_at is None and self.expires_at > now

    def revoke(self, reason=RevocationReason.LOGOUT):
        if self.revoked_at is not None:
            return

        self.revoked_at = timezone.now()
        self.revocation_reason = reason

        self.save(
            update_fields=[
                "revoked_at",
                "revocation_reason",
                "updated_at",
            ]
        )



# -------------------------------------
#       Login Throttle Model
# -------------------------------------
class LoginThrottle(models.Model):
    """Persistent counters for login security."""

    class Scope(models.TextChoices):
        ACCOUNT = "ACCOUNT", "Account"
        IP = "IP", "IP Address"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    scope = models.CharField(
        max_length=10,
        choices=Scope.choices,
    )

    # HMAC digest, not a raw email or IP address.
    identifier = models.CharField(max_length=64)

    attempt_count = models.PositiveIntegerField(default=0)

    window_started_at = models.DateTimeField(
        default=timezone.now,
    )

    locked_until = models.DateTimeField(
        null=True,
        blank=True,
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_login_throttle"
        constraints = [
            models.UniqueConstraint(
                fields=["scope", "identifier"],
                name="unique_login_throttle_key",
            ),
        ]

    def __str__(self):
        return f"{self.scope} throttle"
