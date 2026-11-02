from django.urls import path

from .views import (
    RegisterView,
    VerifyRegistrationOTPView,
    ResendRegistrationOTPView,
    LoginView,
    MeView,
    CSRFView,
    RefreshView,
    LogoutView,
    LogoutAllView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path(
        "register/verify-otp/",
        VerifyRegistrationOTPView.as_view(),
        name="register-verify-otp",
    ),
    path(
        "register/resend-otp/",
        ResendRegistrationOTPView.as_view(),
        name="register-resend-otp",
    ),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("csrf/", CSRFView.as_view(), name="auth-csrf"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("logout-all/", LogoutAllView.as_view(), name="auth-logout-all"),
    path(
        "password-reset/request/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
]
