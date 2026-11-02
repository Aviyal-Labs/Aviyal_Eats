from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import ResendRegistrationOTPSerializer
from .services import resend_registration_otp
from .serializers import (
    OwnerRegistrationSerializer,
    VerifyRegistrationOTPSerializer,
)
from .services import (
    create_pending_registration,
    verify_registration_otp,
)


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
