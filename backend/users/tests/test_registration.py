from django.contrib.auth.hashers import check_password
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User
from users.tests import VALID_PASSWORD, create_user, registration_payload


class RegistrationAPITests(APITestCase):
    def setUp(self):
        self.url = reverse("auth-register")

    def test_successful_registration(self):
        response = self.client.post(self.url, registration_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        user = User.objects.get()
        self.assertEqual(user.username, "saivineeth")
        self.assertEqual(user.email, "user@example.com")
        self.assertEqual(response.data["username"], "saivineeth")
        self.assertEqual(response.data["email"], "user@example.com")

    def test_duplicate_email(self):
        create_user(email="user@example.com")

        response = self.client.post(
            self.url,
            registration_payload(username="otheruser", email="user@example.com"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("email", response.data)
        self.assertEqual(User.objects.count(), 1)

    def test_duplicate_email_is_case_insensitive(self):
        create_user(email="user@example.com")

        response = self.client.post(
            self.url,
            registration_payload(username="otheruser", email="USER@example.com"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(User.objects.count(), 1)

    def test_duplicate_username(self):
        create_user(username="saivineeth")

        response = self.client.post(
            self.url,
            registration_payload(username="saivineeth", email="other@example.com"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("username", response.data)
        self.assertEqual(User.objects.count(), 1)

    def test_invalid_email(self):
        response = self.client.post(
            self.url,
            registration_payload(email="not-an-email"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertFalse(User.objects.exists())

    def test_password_mismatch(self):
        response = self.client.post(
            self.url,
            registration_payload(password_confirm="DifferentPassword123!"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password_confirm", response.data)
        self.assertFalse(User.objects.exists())

    def test_weak_password(self):
        response = self.client.post(
            self.url,
            registration_payload(password="123", password_confirm="123"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
        self.assertFalse(User.objects.exists())

    def test_password_is_hashed(self):
        self.client.post(self.url, registration_payload(), format="json")
        user = User.objects.get()

        self.assertNotEqual(user.password, VALID_PASSWORD)
        self.assertTrue(user.password.startswith("pbkdf2_"))
        self.assertTrue(check_password(VALID_PASSWORD, user.password))

    def test_password_is_never_returned(self):
        response = self.client.post(self.url, registration_payload(), format="json")

        self.assertNotIn("password", response.data)
        self.assertNotIn("password_confirm", response.data)
        self.assertNotIn(VALID_PASSWORD, str(response.content))

    def test_user_is_not_created_when_validation_fails(self):
        self.client.post(
            self.url,
            registration_payload(email="bad-email", password="123", password_confirm="456"),
            format="json",
        )
        self.assertFalse(User.objects.exists())

    def test_email_only_registration_auto_generates_username(self):
        payload = {
            "email": "coollearner@example.com",
            "password": VALID_PASSWORD,
            "password_confirm": VALID_PASSWORD,
            "first_name": "Cool",
            "last_name": "Learner",
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "coollearner@example.com")
        self.assertTrue(response.data["username"].startswith("coollearner"))
        self.assertTrue(User.objects.filter(email="coollearner@example.com").exists())

