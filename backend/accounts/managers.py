import re

from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    use_in_migrations = True

    @staticmethod
    def normalize_mobile(mobile):
        if not mobile:
            return None

        mobile = re.sub(r"[\s().-]", "", mobile.strip())

        if not re.fullmatch(r"\+[1-9]\d{7,14}", mobile):
            raise ValueError("Mobile number must use international E.164 format.")

        return mobile

    def normalize_email_address(self, email):
        if not email:
            raise ValueError("Email address is required.")

        return self.normalize_email(email.strip()).lower()

    def create_user(self, email, password=None, **extra_fields):
        email = self.normalize_email_address(email)

        if not password:
            raise ValueError("Password is required.")

        extra_fields["mobile"] = self.normalize_mobile(extra_fields.get("mobile"))

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.full_clean()
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", self.model.Role.SUPER_ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields["role"] != self.model.Role.SUPER_ADMIN:
            raise ValueError("Superuser must have SUPER_ADMIN role.")

        if extra_fields["is_staff"] is not True:
            raise ValueError("Superuser must have is_staff=True.")

        if extra_fields["is_superuser"] is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


    def create_google_user(self, email, **extra_fields):
        """
        Create a user authenticated through Google,
        without a local password.

        Call only after verifying Google's ID token.
        """
        email = self.normalize_email_address(email)

        extra_fields["role"] = self.model.Role.OWNER
        extra_fields["is_staff"] = False
        extra_fields["is_superuser"] = False

        user = self.model(
            email=email,
            **extra_fields,
        )

        user.set_unusable_password()
        user.save(using=self._db)

        return user
