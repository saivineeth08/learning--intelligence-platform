from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from goals.models import Goal, GoalPriority, GoalStatus
from users.tests import auth_header, create_user


class GoalsAPITests(APITestCase):
    def setUp(self):
        self.user = create_user(username="user1", email="user1@example.com")
        self.other_user = create_user(username="user2", email="user2@example.com")
        self.list_create_url = reverse("goal-list-create")

        # Create goal for self.user
        self.goal = Goal.objects.create(
            user=self.user,
            title="Master Python & Django",
            description="Deep dive into web development",
            category="Backend",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.HIGH,
            target_date="2026-12-31",
        )
        # Create goal for other_user
        self.other_goal = Goal.objects.create(
            user=self.other_user,
            title="Learn Rust",
            description="Systems programming",
            category="Systems",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.MEDIUM,
        )

    def _login(self, user):
        from users.tests import VALID_PASSWORD
        response = self.client.post(
            reverse("auth-login"),
            {"username": user.username, "password": VALID_PASSWORD},
            format="json",
        )
        return response.data["access"]

    def test_unauthenticated_access_rejected(self):
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        detail_url = reverse("goal-detail", kwargs={"pk": self.goal.pk})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_goals_returns_only_authenticated_users_goals(self):
        token = self._login(self.user)
        response = self.client.get(self.list_create_url, **auth_header(token))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.goal.pk)
        self.assertEqual(response.data[0]["title"], "Master Python & Django")

    def test_create_goal_success(self):
        token = self._login(self.user)
        payload = {
            "title": "Study Data Structures",
            "description": "Trees and Graphs",
            "category": "Computer Science",
            "status": "ACTIVE",
            "priority": "HIGH",
            "target_date": "2026-10-15",
        }
        response = self.client.post(
            self.list_create_url, payload, format="json", **auth_header(token)
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Study Data Structures")
        self.assertEqual(response.data["user"], self.user.pk)
        self.assertTrue(Goal.objects.filter(title="Study Data Structures", user=self.user).exists())

    def test_create_goal_cannot_spoof_another_user(self):
        token = self._login(self.user)
        payload = {
            "title": "Malicious Goal",
            "user": self.other_user.pk,
        }
        response = self.client.post(
            self.list_create_url, payload, format="json", **auth_header(token)
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"], self.user.pk)
        goal = Goal.objects.get(title="Malicious Goal")
        self.assertEqual(goal.user, self.user)

    def test_create_goal_validation_blank_title(self):
        token = self._login(self.user)
        response = self.client.post(
            self.list_create_url, {"title": "   "}, format="json", **auth_header(token)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", response.data)

    def test_retrieve_goal_success(self):
        token = self._login(self.user)
        detail_url = reverse("goal-detail", kwargs={"pk": self.goal.pk})
        response = self.client.get(detail_url, **auth_header(token))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.goal.pk)

    def test_update_goal_success(self):
        token = self._login(self.user)
        detail_url = reverse("goal-detail", kwargs={"pk": self.goal.pk})
        payload = {
            "title": "Master Python, Django & DRF",
            "status": "COMPLETED",
            "priority": "LOW",
        }
        response = self.client.patch(
            detail_url, payload, format="json", **auth_header(token)
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.goal.refresh_from_db()
        self.assertEqual(self.goal.title, "Master Python, Django & DRF")
        self.assertEqual(self.goal.status, GoalStatus.COMPLETED)
        self.assertEqual(self.goal.priority, GoalPriority.LOW)

    def test_delete_goal_success(self):
        token = self._login(self.user)
        detail_url = reverse("goal-detail", kwargs={"pk": self.goal.pk})
        response = self.client.delete(detail_url, **auth_header(token))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Goal.objects.filter(pk=self.goal.pk).exists())

    def test_user_cannot_access_or_modify_other_users_goal(self):
        token = self._login(self.user)
        other_detail_url = reverse("goal-detail", kwargs={"pk": self.other_goal.pk})

        # Cannot GET
        get_res = self.client.get(other_detail_url, **auth_header(token))
        self.assertEqual(get_res.status_code, status.HTTP_404_NOT_FOUND)

        # Cannot PATCH
        patch_res = self.client.patch(
            other_detail_url, {"title": "Hacked Title"}, format="json", **auth_header(token)
        )
        self.assertEqual(patch_res.status_code, status.HTTP_404_NOT_FOUND)
        self.other_goal.refresh_from_db()
        self.assertEqual(self.other_goal.title, "Learn Rust")

        # Cannot DELETE
        delete_res = self.client.delete(other_detail_url, **auth_header(token))
        self.assertEqual(delete_res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Goal.objects.filter(pk=self.other_goal.pk).exists())
