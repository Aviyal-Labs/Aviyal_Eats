import uuid

import pytest
from django.test import override_settings


@pytest.fixture(autouse=True)
def test_settings():
    with override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        ALLOWED_HOSTS=["localhost", "testserver"],
    ):
        yield


@pytest.fixture
def registration_data():
    suffix = uuid.uuid4().hex[:10]

    return {
        "owner_full_name": "Test Owner",
        "email": f"owner-{suffix}@example.com",
        "mobile": "+919876543210",
        "password": "StrongPassword@123",
        "restaurant_name": "Test Kitchen",
        "restaurant_phone": "+914842000000",
        "city": "Kochi",
        "slug": f"test-kitchen-{suffix}",
    }
