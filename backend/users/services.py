import logging

from django.contrib.auth import authenticate
from django.db import IntegrityError, transaction
from rest_framework.exceptions import ErrorDetail, ValidationError
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from users.exceptions import (
    IncorrectPasswordError,
    InvalidCredentialsError,
    TokenOwnershipError,
)
from users.models import User

logger = logging.getLogger(__name__)


def register_user(*, username, email, password, first_name="", last_name=""):
    """Create a user only after serializer validation has succeeded."""
    try:
        with transaction.atomic():
            return User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name or "",
                last_name=last_name or "",
            )
    except IntegrityError:
        if User.objects.filter(username=username).exists():
            raise ValidationError(
                {
                    "username": [
                        ErrorDetail(
                            "A user with that username already exists.",
                            code="unique",
                        )
                    ]
                }
            ) from None
        raise ValidationError(
            {
                "email": [
                    ErrorDetail("A user with this email already exists.", code="unique")
                ]
            }
        ) from None


def issue_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def login_user(*, username, password):
    user = authenticate(username=username, password=password)
    if user is None or not user.is_active:
        logger.info("Authentication failed for username=%s", username)
        raise InvalidCredentialsError()

    logger.info("Authentication succeeded for user_id=%s", user.pk)
    return issue_tokens_for_user(user)


def refresh_tokens(*, refresh):
    serializer = TokenRefreshSerializer(data={"refresh": refresh})
    try:
        serializer.is_valid(raise_exception=True)
    except TokenError as exc:
        raise InvalidToken({"detail": str(exc), "code": "token_not_valid"}) from exc
    return serializer.validated_data


def logout_user(*, user, refresh):
    try:
        token = RefreshToken(refresh)
    except TokenError as exc:
        raise ValidationError({"refresh": "Invalid or expired refresh token."}) from exc

    token_user_id = token.payload.get(api_settings.USER_ID_CLAIM)
    if str(token_user_id) != str(user.pk):
        raise TokenOwnershipError()

    token.blacklist()
    logger.info("Refresh token blacklisted for user_id=%s", user.pk)


def update_profile(user, *, validated_data):
    for field, value in validated_data.items():
        setattr(user, field, value)
    user.save(update_fields=[*validated_data.keys(), "updated_at"])
    return user


def blacklist_user_refresh_tokens(user):
    """Invalidate outstanding refresh tokens after a password change."""
    for outstanding in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=outstanding)


def change_password(*, user, old_password, new_password):
    if not user.check_password(old_password):
        logger.info("Password change rejected: incorrect current password user_id=%s", user.pk)
        raise IncorrectPasswordError()

    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])
    blacklist_user_refresh_tokens(user)
    logger.info("Password changed and refresh tokens revoked for user_id=%s", user.pk)
    return user
