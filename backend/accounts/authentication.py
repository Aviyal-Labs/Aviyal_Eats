import uuid

from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import AuthSession


class SessionJWTAuthentication(JWTAuthentication):
    """Require both a valid JWT and an active database session."""

    def authenticate(self, request):
        result = super().authenticate(request)

        if result is None:
            return None

        user, validated_token = result

        session_id = validated_token.get("session_id")

        if not session_id:
            raise AuthenticationFailed("Token does not contain a session.")

        try:
            session_uuid = uuid.UUID(str(session_id))
        except (ValueError, TypeError, AttributeError):
            raise AuthenticationFailed("Invalid authentication session.")

        session_exists = AuthSession.objects.filter(
            id=session_uuid,
            user=user,
            revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).exists()

        if not session_exists:
            raise AuthenticationFailed("Session has expired or was revoked.")

        return user, validated_token
