from rest_framework.exceptions import APIException, PermissionDenied

from .google_auth import verify_google_credential
from .models import GoogleIdentity, User
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from restaurants.models import Restaurant


class GoogleAccountNotRegistered(APIException):
    status_code = 404
    default_detail = (
        "Google account is not registered. " "Please complete restaurant signup."
    )
    default_code = "GOOGLE_ACCOUNT_NOT_REGISTERED"


def authenticate_google_owner(credential):
    """
    Authenticate an existing linked Google account.
    Never look up or link users by email alone.
    """
    google_user = verify_google_credential(credential)

    identity = (
        GoogleIdentity.objects.select_related("user")
        .filter(google_sub=google_user.google_sub)
        .first()
    )

    if identity is None:
        raise GoogleAccountNotRegistered()

    user = identity.user

    if not user.is_active or user.role != User.Role.OWNER:
        raise PermissionDenied("This Google account cannot access owner login.")

    return user





class GoogleSignupConflict(APIException):
    status_code = 409
    default_detail = (
        "An account or restaurant with these details "
        "already exists."
    )
    default_code = "GOOGLE_SIGNUP_CONFLICT"



#-----------------------------------------
#         REGISTER GOOGLE USER
#-----------------------------------------
def register_google_owner(validated_data):
    """
    Atomically create:
    - Google-authenticated owner
    - GoogleIdentity
    - PENDING restaurant
    """
    google_user = verify_google_credential(
        validated_data["credential"]
    )

    if not google_user.email_authoritative:
        raise ValidationError({
            "credential": [
                "Additional email verification is required "
                "for this Google account."
            ]
        })

    try:
        with transaction.atomic():
            # The unique DB constraints protect against races.
            if GoogleIdentity.objects.filter(
                google_sub=google_user.google_sub
            ).exists():
                raise GoogleSignupConflict()

            if User.objects.filter(
                email__iexact=google_user.email
            ).exists():
                # Never silently link an existing password account.
                raise GoogleSignupConflict()

            if User.objects.filter(
                mobile=validated_data["mobile"]
            ).exists():
                raise GoogleSignupConflict()

            if Restaurant.objects.filter(
                slug=validated_data["requested_slug"]
            ).exists():
                raise GoogleSignupConflict()

            owner = User.objects.create_google_user(
                email=google_user.email,
                full_name=(
                    google_user.full_name
                    or google_user.email.split("@")[0]
                ),
                mobile=validated_data["mobile"],
                email_verified_at=timezone.now(),
            )

            GoogleIdentity.objects.create(
                user=owner,
                google_sub=google_user.google_sub,
                google_email=google_user.email,
            )

            restaurant = Restaurant.objects.create(
                owner=owner,
                name=validated_data["restaurant_name"],
                phone=validated_data["restaurant_phone"],
                city=validated_data["city"],
                slug=validated_data["requested_slug"],
                status=Restaurant.Status.PENDING,
            )

            return owner, restaurant

    except IntegrityError as exc:
        # Handles concurrent duplicate submissions.
        raise GoogleSignupConflict() from exc
