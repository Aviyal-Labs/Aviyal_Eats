import uuid

import pytest
from django.test import Client

from accounts.models import User
from accounts.tokens import create_login_session
from approvals.models import ApprovalAuditLog
from restaurants.models import Restaurant


@pytest.fixture
def approval_setup(db):
    suffix = uuid.uuid4().hex[:8]

    admin = User.objects.create_superuser(
        email=f"admin-{suffix}@example.com",
        password="AdminTest@123",
        full_name="Test Super Admin",
    )

    owner = User.objects.create_user(
        email=f"owner-{suffix}@example.com",
        password="OwnerTest@123",
        full_name="Test Restaurant Owner",
        role=User.Role.OWNER,
    )

    restaurant = Restaurant.objects.create(
        owner=owner,
        name="Test Approval Kitchen",
        phone="9876543210",
        city="Kochi",
        slug=f"approval-kitchen-{suffix}",
        status=Restaurant.Status.PENDING,
    )

    admin_tokens = create_login_session(admin)
    owner_tokens = create_login_session(owner)

    admin_client = Client(
        HTTP_HOST="localhost",
        HTTP_AUTHORIZATION=(f"Bearer {admin_tokens['access_token']}"),
    )

    owner_client = Client(
        HTTP_HOST="localhost",
        HTTP_AUTHORIZATION=(f"Bearer {owner_tokens['access_token']}"),
    )

    return {
        "restaurant": restaurant,
        "admin_client": admin_client,
        "owner_client": owner_client,
    }


@pytest.mark.django_db
def test_complete_rejection_resubmission_workflow(approval_setup):
    restaurant = approval_setup["restaurant"]
    admin_client = approval_setup["admin_client"]
    owner_client = approval_setup["owner_client"]

    reject_url = f"/api/v1/admin/restaurants/{restaurant.id}/reject/"

    approve_url = f"/api/v1/admin/restaurants/{restaurant.id}/approve/"

    # 1. Super Admin rejects pending restaurant.
    response = admin_client.post(
        reject_url,
        data={"reason": "Please correct restaurant city."},
        content_type="application/json",
    )

    assert response.status_code == 200

    restaurant.refresh_from_db()
    assert restaurant.status == Restaurant.Status.REJECTED
    assert restaurant.rejection_reason == ("Please correct restaurant city.")

    # 2. Owner edits the rejected restaurant.
    response = owner_client.patch(
        "/api/v1/owner/restaurant/",
        data={"city": "Ernakulam"},
        content_type="application/json",
    )

    assert response.status_code == 200

    restaurant.refresh_from_db()
    assert restaurant.city == "Ernakulam"
    assert restaurant.status == Restaurant.Status.REJECTED

    # 3. Owner resubmits the restaurant.
    response = owner_client.post(
        "/api/v1/owner/restaurant/resubmit/",
    )

    assert response.status_code == 200

    restaurant.refresh_from_db()
    assert restaurant.status == Restaurant.Status.PENDING
    assert restaurant.rejection_reason == ""

    # 4. Duplicate resubmission is blocked.
    response = owner_client.post(
        "/api/v1/owner/restaurant/resubmit/",
    )

    assert response.status_code == 409

    # 5. Super Admin approves the resubmission.
    response = admin_client.post(approve_url)

    assert response.status_code == 200

    restaurant.refresh_from_db()
    assert restaurant.status == Restaurant.Status.APPROVED

    # 6. Verify audit history.
    actions = list(
        ApprovalAuditLog.objects.filter(restaurant=restaurant)
        .order_by("created_at", "id")
        .values_list("action", flat=True)
    )

    assert actions == [
        ApprovalAuditLog.Action.REJECTED,
        ApprovalAuditLog.Action.RESUBMITTED,
        ApprovalAuditLog.Action.APPROVED,
    ]


@pytest.mark.django_db
def test_owner_cannot_approve_restaurant(approval_setup):
    restaurant = approval_setup["restaurant"]
    owner_client = approval_setup["owner_client"]

    response = owner_client.post(f"/api/v1/admin/restaurants/{restaurant.id}/approve/")

    assert response.status_code == 403

    restaurant.refresh_from_db()
    assert restaurant.status == Restaurant.Status.PENDING


@pytest.mark.django_db
def test_rejection_requires_reason(approval_setup):
    restaurant = approval_setup["restaurant"]
    admin_client = approval_setup["admin_client"]

    response = admin_client.post(
        f"/api/v1/admin/restaurants/{restaurant.id}/reject/",
        data={},
        content_type="application/json",
    )

    assert response.status_code == 400

    restaurant.refresh_from_db()
    assert restaurant.status == Restaurant.Status.PENDING


@pytest.mark.django_db
def test_approved_restaurant_cannot_be_edited(approval_setup):
    restaurant = approval_setup["restaurant"]
    admin_client = approval_setup["admin_client"]
    owner_client = approval_setup["owner_client"]

    approve_response = admin_client.post(
        f"/api/v1/admin/restaurants/{restaurant.id}/approve/"
    )
    assert approve_response.status_code == 200

    edit_response = owner_client.patch(
        "/api/v1/owner/restaurant/",
        data={"city": "Another City"},
        content_type="application/json",
    )

    resubmit_response = owner_client.post(
        "/api/v1/owner/restaurant/resubmit/",
    )

    assert edit_response.status_code == 409
    assert resubmit_response.status_code == 409

    restaurant.refresh_from_db()
    assert restaurant.city == "Kochi"
    assert restaurant.status == Restaurant.Status.APPROVED
