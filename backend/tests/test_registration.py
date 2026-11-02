import pytest

from django.contrib.auth.hashers import check_password
from django.core import mail
from django.utils import timezone

from accounts.models import PendingRegistration, User
from accounts.services import (
    RegistrationConflict,
    create_pending_registration,
)
from restaurants.models import Restaurant


@pytest.mark.django_db
def test_registration_creates_pending_record(registration_data):
    result = create_pending_registration(registration_data)

    pending = PendingRegistration.objects.get(email=registration_data["email"])

    assert result["verification_required"] is True
    assert pending.owner_full_name == registration_data["owner_full_name"]
    assert check_password(
        registration_data["password"],
        pending.password_hash,
    )

    assert not User.objects.filter(email=registration_data["email"]).exists()

    assert not Restaurant.objects.filter(slug=registration_data["slug"]).exists()

    assert len(mail.outbox) == 1


@pytest.mark.django_db
def test_pending_registration_expires_after_24_hours(
    registration_data,
):
    create_pending_registration(registration_data)

    pending = PendingRegistration.objects.get(email=registration_data["email"])

    seconds = (pending.expires_at - pending.created_at).total_seconds()

    assert 86390 <= seconds <= 86410


@pytest.mark.django_db
def test_existing_user_email_cannot_register(registration_data):
    User.objects.create_user(
        email=registration_data["email"],
        password="ExistingPassword@123",
        full_name="Existing Owner",
        mobile="+919876543299",
    )

    with pytest.raises(RegistrationConflict):
        create_pending_registration(registration_data)


@pytest.mark.django_db
def test_existing_restaurant_slug_cannot_register(
    registration_data,
):
    existing_owner = User.objects.create_user(
        email="existing-owner@example.com",
        password="ExistingPassword@123",
        full_name="Existing Owner",
        mobile="+919876543298",
    )

    Restaurant.objects.create(
        owner=existing_owner,
        name="Existing Restaurant",
        phone="+914842000099",
        city="Kochi",
        slug=registration_data["slug"],
    )

    with pytest.raises(RegistrationConflict):
        create_pending_registration(registration_data)


@pytest.mark.django_db
def test_registration_response_is_temporary(registration_data):
    create_pending_registration(registration_data)

    assert PendingRegistration.objects.count() == 1
    assert User.objects.count() == 0
    assert Restaurant.objects.count() == 0
