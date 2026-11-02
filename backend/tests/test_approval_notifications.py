import uuid

import pytest

from accounts.models import User
from approvals.models import EmailNotification
from approvals.services import approve_restaurant, reject_restaurant
from restaurants.models import Restaurant
from restaurants.services import resubmit_rejected_restaurant


@pytest.fixture
def notification_setup(db):
    suffix = uuid.uuid4().hex[:8]

    admin = User.objects.create_superuser(
        email=f"notify-admin-{suffix}@example.com",
        password="AdminTest@123",
        full_name="Notification Admin",
    )

    owner = User.objects.create_user(
        email=f"notify-owner-{suffix}@example.com",
        password="OwnerTest@123",
        full_name="Notification Owner",
        role=User.Role.OWNER,
    )

    restaurant = Restaurant.objects.create(
        owner=owner,
        name="Notification Test Kitchen",
        phone="9876543210",
        city="Kochi",
        slug=f"notify-kitchen-{suffix}",
        status=Restaurant.Status.PENDING,
    )

    return admin, owner, restaurant


@pytest.mark.django_db
def test_approval_queues_owner_email(notification_setup):
    admin, owner, restaurant = notification_setup

    approve_restaurant(restaurant.id, admin)

    notification = EmailNotification.objects.get(
        restaurant=restaurant,
        event=EmailNotification.Event.RESTAURANT_APPROVED,
    )

    assert notification.recipient_email == owner.email
    assert notification.status == EmailNotification.Status.PENDING
    assert restaurant.name in notification.body


@pytest.mark.django_db
def test_rejection_queues_reason(notification_setup):
    admin, owner, restaurant = notification_setup

    reject_restaurant(
        restaurant.id,
        admin,
        "Please update your restaurant details.",
    )

    notification = EmailNotification.objects.get(
        restaurant=restaurant,
        event=EmailNotification.Event.RESTAURANT_REJECTED,
    )

    assert notification.recipient_email == owner.email
    assert "Please update" in notification.body
    assert notification.status == EmailNotification.Status.PENDING


@pytest.mark.django_db
def test_resubmission_notifies_admin(notification_setup):
    admin, owner, restaurant = notification_setup

    reject_restaurant(
        restaurant.id,
        admin,
        "Please correct the city.",
    )

    resubmit_rejected_restaurant(owner)

    notification = EmailNotification.objects.get(
        restaurant=restaurant,
        event=EmailNotification.Event.RESTAURANT_RESUBMITTED,
        recipient_email=admin.email,
    )

    assert notification.status == EmailNotification.Status.PENDING


@pytest.mark.django_db
def test_duplicate_approval_does_not_queue_twice(
    notification_setup,
):
    from approvals.services import InvalidStatusTransition

    admin, owner, restaurant = notification_setup

    approve_restaurant(restaurant.id, admin)

    with pytest.raises(InvalidStatusTransition):
        approve_restaurant(restaurant.id, admin)

    assert (
        EmailNotification.objects.filter(
            restaurant=restaurant,
            event=EmailNotification.Event.RESTAURANT_APPROVED,
        ).count()
        == 1
    )
