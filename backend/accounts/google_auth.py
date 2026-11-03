from dataclasses import dataclass

from django.conf import settings
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework.exceptions import AuthenticationFailed


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

    Never trust user identity claims sent directly by the frontend.
    """
    client_id = settings.GOOGLE_OAUTH_CLIENT_ID

    if not client_id:
        raise RuntimeError("GOOGLE_OAUTH_CLIENT_ID is not configured.")

    if not isinstance(credential, str) or not credential.strip():
        raise InvalidGoogleToken()

    if len(credential) > 10000:
        raise InvalidGoogleToken()

    try:
        payload = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
        )
    except (ValueError, GoogleAuthError):
        raise InvalidGoogleToken() from None

    if payload.get("iss") not in (
        "accounts.google.com",
        "https://accounts.google.com",
    ):
        raise InvalidGoogleToken()

    if payload.get("aud") != client_id:
        raise InvalidGoogleToken()

    google_sub = payload.get("sub")
    email = payload.get("email")

    if (
        not isinstance(google_sub, str)
        or not google_sub
        or len(google_sub) > 255
        or not isinstance(email, str)
        or not email.strip()
    ):
        raise InvalidGoogleToken()

    email = email.strip().lower()

    # Google's library validates signature and token expiry.
    # Require an explicit verified-email claim too.
    if payload.get("email_verified") is not True:
        raise InvalidGoogleToken()

    hosted_domain = payload.get("hd")

    # For Google-hosted Gmail and Workspace addresses,
    # Google is authoritative for email ownership.
    email_authoritative = email.endswith("@gmail.com") or (
        isinstance(hosted_domain, str) and bool(hosted_domain)
    )

    return VerifiedGoogleUser(
        google_sub=google_sub,
        email=email,
        full_name=str(payload.get("name") or "")[:255],
        picture=str(payload.get("picture") or ""),
        email_authoritative=email_authoritative,
    )
