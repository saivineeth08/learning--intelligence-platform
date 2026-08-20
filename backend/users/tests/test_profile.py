from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.tests import VALID_PASSWORD, auth_header, create_user


class ProfileAPITests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.other = create_user(
            username="otheruser",
            email="other@example.com",
        )
        self.url = reverse("auth-profile")
        login = self.client.post(
            reverse("auth-login"),
            {"username": self.user.username, "password": VALID_PASSWORD},
            format="json",
        )
        self.access = login.data["access"]

    def test_authenticated_access(self):
        response = self.client.get(self.url, **auth_header(self.access))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["username"], self.user.username)

    def test_unauthenticated_access(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_safe_response_fields(self):
        response = self.client.get(self.url, **auth_header(self.access))

        self.assertEqual(
            set(response.data.keys()),
            {
                "id",
                "username",
                "email",
                "first_name",
                "last_name",
                "date_joined",
                "created_at",
                "updated_at",
            },
        )
        self.assertNotIn("password", response.data)
        self.assertNotIn("is_staff", response.data)
        self.assertNotIn("is_superuser", response.data)
        self.assertNotIn("is_active", response.data)

    def test_profile_is_always_the_authenticated_user(self):
        other_login = self.client.post(
            reverse("auth-login"),
            {"username": self.other.username, "password": VALID_PASSWORD},
            format="json",
        )

        response = self.client.get(
            self.url, **auth_header(other_login.data["access"])
        )

        self.assertEqual(response.data["id"], self.other.id)
        self.assertNotEqual(response.data["id"], self.user.id)


class ProfileUpdateAPITests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.url = reverse("auth-profile")
        login = self.client.post(
            reverse("auth-login"),
            {"username": self.user.username, "password": VALID_PASSWORD},
            format="json",
        )
        self.access = login.data["access"]

    def test_valid_update(self):
        response = self.client.patch(
            self.url,
            {"first_name": "Updated", "last_name": "Name"},
            format="json",
            **auth_header(self.access),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Updated")
        self.assertEqual(self.user.last_name, "Name")
        self.assertEqual(response.data["first_name"], "Updated")

    def test_invalid_email_update(self):
        response = self.client.patch(
            self.url,
            {"email": "not-an-email"},
            format="json",
            **auth_header(self.access),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "user@example.com")

    def test_duplicate_email_update(self):
        create_user(username="taken", email="taken@example.com")

        response = self.client.patch(
            self.url,
            {"email": "taken@example.com"},
            format="json",
            **auth_header(self.access),
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "user@example.com")

    def test_protected_fields_cannot_be_modified(self):
        response = self.client.patch(
            self.url,
            {
                "username": "hacked",
                "is_staff": True,
                "is_superuser": True,
                "is_active": False,
                "password": "ShouldNotWork123!",
            },
            format="json",
            **auth_header(self.access),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "saivineeth")
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.is_superuser)
        self.assertTrue(self.user.is_active)
        self.assertTrue(self.user.check_password(VALID_PASSWORD))
        self.assertNotIn("password", response.data)
        self.assertEqual(response.data["username"], "saivineeth")
