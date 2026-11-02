from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core import mail
from django.core.management import call_command
from django.utils import timezone

from accounts.models import User
from approvals.models import EmailNotification
from restaurants.models import Restaurant


@pytest.fixture
def queued_email(db):
    owner = User.objects.create_user(
        email="queue-owner@example.com",
        password="QueueTest@123",
        full_name="Queue Test Owner",
        role=User.Role.OWNER,
    )

    restaurant = Restaurant.objects.create(
        owner=owner,
        name="Queue Test Kitchen",
        phone="9876543210",
        city="Kochi",
        slug="queue-test-kitchen",
        status=Restaurant.Status.PENDING,
    )

    return EmailNotification.objects.create(
        restaurant=restaurant,
        event=EmailNotification.Event.RESTAURANT_APPROVED,
        recipient_email=owner.email,
        subject="Restaurant Approved",
        body="Your restaurant has been approved.",
    )


def test_pending_email_is_sent(queued_email):
    call_command("process_email_queue")

    queued_email.refresh_from_db()

    assert queued_email.status == EmailNotification.Status.SENT
    assert queued_email.attempt_count == 1
    assert queued_email.sent_at is not None
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["queue-owner@example.com"]


def test_sent_email_is_not_sent_twice(queued_email):
    call_command("process_email_queue")
    call_command("process_email_queue")

    assert len(mail.outbox) == 1


def test_failed_email_is_scheduled_for_retry(queued_email):
    with patch(
        "approvals.management.commands.process_email_queue.send_mail",
        side_effect=ConnectionError("SMTP unavailable"),
    ):
        call_command("process_email_queue")

    queued_email.refresh_from_db()

    assert queued_email.status == EmailNotification.Status.FAILED
    assert queued_email.attempt_count == 1
    assert queued_email.last_error == "ConnectionError"
    assert queued_email.next_attempt_at > timezone.now()


def test_failed_email_can_be_retried(queued_email):
    with patch(
        "approvals.management.commands.process_email_queue.send_mail",
        side_effect=ConnectionError("SMTP unavailable"),
    ):
        call_command("process_email_queue")

    queued_email.next_attempt_at = timezone.now() - timedelta(seconds=1)
    queued_email.save(update_fields=["next_attempt_at"])

    call_command("process_email_queue")

    queued_email.refresh_from_db()

    assert queued_email.status == EmailNotification.Status.SENT
    assert queued_email.attempt_count == 2
    assert len(mail.outbox) == 1


def test_stale_processing_job_is_recovered(queued_email):
    queued_email.status = EmailNotification.Status.PROCESSING
    queued_email.processing_started_at = timezone.now() - timedelta(minutes=11)
    queued_email.attempt_count = 1
    queued_email.save()

    call_command("process_email_queue")

    queued_email.refresh_from_db()

    assert queued_email.status == EmailNotification.Status.SENT
    assert queued_email.attempt_count == 2
    assert len(mail.outbox) == 1


def test_exhausted_email_is_not_retried(queued_email):
    queued_email.status = EmailNotification.Status.FAILED
    queued_email.attempt_count = 5
    queued_email.next_attempt_at = timezone.now() - timedelta(hours=1)
    queued_email.save()

    call_command("process_email_queue")

    queued_email.refresh_from_db()

    assert queued_email.status == EmailNotification.Status.FAILED
    assert queued_email.attempt_count == 5
    assert len(mail.outbox) == 0
