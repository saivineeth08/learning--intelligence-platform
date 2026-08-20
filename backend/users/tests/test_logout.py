from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from users.tests import VALID_PASSWORD, auth_header, create_user


class LogoutAPITests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.other = create_user(username="otheruser", email="other@example.com")
        self.url = reverse("auth-logout")
        self.refresh_url = reverse("auth-refresh")
        login = self.client.post(
            reverse("auth-login"),
            {"username": self.user.username, "password": VALID_PASSWORD},
            format="json",
        )
        self.access = login.data["access"]
        self.refresh = login.data["refresh"]

    def test_refresh_token_is_blacklisted(self):
        response = self.client.post(
            self.url,
            {"refresh": self.refresh},
            format="json",
            **auth_header(self.access),
        )

        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)
        self.assertTrue(BlacklistedToken.objects.exists())

    def test_blacklisted_refresh_token_cannot_be_reused(self):
        self.client.post(
            self.url,
            {"refresh": self.refresh},
            format="json",
            **auth_header(self.access),
        )

        response = self.client.post(
            self.refresh_url, {"refresh": self.refresh}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_authentication(self):
        response = self.client.post(
            self.url, {"refresh": self.refresh}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_blacklist_another_users_refresh_token(self):
        other_login = self.client.post(
            reverse("auth-login"),
            {"username": self.other.username, "password": VALID_PASSWORD},
            format="json",
        )

        response = self.client.post(
            self.url,
            {"refresh": other_login.data["refresh"]},
            format="json",
            **auth_header(self.access),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        reuse = self.client.post(
            self.refresh_url,
            {"refresh": other_login.data["refresh"]},
            format="json",
        )
        self.assertEqual(reuse.status_code, status.HTTP_200_OK)

    def test_invalid_refresh_token_on_logout(self):
        response = self.client.post(
            self.url,
            {"refresh": "not-a-token"},
            format="json",
            **auth_header(self.access),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
