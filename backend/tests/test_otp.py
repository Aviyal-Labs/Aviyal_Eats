import re
from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone

from accounts.models import EmailOTP, PendingRegistration, User
from accounts.services import (
    OTPExpiredError,
    OTPVerificationError,
    create_pending_registration,
    resend_registration_otp,
    verify_registration_otp,
)
from restaurants.models import Restaurant


def extract_test_otp():
    # Only used with Django's in-memory email backend.
    match = re.search(r"\b\d{6}\b", mail.outbox[-1].body)
    assert match is not None
    return match.group()


@pytest.mark.django_db
def test_registration_otp_expires_after_five_minutes(
    registration_data,
):
    create_pending_registration(registration_data)

    otp = EmailOTP.objects.get(pending_registration__email=registration_data["email"])

    seconds = (otp.expires_at - otp.created_at).total_seconds()
    assert 290 <= seconds <= 310


@pytest.mark.django_db
def test_correct_otp_creates_owner_and_restaurant(
    registration_data,
):
    create_pending_registration(registration_data)
    otp = extract_test_otp()

    result = verify_registration_otp(registration_data["email"], otp)

    user = User.objects.get(email=registration_data["email"])
    restaurant = Restaurant.objects.get(owner=user)

    assert user.role == User.Role.OWNER
    assert user.email_verified_at is not None
    assert user.check_password(registration_data["password"])
    assert restaurant.status == Restaurant.Status.PENDING
    assert result["restaurant"]["status"] == "PENDING"
    assert not PendingRegistration.objects.filter(
        email=registration_data["email"]
    ).exists()


@pytest.mark.django_db
def test_registration_otp_cannot_be_reused(registration_data):
    create_pending_registration(registration_data)
    otp = extract_test_otp()

    verify_registration_otp(registration_data["email"], otp)

    with pytest.raises(OTPVerificationError):
        verify_registration_otp(registration_data["email"], otp)

    assert User.objects.filter(email=registration_data["email"]).count() == 1


@pytest.mark.django_db
def test_expired_otp_is_rejected(registration_data):
    create_pending_registration(registration_data)
    otp = extract_test_otp()

    EmailOTP.objects.filter(
        pending_registration__email=registration_data["email"]
    ).update(expires_at=timezone.now() - timedelta(seconds=1))

    with pytest.raises(OTPExpiredError):
        verify_registration_otp(registration_data["email"], otp)

    assert not User.objects.filter(email=registration_data["email"]).exists()


@pytest.mark.django_db
def test_five_incorrect_attempts_invalidate_otp(
    registration_data,
):
    create_pending_registration(registration_data)
    correct_otp = extract_test_otp()

    wrong_otp = "000000" if correct_otp != "000000" else "111111"

    for _ in range(5):
        with pytest.raises(OTPVerificationError):
            verify_registration_otp(registration_data["email"], wrong_otp)

    otp_record = EmailOTP.objects.get(
        pending_registration__email=registration_data["email"]
    )

    assert otp_record.attempt_count == 5
    assert otp_record.invalidated_at is not None

    with pytest.raises(OTPVerificationError):
        verify_registration_otp(registration_data["email"], correct_otp)


@pytest.mark.django_db
def test_immediate_resend_does_not_send_email(registration_data):
    create_pending_registration(registration_data)

    before = len(mail.outbox)
    resend_registration_otp(registration_data["email"])

    assert len(mail.outbox) == before


@pytest.mark.django_db
def test_resend_invalidates_previous_otp(registration_data):
    create_pending_registration(registration_data)

    pending = PendingRegistration.objects.get(email=registration_data["email"])
    original_expiry = pending.expires_at

    old_otp = EmailOTP.objects.get(pending_registration=pending)

    EmailOTP.objects.filter(pk=old_otp.pk).update(
        last_sent_at=timezone.now() - timedelta(seconds=61)
    )

    resend_registration_otp(registration_data["email"])

    old_otp.refresh_from_db()
    pending.refresh_from_db()

    assert old_otp.invalidated_at is not None
    assert pending.expires_at == original_expiry
    assert EmailOTP.objects.filter(pending_registration=pending).count() == 2
    assert len(mail.outbox) == 2
