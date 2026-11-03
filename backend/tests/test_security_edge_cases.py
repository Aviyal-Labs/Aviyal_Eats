import re
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core import mail
from django.test import Client
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.login_security import hash_identifier
from accounts.models import AuthSession, LoginThrottle, User
from approvals.models import ApprovalAuditLog, EmailNotification
from approvals.services import approve_restaurant
from restaurants.models import Restaurant

EMAIL = "edge-owner@example.com"
PASSWORD = "SecurityTest@123"
NEW_PASSWORD = "ChangedSecurity@456"
LOGIN_URL = "/api/v1/auth/login/"


@pytest.fixture
def edge_setup(db):
    owner = User.objects.create_user(
        email=EMAIL,
        password=PASSWORD,
        full_name="Edge Case Test Owner",
        role=User.Role.OWNER,
    )

    restaurant = Restaurant.objects.create(
        owner=owner,
        name="Edge Case Kitchen",
        phone="9876543210",
        city="Kochi",
        slug="edge-case-kitchen",
        status=Restaurant.Status.PENDING,
    )

    admin = User.objects.create_superuser(
        email="edge-admin@example.com",
        password="AdminTest@123",
        full_name="Edge Case Admin",
    )

    return owner, restaurant, admin


def make_client(ip="192.0.2.90"):
    return Client(HTTP_HOST="localhost", REMOTE_ADDR=ip)


def login(client, password=PASSWORD, email=EMAIL):
    return client.post(
        LOGIN_URL,
        data={"email": email, "password": password},
        content_type="application/json",
    )


@pytest.mark.django_db
def test_expired_refresh_token_is_rejected(edge_setup):
    owner, _, _ = edge_setup
    client = make_client()

    response = login(client)
    assert response.status_code == 200

    raw_refresh = client.cookies["refresh_token"].value

    # Re-sign a refresh JWT with an expiration in the past.
    expired_token = RefreshToken(raw_refresh)
    expired_token.set_exp(
        from_time=timezone.now() - timedelta(days=2),
        lifetime=timedelta(days=1),
    )

    client.cookies["refresh_token"] = str(expired_token)

    response = client.post("/api/v1/auth/refresh/")

    assert response.status_code == 401

    # An invalid token should not silently create a new session.
    assert AuthSession.objects.filter(user=owner).count() == 1


@pytest.mark.django_db
def test_password_reset_otp_cannot_be_reused(edge_setup):
    owner, _, _ = edge_setup
    client = make_client()

    requested = client.post(
        "/api/v1/auth/password-reset/request/",
        data={"email": owner.email},
        content_type="application/json",
    )

    assert requested.status_code == 200
    assert len(mail.outbox) == 1

    otp_match = re.search(r"\b\d{6}\b", mail.outbox[-1].body)
    assert otp_match is not None
    otp = otp_match.group()

    first = client.post(
        "/api/v1/auth/password-reset/confirm/",
        data={
            "email": owner.email,
            "otp": otp,
            "new_password": NEW_PASSWORD,
        },
        content_type="application/json",
    )

    assert first.status_code == 200

    second = client.post(
        "/api/v1/auth/password-reset/confirm/",
        data={
            "email": owner.email,
            "otp": otp,
            "new_password": "AnotherChanged@789",
        },
        content_type="application/json",
    )

    assert second.status_code in (400, 401, 403)

    owner.refresh_from_db()
    assert owner.check_password(NEW_PASSWORD)
    assert not owner.check_password("AnotherChanged@789")


@pytest.mark.django_db
def test_login_recovers_after_lockout_expires(edge_setup):
    owner, _, _ = edge_setup
    client = make_client("192.0.2.91")

    statuses = [
        login(client, password="WrongPassword@123").status_code for _ in range(5)
    ]

    assert statuses == [401, 401, 401, 401, 423]
    assert login(client).status_code == 423

    throttle = LoginThrottle.objects.get(
        scope=LoginThrottle.Scope.ACCOUNT,
        identifier=hash_identifier(owner.email.lower()),
    )

    # Simulate time passing without making the test wait.
    throttle.locked_until = timezone.now() - timedelta(seconds=1)
    throttle.save(update_fields=["locked_until"])

    recovered = login(client)
    assert recovered.status_code == 200

    throttle.refresh_from_db()
    assert throttle.attempt_count == 0
    assert throttle.locked_until is None


@pytest.mark.django_db
def test_notification_failure_rolls_back_approval(edge_setup):
    _, restaurant, admin = edge_setup

    with patch(
        "approvals.services.queue_restaurant_approved",
        side_effect=RuntimeError("Simulated queue failure"),
    ):
        with pytest.raises(RuntimeError):
            approve_restaurant(restaurant.id, admin)

    restaurant.refresh_from_db()

    assert restaurant.status == Restaurant.Status.PENDING
    assert restaurant.approved_at is None
    assert restaurant.approved_by_id is None

    assert not ApprovalAuditLog.objects.filter(
        restaurant=restaurant,
    ).exists()

    assert not EmailNotification.objects.filter(
        restaurant=restaurant,
    ).exists()
