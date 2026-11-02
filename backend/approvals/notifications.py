from django.conf import settings

from accounts.models import User

from .models import EmailNotification


def queue_restaurant_approved(restaurant):
    """Queue an approval email for the restaurant owner."""
    return EmailNotification.objects.create(
        restaurant=restaurant,
        event=EmailNotification.Event.RESTAURANT_APPROVED,
        recipient_email=restaurant.owner.email,
        subject="Aviyal Eats - Restaurant Approved",
        body=(
            f"Hello {restaurant.owner.full_name},\n\n"
            f"Your restaurant '{restaurant.name}' has been approved.\n\n"
            "You can now access the approved restaurant dashboard.\n\n"
            "Regards,\nAviyal Eats"
        ),
    )


def queue_restaurant_rejected(restaurant):
    """Queue a rejection email containing the review reason."""
    return EmailNotification.objects.create(
        restaurant=restaurant,
        event=EmailNotification.Event.RESTAURANT_REJECTED,
        recipient_email=restaurant.owner.email,
        subject="Aviyal Eats - Restaurant Application Update",
        body=(
            f"Hello {restaurant.owner.full_name},\n\n"
            f"Your restaurant '{restaurant.name}' requires changes.\n\n"
            f"Reason: {restaurant.rejection_reason}\n\n"
            "Please update your restaurant details and resubmit "
            "the application for review.\n\n"
            "Regards,\nAviyal Eats"
        ),
    )


def queue_restaurant_resubmitted(restaurant):
    """Queue review notifications for active Super Admins."""
    admins = User.objects.filter(
        role=User.Role.SUPER_ADMIN,
        is_active=True,
        is_staff=True,
        is_superuser=True,
    )

    notifications = [
        EmailNotification(
            restaurant=restaurant,
            event=EmailNotification.Event.RESTAURANT_RESUBMITTED,
            recipient_email=admin.email,
            subject="Aviyal Eats - Restaurant Resubmitted",
            body=(
                f"Restaurant '{restaurant.name}' has been "
                "resubmitted for approval.\n\n"
                f"Restaurant ID: {restaurant.id}\n"
                f"Owner: {restaurant.owner.email}\n\n"
                "Please review the updated application."
            ),
        )
        for admin in admins
    ]

    return EmailNotification.objects.bulk_create(notifications)
