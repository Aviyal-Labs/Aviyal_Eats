import logging
from dataclasses import dataclass

from django.conf import settings
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)


class InvalidGoogleToken(AuthenticationFailed):
    status_code = 401
    default_detail = "Invalid Google authentication token."
    default_code = "INVALID_GOOGLE_TOKEN"


@dataclass(frozen=True)
class VerifiedGoogleUser:
    google_sub: str
    email: str
    full_name: str
    picture: str
    email_authoritative: bool


def verify_google_credential(credential):
    """
    Verify a Google Identity Services ID token.

    The Google library validates the token's signature,
    audience, and expiration.

    This function also validates the issuer, subject,
    email, and email verification status.

    Never trust identity claims supplied directly
    by the frontend.
    """

    client_id = settings.GOOGLE_OAUTH_CLIENT_ID

    # 1. Ensure the backend has a Google Client ID.
    if not client_id:
        raise RuntimeError("GOOGLE_OAUTH_CLIENT_ID is not configured.")

    # 2. Validate the incoming credential.
    if not isinstance(credential, str) or not credential.strip():
        logger.warning("Google login rejected: missing or invalid credential")
        raise InvalidGoogleToken()

    if len(credential) > 10000:
        logger.warning("Google login rejected: credential exceeds size limit")
        raise InvalidGoogleToken()

    # 3. Verify the Google ID token using Google's library.
    #
    # Do not check JWT structure manually here.
    # Unit tests mock the Google verifier using placeholder
    # credentials, and the library handles real token parsing.
    try:
        payload = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
            # Allow small differences between Google's clock and the server.
            clock_skew_in_seconds=60,
        )

    except (ValueError, GoogleAuthError) as exc:
        # Do not log credentials or Google identity claims.
        reason = "verification_failed"
        for prefix, category in (
            ("Token used too early", "issued_in_future_check_server_clock"),
            ("Token expired", "expired"),
            ("Token has wrong audience", "audience_mismatch"),
            ("Could not verify token signature", "invalid_signature"),
            ("Wrong number of segments", "malformed_token"),
        ):
            if str(exc).startswith(prefix):
                reason = category
                break
        logger.warning(
            "Google token verification failed: exception_type=%s reason=%s",
            type(exc).__name__,
            reason,
        )
        raise InvalidGoogleToken() from None

    # 4. Validate the issuer.
    if payload.get("iss") not in (
        "accounts.google.com",
        "https://accounts.google.com",
    ):
        logger.warning("Google token rejected: invalid issuer")
        raise InvalidGoogleToken()

    # 5. Validate the token audience.
    if payload.get("aud") != client_id:
        logger.warning("Google token rejected: audience mismatch")
        raise InvalidGoogleToken()

    # 6. Extract the Google user identity.
    google_sub = payload.get("sub")
    email = payload.get("email")

    if not isinstance(google_sub, str) or not google_sub or len(google_sub) > 255:
        logger.warning("Google token rejected: invalid subject")
        raise InvalidGoogleToken()

    if not isinstance(email, str) or not email.strip():
        logger.warning("Google token rejected: missing or invalid email")
        raise InvalidGoogleToken()

    email = email.strip().lower()

    # 7. Require Google to have verified the email.
    if payload.get("email_verified") is not True:
        logger.warning("Google token rejected: email not verified")
        raise InvalidGoogleToken()

    # 8. Determine whether Google is authoritative
    # for ownership of the email address.
    #
    # Gmail and Google Workspace addresses are authoritative.
    # Third-party email addresses may require additional
    # verification elsewhere in the signup flow.
    hosted_domain = payload.get("hd")

    email_authoritative = email.endswith("@gmail.com") or (
        isinstance(hosted_domain, str) and bool(hosted_domain)
    )

    # 9. Return the verified Google identity.
    return VerifiedGoogleUser(
        google_sub=google_sub,
        email=email,
        full_name=str(payload.get("name") or "")[:255],
        picture=str(payload.get("picture") or ""),
        email_authoritative=email_authoritative,
    )
