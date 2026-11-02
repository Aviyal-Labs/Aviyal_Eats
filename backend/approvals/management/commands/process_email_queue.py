from datetime import timedelta

from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from approvals.models import EmailNotification

MAX_ATTEMPTS = 5
STALE_AFTER = timedelta(minutes=10)


def claim_next_notification():
    """Atomically claim one eligible email job."""
    now = timezone.now()

    ready = Q(
        status__in=[
            EmailNotification.Status.PENDING,
            EmailNotification.Status.FAILED,
        ],
        next_attempt_at__lte=now,
        attempt_count__lt=MAX_ATTEMPTS,
    )

    stale = Q(
        status=EmailNotification.Status.PROCESSING,
        processing_started_at__lte=now - STALE_AFTER,
        attempt_count__lt=MAX_ATTEMPTS,
    )

    with transaction.atomic():
        notification = (
            EmailNotification.objects.select_for_update(skip_locked=True)
            .filter(ready | stale)
            .order_by("created_at", "id")
            .first()
        )

        if notification is None:
            return None

        notification.status = EmailNotification.Status.PROCESSING
        notification.processing_started_at = now
        notification.attempt_count += 1
        notification.save(
            update_fields=[
                "status",
                "processing_started_at",
                "attempt_count",
                "updated_at",
            ]
        )

        return notification


def deliver_notification(notification):
    """Send a claimed job and save its delivery result."""
    try:
        sent_count = send_mail(
            subject=notification.subject,
            message=notification.body,
            from_email=None,
            recipient_list=[notification.recipient_email],
            fail_silently=False,
        )

        if sent_count != 1:
            raise RuntimeError("Email backend did not send a message.")

        succeeded = True
        error_type = ""

    except Exception as exc:
        succeeded = False
        # Do not persist exception messages: they may contain secrets.
        error_type = type(exc).__name__

    now = timezone.now()

    with transaction.atomic():
        # Guard against an older worker overwriting a reclaimed job.
        job = EmailNotification.objects.select_for_update().get(pk=notification.pk)

        if (
            job.status != EmailNotification.Status.PROCESSING
            or job.processing_started_at != notification.processing_started_at
        ):
            return False

        if succeeded:
            job.status = EmailNotification.Status.SENT
            job.sent_at = now
            job.last_error = ""
        else:
            job.status = EmailNotification.Status.FAILED
            job.last_error = error_type

            # 1, 2, 4, 8 minutes between retries.
            delay_minutes = 2 ** (job.attempt_count - 1)
            job.next_attempt_at = now + timedelta(minutes=delay_minutes)

        job.processing_started_at = None
        job.save(
            update_fields=[
                "status",
                "sent_at",
                "last_error",
                "next_attempt_at",
                "processing_started_at",
                "updated_at",
            ]
        )

    return succeeded


class Command(BaseCommand):
    help = "Deliver queued restaurant notification emails."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Maximum emails to process in this run.",
        )

    def handle(self, *args, **options):
        limit = options["limit"]

        if limit < 1:
            raise CommandError("--limit must be positive.")

        processed = 0
        sent = 0

        for _ in range(limit):
            notification = claim_next_notification()

            if notification is None:
                break

            processed += 1

            if deliver_notification(notification):
                sent += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Processed: {processed}, "
                f"Sent: {sent}, "
                f"Failed: {processed - sent}"
            )
        )
