import re

import pytest
from django.core import mail
from django.test import Client

from accounts.models import AuthSession, LoginThrottle, User
from accounts.login_security import hash_identifier
from restaurants.models import Restaurant

LOGIN_URL = "/api/v1/auth/login/"
REFRESH_URL = "/api/v1/auth/refresh/"
ME_URL = "/api/v1/auth/me/"


@pytest.fixture
def auth_setup(db):
    user = User.objects.create_user(
        email="security-owner@example.com",
        password="SecurityTest@123",
        full_name="Security Test Owner",
        role=User.Role.OWNER,
    )

    Restaurant.objects.create(
        owner=user,
        name="Security Test Kitchen",
        phone="9876543210",
        city="Kochi",
        slug="security-test-kitchen",
        status=Restaurant.Status.PENDING,
    )

    return user


def make_client(ip="192.0.2.10", csrf=False):
    return Client(
        HTTP_HOST="localhost",
        REMOTE_ADDR=ip,
        enforce_csrf_checks=csrf,
    )


def login(client, email="security-owner@example.com", password="SecurityTest@123"):
    return client.post(
        LOGIN_URL,
        data={"email": email, "password": password},
        content_type="application/json",
    )


def me(client, token):
    return client.get(
        ME_URL,
        HTTP_AUTHORIZATION=f"Bearer {token}",
    )


@pytest.mark.django_db
def test_login_creates_active_session(auth_setup):
    client = make_client()

    response = login(client)

    assert response.status_code == 200
    assert "refresh_token" in client.cookies
    assert client.cookies["refresh_token"]["httponly"]

    access = response.json()["data"]["access_token"]
    assert me(client, access).status_code == 200

    assert (
        AuthSession.objects.filter(
            user=auth_setup,
            revoked_at__isnull=True,
        ).count()
        == 1
    )


@pytest.mark.django_db
def test_refresh_requires_csrf(auth_setup):
    client = make_client(csrf=True)

    csrf_token = client.get("/api/v1/auth/csrf/").json()["data"]["csrf_token"]

    assert login(client).status_code == 200

    blocked = client.post(REFRESH_URL)
    assert blocked.status_code == 403

    allowed = client.post(
        REFRESH_URL,
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert allowed.status_code == 200


@pytest.mark.django_db
def test_refresh_rotates_cookie(auth_setup):
    client = make_client()

    assert login(client).status_code == 200
    old_refresh = client.cookies["refresh_token"].value

    response = client.post(REFRESH_URL)

    assert response.status_code == 200
    assert client.cookies["refresh_token"].value != old_refresh

    new_access = response.json()["data"]["access_token"]
    assert me(client, new_access).status_code == 200


@pytest.mark.django_db
def test_refresh_replay_revokes_session(auth_setup):
    client = make_client()

    assert login(client).status_code == 200
    old_refresh = client.cookies["refresh_token"].value

    refreshed = client.post(REFRESH_URL)
    assert refreshed.status_code == 200

    access = refreshed.json()["data"]["access_token"]

    client.cookies["refresh_token"] = old_refresh
    replay = client.post(REFRESH_URL)

    assert replay.status_code == 401
    assert me(client, access).status_code == 401

    assert not AuthSession.objects.filter(
        user=auth_setup,
        revoked_at__isnull=True,
    ).exists()


@pytest.mark.django_db
def test_logout_only_revokes_current_device(auth_setup):
    a = make_client("192.0.2.11")
    b = make_client("192.0.2.12")

    response_a = login(a)
    response_b = login(b)

    assert response_a.status_code == 200
    assert response_b.status_code == 200

    access_a = response_a.json()["data"]["access_token"]
    access_b = response_b.json()["data"]["access_token"]

    logout = a.post(
        "/api/v1/auth/logout/",
        HTTP_AUTHORIZATION=f"Bearer {access_a}",
    )

    assert logout.status_code == 204
    assert logout.content == b""
    assert "refresh_token" not in a.cookies or not (a.cookies["refresh_token"].value)

    assert me(a, access_a).status_code == 401
    assert me(b, access_b).status_code == 200


@pytest.mark.django_db
def test_logout_all_revokes_every_device(auth_setup):
    a = make_client("192.0.2.13")
    b = make_client("192.0.2.14")

    response_a = login(a)
    response_b = login(b)

    assert response_a.status_code == 200
    assert response_b.status_code == 200

    access_a = response_a.json()["data"]["access_token"]
    access_b = response_b.json()["data"]["access_token"]

    logout = a.post(
        "/api/v1/auth/logout-all/",
        HTTP_AUTHORIZATION=f"Bearer {access_a}",
    )

    assert logout.status_code == 204

    assert me(a, access_a).status_code == 401
    assert me(b, access_b).status_code == 401


@pytest.mark.django_db
def test_password_reset_revokes_old_session(auth_setup):
    client = make_client("192.0.2.15")

    response = login(client)
    assert response.status_code == 200

    old_access = response.json()["data"]["access_token"]

    requested = client.post(
        "/api/v1/auth/password-reset/request/",
        data={"email": auth_setup.email},
        content_type="application/json",
    )

    assert requested.status_code == 200
    assert len(mail.outbox) == 1

    otp = re.search(
        r"\b\d{6}\b",
        mail.outbox[-1].body,
    ).group()

    confirmed = client.post(
        "/api/v1/auth/password-reset/confirm/",
        data={
            "email": auth_setup.email,
            "otp": otp,
            "new_password": "ChangedSecurity@456",
        },
        content_type="application/json",
    )

    assert confirmed.status_code == 200
    assert me(client, old_access).status_code == 401

    new_login = login(
        client,
        password="ChangedSecurity@456",
    )
    assert new_login.status_code == 200


@pytest.mark.django_db
def test_five_failed_logins_lock_account(auth_setup):
    client = make_client("192.0.2.16")

    statuses = []

    for _ in range(5):
        response = login(
            client,
            password="IncorrectPassword@123",
        )
        statuses.append(response.status_code)

    assert statuses == [401, 401, 401, 401, 423]

    correct_password = login(client)
    assert correct_password.status_code == 423


@pytest.mark.django_db
def test_ip_rate_limit(auth_setup):
    ip = "192.0.2.17"
    client = make_client(ip)

    throttle = LoginThrottle.objects.create(
        scope=LoginThrottle.Scope.IP,
        identifier=hash_identifier(ip),
        attempt_count=30,
    )

    response = login(client)

    assert response.status_code == 429

    throttle.refresh_from_db()
    assert throttle.attempt_count == 31


@pytest.mark.django_db
@pytest.mark.parametrize(
    "endpoint",
    [
        "/api/v1/auth/logout/",
        "/api/v1/auth/logout-all/",
    ],
)
def test_logout_requires_csrf(auth_setup, endpoint):
    client = make_client("192.0.2.80", csrf=True)

    csrf_token = client.get("/api/v1/auth/csrf/").json()["data"]["csrf_token"]

    response = login(client)
    assert response.status_code == 200

    access = response.json()["data"]["access_token"]

    blocked = client.post(
        endpoint,
        HTTP_AUTHORIZATION=f"Bearer {access}",
    )

    assert blocked.status_code == 403

    # Missing-CSRF request must not revoke the session.
    assert me(client, access).status_code == 200

    allowed = client.post(
        endpoint,
        HTTP_AUTHORIZATION=f"Bearer {access}",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert allowed.status_code == 204
    assert me(client, access).status_code == 401
