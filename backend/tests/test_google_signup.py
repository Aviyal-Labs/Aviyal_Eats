
from unittest.mock import patch

import pytest
from django.test import Client

from accounts.google_auth import VerifiedGoogleUser
from accounts.models import GoogleIdentity, User
from restaurants.models import Restaurant


URL = "/api/v1/auth/google/signup/"


def google_user(authoritative=True):
    """Return a mocked, verified Google identity."""
    return VerifiedGoogleUser(
        google_sub="new-google-owner-sub",
        email="new-google-owner@gmail.com",
        full_name="New Google Owner",
        picture="",
        email_authoritative=authoritative,
    )


def signup_data(**changes):
    """Return valid Google signup request data."""
    data = {
        "credential": "mock-google-credential",
        "mobile": "+919876543210",
        "restaurant_name": "Google Signup Kitchen",
        "restaurant_phone": "+919876543211",
        "city": "Kochi",
        "requested_slug": "google-signup-kitchen",
    }

    data.update(changes)
    return data


@pytest.mark.django_db
@patch("accounts.google_services.verify_google_credential")
def test_google_signup_creates_owner_and_restaurant(mock_verify):
    mock_verify.return_value = google_user()

    client = Client(HTTP_HOST="localhost")

    response = client.post(
        URL,
        data=signup_data(),
        content_type="application/json",
    )

    assert response.status_code == 201

    owner = User.objects.get(
        email="new-google-owner@gmail.com"
    )

    restaurant = Restaurant.objects.get(owner=owner)
    identity = GoogleIdentity.objects.get(user=owner)

    assert owner.role == User.Role.OWNER
    assert not owner.has_usable_password()
    assert owner.email_verified_at is not None

    assert owner.mobile == "+919876543210"

    assert identity.google_sub == "new-google-owner-sub"
    assert identity.google_email == owner.email

    assert restaurant.name == "Google Signup Kitchen"
    assert restaurant.city == "Kochi"
    assert restaurant.status == Restaurant.Status.PENDING

    assert "refresh_token" in client.cookies
    assert client.cookies["refresh_token"]["httponly"]

    access = response.json()["data"]["access_token"]

    me = client.get(
        "/api/v1/auth/me/",
        HTTP_AUTHORIZATION=f"Bearer {access}",
    )

    assert me.status_code == 200


@pytest.mark.django_db
@patch("accounts.google_services.verify_google_credential")
def test_google_signup_does_not_link_existing_email(mock_verify):
    mock_verify.return_value = google_user()

    existing_user = User.objects.create_user(
        email="new-google-owner@gmail.com",
        password="ExistingPassword@123",
        full_name="Existing Email Owner",
        role=User.Role.OWNER,
    )

    response = Client(HTTP_HOST="localhost").post(
        URL,
        data=signup_data(),
        content_type="application/json",
    )

    assert response.status_code == 409

    assert User.objects.count() == 1
    assert User.objects.first() == existing_user
    assert GoogleIdentity.objects.count() == 0
    assert Restaurant.objects.count() == 0


@pytest.mark.django_db
@patch("accounts.google_services.verify_google_credential")
def test_duplicate_restaurant_slug_is_rejected(mock_verify):
    mock_verify.return_value = google_user()

    existing_owner = User.objects.create_user(
        email="existing-owner@example.com",
        password="ExistingPassword@123",
        full_name="Existing Restaurant Owner",
        role=User.Role.OWNER,
    )

    Restaurant.objects.create(
        owner=existing_owner,
        name="Existing Kitchen",
        phone="9876543200",
        city="Kochi",
        slug="google-signup-kitchen",
        status=Restaurant.Status.PENDING,
    )

    response = Client(HTTP_HOST="localhost").post(
        URL,
        data=signup_data(),
        content_type="application/json",
    )

    assert response.status_code == 409

    assert GoogleIdentity.objects.count() == 0
    assert User.objects.count() == 1
    assert Restaurant.objects.count() == 1


@pytest.mark.django_db
@patch("accounts.google_services.verify_google_credential")
def test_google_signup_rejects_non_authoritative_email(mock_verify):
    mock_verify.return_value = google_user(
        authoritative=False
    )

    response = Client(HTTP_HOST="localhost").post(
        URL,
        data=signup_data(),
        content_type="application/json",
    )

    assert response.status_code == 400

    assert User.objects.count() == 0
    assert GoogleIdentity.objects.count() == 0
    assert Restaurant.objects.count() == 0


@pytest.mark.django_db
@patch("accounts.google_services.verify_google_credential")
def test_duplicate_google_signup_is_rejected(mock_verify):
    mock_verify.return_value = google_user()

    client = Client(HTTP_HOST="localhost")

    first = client.post(
        URL,
        data=signup_data(),
        content_type="application/json",
    )

    second = client.post(
        URL,
        data=signup_data(),
        content_type="application/json",
    )

    assert first.status_code == 201
    assert second.status_code == 409

    assert User.objects.count() == 1
    assert GoogleIdentity.objects.count() == 1
    assert Restaurant.objects.count() == 1


@pytest.mark.parametrize("field,value", [
    ("mobile", "not-a-phone"),
    ("restaurant_phone", "9876543211"),
    ("restaurant_name", "x" * 201),
])
@patch("accounts.google_services.verify_google_credential")
def test_invalid_signup_fields_rejected_before_identity_verification(mock_verify, field, value):
    response = Client().post(URL, data=signup_data(**{field: value}), content_type="application/json")
    assert response.status_code == 400
    assert field in response.json()
    mock_verify.assert_not_called()


@pytest.mark.django_db
@patch("accounts.google_services.verify_google_credential")
def test_google_signup_normalizes_phone_numbers(mock_verify):
    mock_verify.return_value = google_user()
    response = Client().post(URL, data=signup_data(
        mobile="+91 (98765) 43210", restaurant_phone="+91 98765-43211",
    ), content_type="application/json")
    assert response.status_code == 201
    owner = User.objects.get(email=google_user().email)
    assert owner.mobile == "+919876543210"
    assert owner.restaurant.phone == "+919876543211"


@pytest.mark.parametrize("url", ["/api/v1/auth/google/login/", URL])
@patch("accounts.google_auth.id_token.verify_oauth2_token", side_effect=ValueError("Expired token"))
def test_invalid_google_credential_returns_401_for_reauthentication(mock_verify, url, settings):
    settings.GOOGLE_OAUTH_CLIENT_ID = "test-client.apps.googleusercontent.com"
    response = Client().post(url, data=signup_data(), content_type="application/json")
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid Google authentication token."
    assert response["WWW-Authenticate"] == 'Bearer realm="google"'
