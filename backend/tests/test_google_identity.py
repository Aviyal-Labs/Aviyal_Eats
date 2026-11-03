import pytest

from django.db import IntegrityError, transaction

from accounts.models import GoogleIdentity, User


@pytest.mark.django_db
def test_google_identity_links_to_user():
    """A Google account can be linked to an owner without a password."""

    user = User.objects.create_google_user(
        email="google-owner@example.com",
        full_name="Google Owner",
    )

    identity = GoogleIdentity.objects.create(
        user=user,
        google_sub="google-test-sub-123",
        google_email=user.email,
    )

    assert identity.user == user
    assert user.google_identity == identity
    assert user.role == User.Role.OWNER
    assert not user.has_usable_password()


@pytest.mark.django_db
def test_google_sub_must_be_unique():
    """One Google account cannot be linked to two different users."""

    first_user = User.objects.create_google_user(
        email="google-first@example.com",
    )

    second_user = User.objects.create_google_user(
        email="google-second@example.com",
    )

    GoogleIdentity.objects.create(
        user=first_user,
        google_sub="same-google-sub",
        google_email=first_user.email,
    )

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            GoogleIdentity.objects.create(
                user=second_user,
                google_sub="same-google-sub",
                google_email=second_user.email,
            )


@pytest.mark.django_db
def test_normal_signup_still_requires_password():
    """Existing email/password registration must reject missing passwords."""

    with pytest.raises(
        ValueError,
        match="Password is required",
    ):
        User.objects.create_user(
            email="password-required@example.com",
            password=None,
        )
