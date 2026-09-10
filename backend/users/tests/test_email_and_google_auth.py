from unittest.mock import patch
from django.core import mail
from django.urls import reverse
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User
from users.tokens import email_verification_token_generator
from users.tests import create_user


class EmailVerificationAPITests(APITestCase):
    def setUp(self):
        self.user = create_user(
            username="verifyuser",
            email="verifyuser@example.com",
            is_email_verified=False,
        )
        self.verify_url = reverse("auth-verify-email")
        self.resend_url = reverse("auth-resend-verification")

    def test_new_registered_user_can_login_immediately(self):
        register_url = reverse("auth-register")
        payload = {
            "email": "immediateuser@example.com",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "first_name": "Immediate",
            "last_name": "User",
        }
        res = self.client.post(register_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email="immediateuser@example.com")
        self.assertTrue(new_user.is_email_verified)

        # Immediate login succeeds
        login_url = reverse("auth-login")
        login_res = self.client.post(
            login_url,
            {"username": "immediateuser@example.com", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_res.data)
        self.assertIn("refresh", login_res.data)

    def test_login_rejects_incorrect_password(self):
        login_url = reverse("auth-login")
        res = self.client.post(
            login_url,
            {"username": self.user.username, "password": "WrongPassword123!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("access", res.data)

    def test_unverified_user_can_login_when_verification_disabled(self):
        login_url = reverse("auth-login")
        # self.user has is_email_verified=False in setUp
        res = self.client.post(
            login_url,
            {"username": self.user.username, "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_unverified_user_login_rejected_when_verification_enabled(self):
        from django.test import override_settings

        with override_settings(EMAIL_VERIFICATION_REQUIRED=True):
            login_url = reverse("auth-login")
            res = self.client.post(
                login_url,
                {"username": self.user.username, "password": "StrongPassword123!"},
                format="json",
            )
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertNotIn("access", res.data)
            self.assertNotIn("refresh", res.data)
            self.assertIn("Please verify your email address before signing in", str(res.data.get("detail", "")))

    def test_verify_email_success(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = email_verification_token_generator.make_token(self.user)

        response = self.client.post(
            self.verify_url,
            {"uid": uid, "token": token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_email_verified)
        self.assertIn("Email verified successfully", response.data["detail"])

    def test_verify_email_invalid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        invalid_token = "invalid-token-12345"

        response = self.client.post(
            self.verify_url,
            {"uid": uid, "token": invalid_token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)

    @patch("django.contrib.auth.tokens.PasswordResetTokenGenerator.check_token")
    def test_verify_email_expired_token(self, mock_check):
        mock_check.return_value = False
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = email_verification_token_generator.make_token(self.user)

        response = self.client.post(
            self.verify_url,
            {"uid": uid, "token": token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)

    def test_verify_email_malformed_uid(self):
        response = self.client.post(
            self.verify_url,
            {"uid": "not-valid-base64!@", "token": "some-token"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)

    def test_verify_email_cross_account_token_rejected(self):
        other_user = create_user(username="otheraccount", email="otheraccount@example.com", is_email_verified=False)
        # Token generated for other_user
        token_for_other = email_verification_token_generator.make_token(other_user)
        # UID for self.user
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        response = self.client.post(
            self.verify_url,
            {"uid": uid, "token": token_for_other},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_email_verified)

    def test_resend_verification_email(self):
        response = self.client.post(
            self.resend_url,
            {"email": "verifyuser@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Verify your Learning Intelligence Platform account", mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, ["verifyuser@example.com"])

    def test_resend_verification_email_already_verified(self):
        self.user.is_email_verified = True
        self.user.save()

        response = self.client.post(
            self.resend_url,
            {"email": "verifyuser@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already verified", response.data["detail"])


class GoogleAuthAPITests(APITestCase):
    def setUp(self):
        self.google_url = reverse("auth-google")

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_login_creates_new_user_and_returns_jwt(self, mock_verify):
        mock_verify.return_value = {
            "email": "googleuser@example.com",
            "name": "Google User",
            "email_verified": True,
        }

        response = self.client.post(
            self.google_url,
            {"id_token": "valid-mock-google-id-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        # Verify user was created in database and is_email_verified is set
        user = User.objects.get(email="googleuser@example.com")
        self.assertTrue(user.is_email_verified)

    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_google_login_existing_user(self, mock_verify):
        existing_user = create_user(
            username="existinggoogle",
            email="existing@example.com",
            is_email_verified=False,
        )

        mock_verify.return_value = {
            "email": "existing@example.com",
            "name": "Existing User",
            "email_verified": True,
        }

        response = self.client.post(
            self.google_url,
            {"id_token": "valid-mock-google-id-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        existing_user.refresh_from_db()
        self.assertTrue(existing_user.is_email_verified)
