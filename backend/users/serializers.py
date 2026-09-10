from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from users.models import User


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True, default="")
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "password_confirm",
        )
        extra_kwargs = {
            "email": {"required": True, "allow_blank": False},
            "first_name": {"required": False, "allow_blank": True},
            "last_name": {"required": False, "allow_blank": True},
        }

    def validate_email(self, value):
        return value.strip().lower()

    def validate_username(self, value):
        return value.strip() if value else ""

    def validate(self, attrs):
        password = attrs["password"]
        password_confirm = attrs.pop("password_confirm")
        if password != password_confirm:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )

        email = attrs.get("email", "").strip().lower()
        username = attrs.get("username", "").strip()
        if not username and email:
            base_username = email.split("@")[0]
            clean_base = "".join(c for c in base_username if c.isalnum() or c in "@.+-_") or "user"
            candidate = clean_base
            idx = 1
            while User.objects.filter(username__iexact=candidate).exists():
                candidate = f"{clean_base}{idx}"
                idx += 1
            attrs["username"] = candidate
            username = candidate

        user = User(
            username=username,
            email=email,
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)


class RefreshRequestSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_email_verified",
            "date_joined",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "username",
            "is_email_verified",
            "date_joined",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "email": {"allow_blank": False},
        }

    def validate_email(self, value):
        return value.strip().lower()


class VerifyEmailSerializer(serializers.Serializer):
    uid = serializers.CharField(required=False)
    uidb64 = serializers.CharField(required=False)
    token = serializers.CharField(required=True)

    def validate(self, attrs):
        uid = attrs.get("uid") or attrs.get("uidb64")
        if not uid:
            raise serializers.ValidationError({"uid": "User identifier is required."})
        attrs["uid"] = uid
        return attrs



class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(required=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords do not match."}
            )
        user = self.context["request"].user
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)}) from exc
        return attrs

