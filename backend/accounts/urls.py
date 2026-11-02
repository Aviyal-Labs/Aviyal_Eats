from django.urls import path

from .views import (
    RegisterView,
    VerifyRegistrationOTPView,
    ResendRegistrationOTPView,
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
]
