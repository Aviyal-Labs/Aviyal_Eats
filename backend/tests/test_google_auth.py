from unittest.mock import patch

import pytest
from django.test import override_settings
from google.auth.exceptions import GoogleAuthError

from accounts.google_auth import (
    InvalidGoogleToken,
    verify_google_credential,
)

CLIENT_ID = "test-client.apps.googleusercontent.com"


def google_payload(**overrides):
    payload = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "sub": "google-sub-123",
        "email": "owner@gmail.com",
        "email_verified": True,
        "name": "Test Google Owner",
        "picture": "https://example.com/profile.jpg",
    }

    payload.update(overrides)
    return payload


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@patch("accounts.google_auth.id_token.verify_oauth2_token")
def test_valid_google_token(mock_verify):
    mock_verify.return_value = google_payload()

    user = verify_google_credential("test-credential")

    assert user.google_sub == "google-sub-123"
    assert user.email == "owner@gmail.com"
    assert user.full_name == "Test Google Owner"
    assert user.email_authoritative is True

    assert mock_verify.call_args.args[2] == CLIENT_ID


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@pytest.mark.parametrize(
    "credential",
    [
        "",
        None,
        "a" * 10001,
    ],
)
def test_missing_or_oversized_token_rejected(credential):
    with pytest.raises(InvalidGoogleToken):
        verify_google_credential(credential)


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@patch("accounts.google_auth.id_token.verify_oauth2_token")
def test_invalid_signature_or_expiry_rejected(mock_verify):
    mock_verify.side_effect = ValueError("Invalid token")

    with pytest.raises(InvalidGoogleToken):
        verify_google_credential("invalid-credential")


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@patch("accounts.google_auth.id_token.verify_oauth2_token")
def test_google_library_error_rejected(mock_verify):
    mock_verify.side_effect = GoogleAuthError("Verification failed")

    with pytest.raises(InvalidGoogleToken):
        verify_google_credential("invalid-credential")


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@patch("accounts.google_auth.id_token.verify_oauth2_token")
def test_wrong_audience_rejected(mock_verify):
    mock_verify.return_value = google_payload(
        aud="another-client.apps.googleusercontent.com",
    )

    with pytest.raises(InvalidGoogleToken):
        verify_google_credential("test-credential")


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@patch("accounts.google_auth.id_token.verify_oauth2_token")
def test_wrong_issuer_rejected(mock_verify):
    mock_verify.return_value = google_payload(
        iss="https://untrusted.example.com",
    )

    with pytest.raises(InvalidGoogleToken):
        verify_google_credential("test-credential")


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@patch("accounts.google_auth.id_token.verify_oauth2_token")
def test_unverified_email_rejected(mock_verify):
    mock_verify.return_value = google_payload(
        email_verified=False,
    )

    with pytest.raises(InvalidGoogleToken):
        verify_google_credential("test-credential")


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@patch("accounts.google_auth.id_token.verify_oauth2_token")
def test_missing_google_sub_rejected(mock_verify):
    mock_verify.return_value = google_payload(sub="")

    with pytest.raises(InvalidGoogleToken):
        verify_google_credential("test-credential")


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@patch("accounts.google_auth.id_token.verify_oauth2_token")
def test_third_party_email_needs_additional_verification(mock_verify):
    mock_verify.return_value = google_payload(
        email="owner@example.com",
    )

    user = verify_google_credential("test-credential")

    assert user.email_authoritative is False


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@patch("accounts.google_auth.id_token.verify_oauth2_token")
def test_workspace_email_is_authoritative(mock_verify):
    mock_verify.return_value = google_payload(
        email="owner@company.com",
        hd="company.com",
    )

    user = verify_google_credential("test-credential")

    assert user.email_authoritative is True
