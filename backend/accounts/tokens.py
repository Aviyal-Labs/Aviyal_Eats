import hashlib
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from .models import AuthSession
import hmac
import uuid
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError


def token_digest(token):
    """Never store a plaintext refresh token in PostgreSQL."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@transaction.atomic
def create_login_session(user):
    now = timezone.now()

    session = AuthSession.objects.create(
        user=user,
        refresh_token_hash="",
        expires_at=now + timedelta(days=30),
    )

    refresh = RefreshToken.for_user(user)

    # Associate both JWTs with a server-side session.
    refresh["session_id"] = str(session.id)

    refresh["role"] = user.role

    access = refresh.access_token

    refresh_string = str(refresh)

    session.refresh_token_hash = token_digest(refresh_string)
    session.save(update_fields=["refresh_token_hash", "updated_at"])

    return {
        "access_token": str(access),
        "refresh_token": refresh_string,
        "access_expires_in": 1800,
    }





class RefreshAuthenticationError(AuthenticationFailed):
    default_detail = "Invalid or expired refresh session."
    default_code = "INVALID_REFRESH_SESSION"



#--------------------------------------
#        Rotate Refresh Token
#--------------------------------------
def rotate_refresh_token(raw_token):
    """
    Rotate a refresh token under a database row lock.

    Replay of a previously rotated token revokes the session.
    """
    if not raw_token:
        raise RefreshAuthenticationError()

    try:
        old_refresh = RefreshToken(raw_token)
        session_id = uuid.UUID(str(old_refresh["session_id"]))
        user_id = uuid.UUID(str(old_refresh["user_id"]))
    except (TokenError, KeyError, ValueError, TypeError) as exc:
        raise RefreshAuthenticationError() from exc

    now = timezone.now()
    error = None
    result = None

    with transaction.atomic():
        session = (
            AuthSession.objects.select_for_update()
            .select_related("user")
            .filter(id=session_id, user_id=user_id)
            .first()
        )

        if (
            session is None
            or session.revoked_at is not None
            or session.expires_at <= now
            or not session.user.is_active
        ):
            error = RefreshAuthenticationError()

        elif not hmac.compare_digest(
            session.refresh_token_hash,
            token_digest(raw_token),
        ):
            # Persist revocation even when the request fails.
            session.revoked_at = now
            session.revocation_reason = AuthSession.RevocationReason.ROTATION_COMPROMISE
            session.save(
                update_fields=[
                    "revoked_at",
                    "revocation_reason",
                    "updated_at",
                ]
            )
            error = RefreshAuthenticationError(
                "Refresh token reuse detected. Please log in again."
            )

        else:
            new_refresh = RefreshToken.for_user(session.user)
            new_refresh["session_id"] = str(session.id)
            new_refresh["role"] = session.user.role

            # Never extend beyond the original 30-day session.
            new_refresh.set_exp(
                from_time=now,
                lifetime=session.expires_at - now,
            )

            access = new_refresh.access_token
            raw_new_refresh = str(new_refresh)

            session.refresh_token_hash = token_digest(raw_new_refresh)
            session.last_used_at = now
            session.save(
                update_fields=[
                    "refresh_token_hash",
                    "last_used_at",
                    "updated_at",
                ]
            )

            result = {
                "access_token": str(access),
                "refresh_token": raw_new_refresh,
                "access_expires_in": 1800,
                "cookie_max_age": max(
                    0,
                    int((session.expires_at - now).total_seconds()),
                ),
            }

    # Raise outside atomic() so replay revocation is committed.
    if error is not None:
        raise error

    return result
