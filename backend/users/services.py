import logging
import secrets

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
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
    EmailNotVerifiedError,
    IncorrectPasswordError,
    InvalidCredentialsError,
    TokenOwnershipError,
)
from users.models import User
from users.tokens import email_verification_token_generator

logger = logging.getLogger(__name__)


def send_verification_email(user, request=None):
    """Generate secure verification token and send email to user."""
    try:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token_generator.make_token(user)
        frontend_url = getattr(
            settings, "FRONTEND_URL", "http://localhost:5173"
        ).rstrip("/")
        verify_url = f"{frontend_url}/verify-email?uid={uid}&token={token}"

        subject = "Verify your Learning Intelligence Platform account"
        message = (
            f"Hello {user.first_name or user.username},\n\n"
            f"Thank you for registering on Learning Intelligence Platform!\n\n"
            f"Please verify your email address by clicking the link below:\n"
            f"{verify_url}\n\n"
            f"If you did not register for an account, please disregard this email.\n"
        )
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(
            "Verification email sent to user_id=%s email=%s", user.pk, user.email
        )
    except Exception as e:
        logger.error(
            "Failed to send verification email to user_id=%s: %s", user.pk, str(e)
        )


def verify_email(*, uid, token):
    """Verify email verification token and mark user as email verified."""
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise ValidationError({"token": "Invalid or expired verification link."})

    if not email_verification_token_generator.check_token(user, token):
        raise ValidationError({"token": "Invalid or expired verification link."})

    user.is_email_verified = True
    user.save(update_fields=["is_email_verified", "updated_at"])
    logger.info("Email successfully verified for user_id=%s", user.pk)
    return user


def resend_verification_email(*, email, request=None):
    """Resend email verification token for unverified user."""
    clean_email = email.strip().lower()
    try:
        user = User.objects.get(email=clean_email)
        if not user.is_email_verified:
            send_verification_email(user, request=request)
            return {"detail": "Verification email resent successfully."}
        raise ValidationError({"detail": "Email is already verified."})
    except User.DoesNotExist:
        return {
            "detail": "If an account exists with this email, a verification link has been sent."
        }



def register_user(*, username, email, password, first_name="", last_name=""):
    """Create a user. Email verification is temporarily disabled so users can log in immediately."""
    verification_required = getattr(settings, "EMAIL_VERIFICATION_REQUIRED", False)
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name or "",
                last_name=last_name or "",
                is_email_verified=not verification_required,
            )
            if verification_required:
                send_verification_email(user)
            return user
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
    clean_identifier = username.strip()
    lookup_user = User.objects.filter(email__iexact=clean_identifier).first()
    auth_username = lookup_user.username if lookup_user else clean_identifier
    user = authenticate(username=auth_username, password=password)
    if user is None or not user.is_active:
        logger.info("Authentication failed for identifier=%s", clean_identifier)
        raise InvalidCredentialsError()

    verification_required = getattr(settings, "EMAIL_VERIFICATION_REQUIRED", False)
    if verification_required and not user.is_email_verified:
        logger.info("Login rejected: email not verified for user_id=%s", user.pk)
        raise EmailNotVerifiedError()

    logger.info("Authentication succeeded for user_id=%s", user.pk)
    return issue_tokens_for_user(user)


def verify_google_token(*, id_token_str):
    """Verify Google OAuth id_token and create/authenticate local user."""
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token

        client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
        request = google_requests.Request()
        id_info = google_id_token.verify_oauth2_token(
            id_token_str, request, audience=client_id if client_id else None
        )

        email = id_info.get("email", "").lower().strip()
        if not email:
            raise ValidationError(
                {"id_token": "Google token does not contain an email address."}
            )

        first_name = id_info.get("given_name", "")
        last_name = id_info.get("family_name", "")

        user = User.objects.filter(email=email).first()
        if not user:
            base_username = email.split("@")[0]
            username = base_username
            idx = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{idx}"
                idx += 1

            random_password = secrets.token_urlsafe(32)
            user = User.objects.create_user(
                username=username,
                email=email,
                password=random_password,
                first_name=first_name,
                last_name=last_name,
                is_email_verified=True,
            )
            logger.info("New user registered via Google OAuth user_id=%s", user.pk)
        else:
            if not user.is_email_verified:
                user.is_email_verified = True
                user.save(update_fields=["is_email_verified", "updated_at"])
            logger.info("Existing user logged in via Google OAuth user_id=%s", user.pk)

        return issue_tokens_for_user(user)

    except Exception as e:
        logger.error("Google token verification failed: %s", str(e))
        raise ValidationError(
            {"id_token": f"Invalid Google authentication token: {str(e)}"}
        )


def refresh_tokens(*, refresh):
    serializer = TokenRefreshSerializer(data={"refresh": refresh})
    try:
        serializer.is_valid(raise_exception=True)
    except TokenError as exc:
        raise InvalidToken(
            {"detail": str(exc), "code": "token_not_valid"}
        ) from exc
    return serializer.validated_data


def logout_user(*, user, refresh):
    try:
        token = RefreshToken(refresh)
    except TokenError as exc:
        raise ValidationError(
            {"refresh": "Invalid or expired refresh token."}
        ) from exc

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
        logger.info(
            "Password change rejected: incorrect current password user_id=%s", user.pk
        )
        raise IncorrectPasswordError()

    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])
    blacklist_user_refresh_tokens(user)
    logger.info("Password changed and refresh tokens revoked for user_id=%s", user.pk)
    return user

