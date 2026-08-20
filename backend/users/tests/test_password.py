from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.tests import NEW_PASSWORD, VALID_PASSWORD, auth_header, create_user


class ChangePasswordAPITests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.url = reverse("auth-change-password")
        self.login_url = reverse("auth-login")
        login = self.client.post(
            self.login_url,
            {"username": self.user.username, "password": VALID_PASSWORD},
            format="json",
        )
        self.access = login.data["access"]
        self.refresh = login.data["refresh"]

    def test_successful_change(self):
        response = self.client.post(
            self.url,
            {
                "old_password": VALID_PASSWORD,
                "new_password": NEW_PASSWORD,
                "new_password_confirm": NEW_PASSWORD,
            },
            format="json",
            **auth_header(self.access),
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))
        self.assertFalse(self.user.check_password(VALID_PASSWORD))
        self.assertEqual(response.content, b"")

    def test_incorrect_current_password(self):
        response = self.client.post(
            self.url,
            {
                "old_password": "WrongPassword123!",
                "new_password": NEW_PASSWORD,
                "new_password_confirm": NEW_PASSWORD,
            },
            format="json",
            **auth_header(self.access),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(VALID_PASSWORD))

    def test_password_mismatch(self):
        response = self.client.post(
            self.url,
            {
                "old_password": VALID_PASSWORD,
                "new_password": NEW_PASSWORD,
                "new_password_confirm": "MismatchPassword123!",
            },
            format="json",
            **auth_header(self.access),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password_confirm", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(VALID_PASSWORD))

    def test_weak_password(self):
        response = self.client.post(
            self.url,
            {
                "old_password": VALID_PASSWORD,
                "new_password": "123",
                "new_password_confirm": "123",
            },
            format="json",
            **auth_header(self.access),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(VALID_PASSWORD))

    def test_old_password_no_longer_works(self):
        self.client.post(
            self.url,
            {
                "old_password": VALID_PASSWORD,
                "new_password": NEW_PASSWORD,
                "new_password_confirm": NEW_PASSWORD,
            },
            format="json",
            **auth_header(self.access),
        )

        old_login = self.client.post(
            self.login_url,
            {"username": self.user.username, "password": VALID_PASSWORD},
            format="json",
        )
        new_login = self.client.post(
            self.login_url,
            {"username": self.user.username, "password": NEW_PASSWORD},
            format="json",
        )

        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)

    def test_previous_refresh_token_is_revoked_after_password_change(self):
        self.client.post(
            self.url,
            {
                "old_password": VALID_PASSWORD,
                "new_password": NEW_PASSWORD,
                "new_password_confirm": NEW_PASSWORD,
            },
            format="json",
            **auth_header(self.access),
        )

        refresh_response = self.client.post(
            reverse("auth-refresh"),
            {"refresh": self.refresh},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_change_password_is_rejected(self):
        response = self.client.post(
            self.url,
            {
                "old_password": VALID_PASSWORD,
                "new_password": NEW_PASSWORD,
                "new_password_confirm": NEW_PASSWORD,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
