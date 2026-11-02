import hashlib
import hmac
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, AuthenticationFailed

from .models import LoginThrottle

WINDOW = timedelta(minutes=15)
ACCOUNT_MAX_FAILURES = 5
IP_MAX_ATTEMPTS = 30


class AccountLocked(APIException):
    status_code = 423
    default_detail = "Too many login attempts. Try again later."
    default_code = "ACCOUNT_LOCKED"


class LoginRateLimited(APIException):
    status_code = 429
    default_detail = "Too many requests. Try again later."
    default_code = "LOGIN_RATE_LIMITED"


class InvalidLoginCredentials(APIException):
    status_code = 401
    default_detail = "Invalid email or password."
    default_code = "INVALID_CREDENTIALS"


def hash_identifier(value):
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def get_client_ip(request):
    # Only trust REMOTE_ADDR directly.
    # Do not trust X-Forwarded-For from arbitrary clients.
    return request.META.get("REMOTE_ADDR") or "unknown"


def get_throttle(scope, identifier):
    throttle, _ = LoginThrottle.objects.get_or_create(
        scope=scope,
        identifier=hash_identifier(identifier),
        defaults={
            "window_started_at": timezone.now(),
        },
    )

    return LoginThrottle.objects.select_for_update().get(pk=throttle.pk)


def reset_window_if_expired(throttle, now):
    # Never clear a lock that is still active.
    if throttle.locked_until and throttle.locked_until > now:
        return

    if throttle.locked_until is not None or now - throttle.window_started_at >= WINDOW:
        throttle.window_started_at = now
        throttle.attempt_count = 0
        throttle.locked_until = None


def authenticate_with_limits(request, email, password):
    """
    Authenticate with persistent account and IP limits.

    Error responses are raised only after committing
    the relevant database counter updates.
    """
    email = email.strip().lower()
    ip = get_client_ip(request)
    now = timezone.now()

    error = None
    user = None

    with transaction.atomic():
        # Take locks in a consistent order.
        account = get_throttle(
            LoginThrottle.Scope.ACCOUNT,
            email,
        )

        ip_limit = get_throttle(
            LoginThrottle.Scope.IP,
            ip,
        )

        reset_window_if_expired(account, now)
        reset_window_if_expired(ip_limit, now)

        # Count every login request for this IP.
        ip_limit.attempt_count += 1

        if ip_limit.attempt_count > IP_MAX_ATTEMPTS and ip_limit.locked_until is None:
            ip_limit.locked_until = now + WINDOW

        if ip_limit.locked_until and ip_limit.locked_until > now:
            error = LoginRateLimited()

        elif account.locked_until and account.locked_until > now:
            error = AccountLocked()

        else:
            user = authenticate(
                request=request,
                email=email,
                password=password,
            )

            if user is None or not user.is_active:
                account.attempt_count += 1

                if account.attempt_count >= ACCOUNT_MAX_FAILURES:
                    account.locked_until = now + WINDOW
                    error = AccountLocked()
                else:
                    error = InvalidLoginCredentials()

            else:
                # A successful login clears account failures,
                # but not the IP's overall request counter.
                account.attempt_count = 0
                account.locked_until = None
                account.window_started_at = now

        account.save()
        ip_limit.save()

    # Raising outside atomic() ensures failed attempts
    # remain committed to PostgreSQL.
    if error is not None:
        raise error

    return user
