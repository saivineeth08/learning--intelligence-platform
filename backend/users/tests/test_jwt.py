from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from users.tests import VALID_PASSWORD, auth_header, create_user


class JWTAPITests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.login_url = reverse("auth-login")
        self.refresh_url = reverse("auth-refresh")
        self.profile_url = reverse("auth-profile")

    def _login(self):
        response = self.client.post(
            self.login_url,
            {"username": self.user.username, "password": VALID_PASSWORD},
            format="json",
        )
        return response.data["access"], response.data["refresh"]

    def test_token_refresh(self):
        _, refresh = self._login()

        response = self.client.post(
            self.refresh_url, {"refresh": refresh}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertNotEqual(response.data["refresh"], refresh)

    def test_rotated_refresh_token_cannot_be_reused(self):
        _, refresh = self._login()
        first = self.client.post(self.refresh_url, {"refresh": refresh}, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self.client.post(self.refresh_url, {"refresh": refresh}, format="json")
        self.assertEqual(second.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_with_valid_token(self):
        access, _ = self._login()

        response = self.client.get(self.profile_url, **auth_header(access))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], self.user.username)

    def test_protected_endpoint_without_token(self):
        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_with_invalid_token(self):
        response = self.client.get(self.profile_url, **auth_header("not-a-valid-token"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_with_expired_token(self):
        token = AccessToken.for_user(self.user)
        token.set_exp(from_time=timezone.now() - timedelta(hours=1))

        response = self.client.get(self.profile_url, **auth_header(str(token)))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_with_invalid_token(self):
        response = self.client.post(
            self.refresh_url, {"refresh": "invalid-refresh"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_token_cannot_be_used_as_refresh_token(self):
        access, _ = self._login()

        response = self.client.post(
            self.refresh_url, {"refresh": access}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_cannot_access_protected_endpoint(self):
        refresh = RefreshToken.for_user(self.user)

        response = self.client.get(self.profile_url, **auth_header(str(refresh)))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
