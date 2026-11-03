from unittest.mock import patch

import pytest
from django.test import Client

from accounts.google_auth import VerifiedGoogleUser
from accounts.models import AuthSession, GoogleIdentity, User
from restaurants.models import Restaurant

URL = "/api/v1/auth/google/login/"


@pytest.fixture
def google_owner(db):
    user = User.objects.create_google_user(
        email="google-login-owner@gmail.com",
        full_name="Google Login Owner",
    )

    GoogleIdentity.objects.create(
        user=user,
        google_sub="google-login-sub-123",
        google_email=user.email,
    )

    Restaurant.objects.create(
        owner=user,
        name="Google Login Kitchen",
        phone="9876543210",
        city="Kochi",
        slug="google-login-kitchen",
        status=Restaurant.Status.PENDING,
    )

    return user


def verified_user(sub="google-login-sub-123"):
    return VerifiedGoogleUser(
        google_sub=sub,
        email="google-login-owner@gmail.com",
        full_name="Google Login Owner",
        picture="",
        email_authoritative=True,
    )


@pytest.mark.django_db
@patch("accounts.google_services.verify_google_credential")
def test_existing_google_owner_login(mock_verify, google_owner):
    mock_verify.return_value = verified_user()

    client = Client(HTTP_HOST="localhost")

    response = client.post(
        URL,
        data={"credential": "mock-google-token"},
        content_type="application/json",
    )

    assert response.status_code == 200
    assert response.json()["data"]["user"]["role"] == "OWNER"
    assert response.json()["data"]["restaurant"]["status"] == "PENDING"

    assert "refresh_token" in client.cookies
    assert client.cookies["refresh_token"]["httponly"]

    access = response.json()["data"]["access_token"]

    me = client.get(
        "/api/v1/auth/me/",
        HTTP_AUTHORIZATION=f"Bearer {access}",
    )

    assert me.status_code == 200
    assert (
        AuthSession.objects.filter(
            user=google_owner,
            revoked_at__isnull=True,
        ).count()
        == 1
    )


@pytest.mark.django_db
@patch("accounts.google_services.verify_google_credential")
def test_unknown_google_account_cannot_login(mock_verify):
    mock_verify.return_value = verified_user(sub="unregistered-google-sub")

    response = Client(HTTP_HOST="localhost").post(
        URL,
        data={"credential": "mock-google-token"},
        content_type="application/json",
    )

    assert response.status_code == 404
    assert AuthSession.objects.count() == 0


@pytest.mark.django_db
@patch("accounts.google_services.verify_google_credential")
def test_google_email_match_does_not_auto_link(mock_verify):
    existing = User.objects.create_user(
        email="google-login-owner@gmail.com",
        password="ExistingPassword@123",
        full_name="Existing Email Owner",
        role=User.Role.OWNER,
    )

    mock_verify.return_value = verified_user(sub="different-google-sub")

    response = Client(HTTP_HOST="localhost").post(
        URL,
        data={"credential": "mock-google-token"},
        content_type="application/json",
    )

    assert response.status_code == 404
    assert not GoogleIdentity.objects.filter(
        user=existing,
    ).exists()
    assert AuthSession.objects.count() == 0


@pytest.mark.django_db
def test_google_login_requires_credential():
    response = Client(HTTP_HOST="localhost").post(
        URL,
        data={},
        content_type="application/json",
    )

    assert response.status_code == 400
