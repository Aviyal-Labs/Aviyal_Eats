from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import ResendRegistrationOTPSerializer
from .services import resend_registration_otp
from .serializers import (
    OwnerRegistrationSerializer,
    VerifyRegistrationOTPSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from .services import (
    create_pending_registration,
    verify_registration_otp,
    request_password_reset,
    confirm_password_reset,
)
from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated
from .serializers import LoginSerializer
from .tokens import create_login_session
from restaurants.models import Restaurant
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
import uuid
from django.db import transaction
from django.utils import timezone
from .models import AuthSession
from .tokens import (
    rotate_refresh_token,
    RefreshAuthenticationError,
)
from .login_security import authenticate_with_limits

# ----------------------------
#      Register View
# ----------------------------
class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = OwnerRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = create_pending_registration(
            serializer.validated_data
        )

        return Response(
            {
                "success": True,
                "message": "Verification code sent if the request is eligible.",
                "data": result,
            },
            status=status.HTTP_202_ACCEPTED,
        )


# --------------------------------------
#      Verify Registration with Otp
# --------------------------------------
class VerifyRegistrationOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = VerifyRegistrationOTPSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        result = verify_registration_otp(
            email=serializer.validated_data["email"],
            otp=serializer.validated_data["otp"],
        )

        return Response(
            {
                "success": True,
                "message": "Email verified. Registration submitted for approval.",
                "data": result,
            },
            status=status.HTTP_201_CREATED,
        )


# --------------------------------------
#      Resend Registration Otp
# --------------------------------------

class ResendRegistrationOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ResendRegistrationOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = resend_registration_otp(email=serializer.validated_data["email"])

        return Response(
            {
                "success": True,
                "message": (
                    "If the registration is eligible, "
                    "a verification code has been sent."
                ),
                "data": result,
            },
            status=status.HTTP_200_OK,
        )


# USER PAYLOAD FOR RETURN
def user_payload(user):
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "mobile": user.mobile,
        "role": user.role,
        "email_verified_at": (
            user.email_verified_at.isoformat() if user.email_verified_at else None
        ),
    }

# RESTAURANT PAYLOAD FOR RETURN
def restaurant_payload(user):
    if user.role != user.Role.OWNER:
        return None

    restaurant = Restaurant.objects.filter(owner=user).first()

    if restaurant is None:
        return None

    return {
        "id": str(restaurant.id),
        "name": restaurant.name,
        "slug": restaurant.slug,
        "status": restaurant.status,
    }


# --------------------------------------
#             Login View
# --------------------------------------
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = authenticate_with_limits(
            request=request,
            email=email,
            password=password,
        )

        if user is None or not user.is_active:
            raise AuthenticationFailed("Invalid email or password.")

        tokens = create_login_session(user)

        response = Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {
                    "access_token": tokens["access_token"],
                    "access_expires_in": tokens["access_expires_in"],
                    "user": user_payload(user),
                    "restaurant": restaurant_payload(user),
                },
            },
            status=status.HTTP_200_OK,
        )

        response.set_cookie(
            key=settings.REFRESH_COOKIE_NAME,
            value=tokens["refresh_token"],
            max_age=settings.REFRESH_COOKIE_MAX_AGE,
            path=settings.REFRESH_COOKIE_PATH,
            secure=settings.REFRESH_COOKIE_SECURE,
            httponly=settings.REFRESH_COOKIE_HTTPONLY,
            samesite=settings.REFRESH_COOKIE_SAMESITE,
        )

        return response


# --------------------------------------
#             ME VIEW
# --------------------------------------
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "success": True,
                "message": "Account details fetched.",
                "data": {
                    "user": user_payload(request.user),
                    "restaurant": restaurant_payload(request.user),
                },
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CSRFView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "success": True,
                "message": "CSRF token initialized.",
                "data": {
                    "csrf_token": get_token(request),
                },
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_protect, name="dispatch")
class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)

        try:
            tokens = rotate_refresh_token(raw_refresh)
        except RefreshAuthenticationError:
            response = Response(
                {
                    "success": False,
                    "code": "INVALID_REFRESH_SESSION",
                    "message": (
                        "Refresh session is invalid or expired. " "Please log in again."
                    ),
                    "errors": None,
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
            response.delete_cookie(
                settings.REFRESH_COOKIE_NAME,
                path=settings.REFRESH_COOKIE_PATH,
                samesite=settings.REFRESH_COOKIE_SAMESITE,
            )
            return response

        response = Response(
            {
                "success": True,
                "message": "Access token refreshed.",
                "data": {
                    "access_token": tokens["access_token"],
                    "access_expires_in": tokens["access_expires_in"],
                },
            },
            status=status.HTTP_200_OK,
        )

        response.set_cookie(
            key=settings.REFRESH_COOKIE_NAME,
            value=tokens["refresh_token"],
            max_age=tokens["cookie_max_age"],
            path=settings.REFRESH_COOKIE_PATH,
            secure=settings.REFRESH_COOKIE_SECURE,
            httponly=True,
            samesite=settings.REFRESH_COOKIE_SAMESITE,
        )

        return response


def clear_refresh_cookie(response):
    """Remove the refresh cookie using its configured path."""
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        path=settings.REFRESH_COOKIE_PATH,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )
    return response


def get_current_session_id(request):
    """
    Extract the server-side session ID from
    the already authenticated access JWT.
    """
    try:
        return uuid.UUID(str(request.auth["session_id"]))
    except (KeyError, TypeError, ValueError, AttributeError):
        raise AuthenticationFailed("Invalid authentication session.")


# ----------------------------------
#        LOG OUT VIEW
# -----------------------------------
@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = get_current_session_id(request)
        now = timezone.now()

        with transaction.atomic():
            session = (
                AuthSession.objects.select_for_update()
                .filter(
                    id=session_id,
                    user=request.user,
                    revoked_at__isnull=True,
                )
                .first()
            )

            if session is None:
                raise AuthenticationFailed("Session is no longer active.")

            session.revoked_at = now
            session.revocation_reason = AuthSession.RevocationReason.LOGOUT
            session.save(
                update_fields=[
                    "revoked_at",
                    "revocation_reason",
                    "updated_at",
                ]
            )

        response = Response(status=status.HTTP_204_NO_CONTENT)
        return clear_refresh_cookie(response)


# ----------------------------------
#       LOG OUT ALL VIEW
# -----------------------------------
@method_decorator(csrf_protect, name="dispatch")
class LogoutAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        now = timezone.now()

        with transaction.atomic():
            AuthSession.objects.filter(
                user=request.user,
                revoked_at__isnull=True,
            ).update(
                revoked_at=now,
                revocation_reason=(AuthSession.RevocationReason.LOGOUT_ALL),
                updated_at=now,
            )

        response = Response(status=status.HTTP_204_NO_CONTENT)
        return clear_refresh_cookie(response)


# ----------------------------------
#      PASSWORD RESET REQUEST
# -----------------------------------
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = request_password_reset(serializer.validated_data["email"])

        return Response(
            {
                "success": True,
                "message": result["message"],
                "data": None,
            },
            status=status.HTTP_200_OK,
        )

# ----------------------------------
#      PASSWORD RESET CONFIRM
# -----------------------------------
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        confirm_password_reset(
            email=serializer.validated_data["email"],
            otp=serializer.validated_data["otp"],
            new_password=serializer.validated_data["new_password"],
        )

        return Response(
            {
                "success": True,
                "message": "Password reset successful. Please log in.",
                "data": None,
            },
            status=status.HTTP_200_OK,
        )
