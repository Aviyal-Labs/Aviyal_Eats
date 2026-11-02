import secrets
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError
from django.contrib.auth.hashers import check_password
from django.db import IntegrityError, transaction
from accounts.models import EmailOTP, PendingRegistration, User
from restaurants.models import Restaurant


class RegistrationConflict(APIException):
    status_code = 409
    default_detail = "Registration details are already in use."
    default_code = "REGISTRATION_CONFLICT"


class OTPResendCooldown(APIException):
    status_code = 429
    default_detail = "Please wait before requesting another OTP."
    default_code = "OTP_RESEND_COOLDOWN"


class OTPDeliveryError(APIException):
    status_code = 503
    default_detail = "Unable to send verification email. Please retry."
    default_code = "OTP_DELIVERY_FAILED"


# ---------------------------------------
# Create Pending Registration
# ---------------------------------------
def create_pending_registration(validated_data):
    """
    Store registration details and email a six-digit OTP.

    User and Restaurant are NOT created here.
    """

    now = timezone.now()
    email = validated_data["email"].strip().lower()
    mobile = validated_data["mobile"]
    slug = validated_data["slug"].lower()

    if User.objects.filter(email__iexact=email).exists():
        raise RegistrationConflict()

    if User.objects.filter(mobile=mobile).exists():
        raise RegistrationConflict()

    if Restaurant.objects.filter(slug__iexact=slug).exists():
        raise RegistrationConflict()

    with transaction.atomic():
        pending = (
            PendingRegistration.objects.select_for_update()
            .filter(email__iexact=email)
            .first()
        )

        if pending:
            if pending.expires_at <= now:
                raise RegistrationConflict(
                    "This registration has expired. Please start again."
                )

            if EmailOTP.objects.filter(
                pending_registration=pending,
                purpose=EmailOTP.Purpose.REGISTRATION,
                invalidated_at__isnull=True,
                consumed_at__isnull=True,
                last_sent_at__gt=now - timedelta(seconds=60),
            ).exists():
                raise OTPResendCooldown()

        if (
            PendingRegistration.objects.filter(mobile=mobile)
            .exclude(email__iexact=email)
            .exists()
        ):
            raise RegistrationConflict()

        password_hash = make_password(validated_data["password"])

        try:
            if pending is None:
                pending = PendingRegistration(
                    email=email,
                    expires_at=now + timedelta(hours=24),
                )

            pending.mobile = mobile
            pending.owner_full_name = validated_data["owner_full_name"]
            pending.password_hash = password_hash
            pending.restaurant_name = validated_data["restaurant_name"]
            pending.restaurant_phone = validated_data["restaurant_phone"]
            pending.city = validated_data["city"]
            pending.requested_slug = slug

            pending.save()

        except IntegrityError as exc:
            raise RegistrationConflict() from exc

        EmailOTP.objects.filter(
            pending_registration=pending,
            purpose=EmailOTP.Purpose.REGISTRATION,
            consumed_at__isnull=True,
            invalidated_at__isnull=True,
        ).update(invalidated_at=now)

        otp = f"{secrets.randbelow(1_000_000):06d}"

        EmailOTP.objects.create(
            purpose=EmailOTP.Purpose.REGISTRATION,
            pending_registration=pending,
            otp_hash=make_password(otp),
            expires_at=now + timedelta(minutes=5),
            last_sent_at=now,
        )

        try:
            send_mail(
                subject="Aviyal Eats - Verify your email",
                message=(
                    f"Your verification code is {otp}.\n\n"
                    "This code expires in 5 minutes.\n"
                    "Do not share it with anyone."
                ),
                from_email=None,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as exc:
            raise OTPDeliveryError() from exc

    return {
        "verification_required": True,
        "otp_expires_in_seconds": 300,
        "resend_after_seconds": 60,
    }


class OTPVerificationError(APIException):
    status_code = 400
    default_detail = "Invalid verification code."
    default_code = "INVALID_OTP"


class OTPExpiredError(APIException):
    status_code = 410
    default_detail = "Verification code has expired."
    default_code = "OTP_EXPIRED"


# --------------------------------------------------
# Verify Registration Otp and register Restaurant
# --------------------------------------------------
def verify_registration_otp(email, otp):
    """
    Verify a registration OTP and atomically create
    an OWNER User and PENDING Restaurant.

    Invalid attempts are persisted before raising errors.
    """

    email = email.strip().lower()
    now = timezone.now()

    error = None
    result = None

    try:
        with transaction.atomic():
            # Lock the pending registration first so parallel
            # verification requests cannot create duplicate users.
            pending = (
                PendingRegistration.objects.select_for_update()
                .filter(email__iexact=email)
                .first()
            )

            if pending is None:
                error = OTPVerificationError(
                    "Invalid registration or verification code."
                )

            elif pending.expires_at <= now:
                error = OTPExpiredError(
                    "Registration has expired. Please register again."
                )

            else:
                otp_record = (
                    EmailOTP.objects.select_for_update()
                    .filter(
                        pending_registration=pending,
                        purpose=EmailOTP.Purpose.REGISTRATION,
                        consumed_at__isnull=True,
                        invalidated_at__isnull=True,
                    )
                    .order_by("-created_at", "-id")
                    .first()
                )

                if otp_record is None:
                    error = OTPVerificationError(
                        "No active verification code was found."
                    )

                elif otp_record.expires_at <= now:
                    error = OTPExpiredError()

                elif otp_record.attempt_count >= 5:
                    otp_record.invalidated_at = now
                    otp_record.save(update_fields=["invalidated_at"])
                    error = OTPVerificationError(
                        "Too many incorrect attempts. Request a new code."
                    )

                elif not check_password(otp, otp_record.otp_hash):
                    otp_record.attempt_count += 1

                    fields_to_update = ["attempt_count"]

                    if otp_record.attempt_count >= 5:
                        otp_record.invalidated_at = now
                        fields_to_update.append("invalidated_at")

                    otp_record.save(update_fields=fields_to_update)

                    error = OTPVerificationError("Invalid verification code.")

                else:
                    # Recheck uniqueness at verification time.
                    # Availability may have changed since registration.
                    if (
                        User.objects.filter(email__iexact=pending.email).exists()
                        or User.objects.filter(mobile=pending.mobile).exists()
                        or Restaurant.objects.filter(
                            slug__iexact=pending.requested_slug
                        ).exists()
                    ):
                        error = RegistrationConflict(
                            "Registration details are no longer available."
                        )

                    else:
                        # Password is already hashed.
                        # Never pass this hash into create_user(),
                        # as that would hash it a second time.
                        user = User(
                            email=pending.email,
                            mobile=pending.mobile,
                            full_name=pending.owner_full_name,
                            role=User.Role.OWNER,
                            email_verified_at=now,
                        )

                        user.password = pending.password_hash
                        user.full_clean()
                        user.save()

                        restaurant = Restaurant.objects.create(
                            owner=user,
                            name=pending.restaurant_name,
                            phone=pending.restaurant_phone,
                            city=pending.city,
                            slug=pending.requested_slug,
                            status=Restaurant.Status.PENDING,
                        )

                        otp_record.verified_at = now
                        otp_record.consumed_at = now
                        otp_record.save(
                            update_fields=[
                                "verified_at",
                                "consumed_at",
                            ]
                        )

                        result = {
                            "restaurant": {
                                "id": str(restaurant.id),
                                "name": restaurant.name,
                                "slug": restaurant.slug,
                                "status": restaurant.status,
                            }
                        }

                        # Removes temporary registration data.
                        # Its OTP records are cascade-deleted.
                        pending.delete()

    except IntegrityError as exc:
        raise RegistrationConflict(
            "Registration details are no longer available."
        ) from exc

    # Raise AFTER transaction.atomic().
    # Otherwise failed-attempt increments would roll back.
    if error is not None:
        raise error

    return result


# --------------------------------------------------
#   Resend Registration Otp
# --------------------------------------------------
def resend_registration_otp(email):
    """
    Resend a registration OTP without modifying
    the pending registration's original 24-hour expiry.

    Return a generic acknowledgement for unknown emails,
    expired registrations, and cooldown requests.
    """
    email = email.strip().lower()
    now = timezone.now()

    response = {
        "verification_required": True,
        "otp_expires_in_seconds": 300,
        "resend_after_seconds": 60,
    }

    with transaction.atomic():
        pending = (
            PendingRegistration.objects.select_for_update()
            .filter(email__iexact=email)
            .first()
        )

        if pending is None or pending.expires_at <= now:
            return response

        latest_otp = (
            EmailOTP.objects.filter(
                pending_registration=pending,
                purpose=EmailOTP.Purpose.REGISTRATION,
            )
            .order_by("-last_sent_at", "-created_at")
            .first()
        )

        if latest_otp is not None and latest_otp.last_sent_at > now - timedelta(
            seconds=60
        ):
            return response

        otp = f"{secrets.randbelow(1_000_000):06d}"

        EmailOTP.objects.filter(
            pending_registration=pending,
            purpose=EmailOTP.Purpose.REGISTRATION,
            consumed_at__isnull=True,
            invalidated_at__isnull=True,
        ).update(invalidated_at=now)

        EmailOTP.objects.create(
            purpose=EmailOTP.Purpose.REGISTRATION,
            pending_registration=pending,
            otp_hash=make_password(otp),
            expires_at=now + timedelta(minutes=5),
            last_sent_at=now,
        )

        try:
            send_mail(
                subject="Aviyal Eats - New verification code",
                message=(
                    f"Your new verification code is {otp}.\n\n"
                    "This code expires in 5 minutes.\n"
                    "Do not share it with anyone."
                ),
                from_email=None,
                recipient_list=[pending.email],
                fail_silently=False,
            )
        except Exception as exc:
            raise OTPDeliveryError() from exc

    return response
