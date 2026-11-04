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
    assert mock_verify.call_args.kwargs["clock_skew_in_seconds"] == 60


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


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@pytest.mark.parametrize("message,reason", [
    ("Token used too early, private-token-data", "issued_in_future_check_server_clock"),
    ("Token expired, private-token-data", "expired"),
    ("Token has wrong audience private-token-data", "audience_mismatch"),
    ("Wrong number of segments in token: private-token-data", "malformed_token"),
    ("private-token-data", "verification_failed"),
])
@patch("accounts.google_auth.id_token.verify_oauth2_token")
def test_verification_logs_safe_reason_without_token_details(mock_verify, message, reason, caplog):
    mock_verify.side_effect = ValueError(message)
    with pytest.raises(InvalidGoogleToken):
        verify_google_credential("private-token-data")
    assert f"reason={reason}" in caplog.text
    assert "private-token-data" not in caplog.text


@override_settings(GOOGLE_OAUTH_CLIENT_ID=CLIENT_ID)
@pytest.mark.parametrize("issued_offset,expiry_offset,accepted", [
    (30, 3600, True),
    (120, 3600, False),
    (-3600, -120, False),
])
def test_signed_google_token_clock_tolerance(issued_offset, expiry_offset, accepted):
    import time
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from google.auth import crypt, jwt

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = key.private_bytes(serialization.Encoding.PEM,
                                    serialization.PrivateFormat.PKCS8,
                                    serialization.NoEncryption())
    public_pem = key.public_key().public_bytes(serialization.Encoding.PEM,
                                              serialization.PublicFormat.SubjectPublicKeyInfo)
    now = int(time.time())
    payload = google_payload(iat=now + issued_offset, exp=now + expiry_offset)
    token = jwt.encode(crypt.RSASigner.from_string(private_pem, key_id="test-key"), payload).decode()
    # Replace only certificate retrieval; exercise real signature and time checks.
    with patch("google.oauth2.id_token._fetch_certs", return_value={"test-key": public_pem}):
        if accepted:
            assert verify_google_credential(token).google_sub == "google-sub-123"
        else:
            with pytest.raises(InvalidGoogleToken):
                verify_google_credential(token)
