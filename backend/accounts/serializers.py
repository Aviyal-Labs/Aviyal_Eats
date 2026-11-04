from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .managers import UserManager


# --------------------------------------------------
#          Owner Registration Serializer
# --------------------------------------------------
class OwnerRegistrationSerializer(serializers.Serializer):
    owner_full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    mobile = serializers.CharField(max_length=20)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    restaurant_name = serializers.CharField(max_length=200)
    restaurant_phone = serializers.CharField(max_length=20)
    city = serializers.CharField(max_length=100)
    slug = serializers.SlugField(max_length=100)

    def validate_email(self, value):
        return UserManager().normalize_email_address(value)

    def validate_mobile(self, value):
        try:
            return UserManager.normalize_mobile(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))

    def validate_restaurant_phone(self, value):
        try:
            return UserManager.normalize_mobile(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)

        return value

    def validate_owner_full_name(self, value):
        return value.strip()

    def validate_restaurant_name(self, value):
        return value.strip()

    def validate_slug(self, value):
        return value.lower()


# --------------------------------------------------
#          Verify otp for registration
# --------------------------------------------------
class VerifyRegistrationOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.RegexField(regex=r"^\d{6}$")

    def validate_email(self, value):
        return value.strip().lower()


# --------------------------------------------------
#          Resend Registration Otp
# --------------------------------------------------
class ResendRegistrationOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()

# --------------------------------------------------
#          Login Serializer
# --------------------------------------------------
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_email(self, value):
        return value.strip().lower()

# --------------------------------------------------
#           PASSWORD RESET REQUEST
# --------------------------------------------------
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


# --------------------------------------------------
#           PASSWORD RESET CONFIRM
# --------------------------------------------------
class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.RegexField(regex=r"^\d{6}$")
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_email(self, value):
        return value.strip().lower()

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)

        return value

# --------------------------------------------------
#           Google Login serializer
# --------------------------------------------------
class GoogleLoginSerializer(serializers.Serializer):
    credential = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=10000,
        trim_whitespace=True,
    )


# --------------------------------------------------
#           Google Sign Up serializer
# --------------------------------------------------
class GoogleSignupSerializer(serializers.Serializer):
    credential = serializers.CharField(
        max_length=10000,
        trim_whitespace=True,
    )

    mobile = serializers.CharField(
        max_length=20,
    )

    restaurant_name = serializers.CharField(
        max_length=200,
    )

    restaurant_phone = serializers.CharField(
        max_length=20,
    )

    city = serializers.CharField(
        max_length=100,
    )

    requested_slug = serializers.SlugField(
        max_length=100,
    )

    def validate_mobile(self, value):
        try:
            return UserManager.normalize_mobile(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))

    def validate_restaurant_phone(self, value):
        return self.validate_mobile(value)

    def validate_requested_slug(self, value):
        return value.strip().lower()
