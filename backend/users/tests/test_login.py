from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.tests import VALID_PASSWORD, create_user


class LoginAPITests(APITestCase):
    def setUp(self):
        self.url = reverse("auth-login")
        self.user = create_user()

    def test_successful_login(self):
        response = self.client.post(
            self.url,
            {"username": "saivineeth", "password": VALID_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertNotIn("password", response.data)

    def test_invalid_password(self):
        response = self.client.post(
            self.url,
            {"username": "saivineeth", "password": "WrongPassword123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("access", response.data)

    def test_invalid_credentials_unknown_user(self):
        response = self.client.post(
            self.url,
            {"username": "missing", "password": VALID_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_cannot_login(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(
            self.url,
            {"username": "saivineeth", "password": VALID_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_is_never_returned_on_login(self):
        response = self.client.post(
            self.url,
            {"username": "saivineeth", "password": VALID_PASSWORD},
            format="json",
        )

        self.assertNotIn(VALID_PASSWORD, str(response.content))

    def test_successful_login_with_email(self):
        response = self.client.post(
            self.url,
            {"username": "user@example.com", "password": VALID_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

