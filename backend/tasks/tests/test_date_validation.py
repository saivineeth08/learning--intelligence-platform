from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from goals.models import Goal, GoalPriority, GoalStatus
from tasks.models import Task, TaskPriority, TaskStatus
from users.tests import auth_header, create_user


class TaskDateValidationTests(APITestCase):
    def setUp(self):
        self.user = create_user(username="date_test_user", email="date_user@example.com")
        self.list_create_url = reverse("task-list-create")

        self.goal = Goal.objects.create(
            user=self.user,
            title="Complete Project by Sept 10",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.HIGH,
            target_date="2026-09-10",
        )
        self.early_goal = Goal.objects.create(
            user=self.user,
            title="Complete Early by Sept 05",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.MEDIUM,
            target_date="2026-09-05",
        )

    def _login(self):
        from users.tests import VALID_PASSWORD
        response = self.client.post(
            reverse("auth-login"),
            {"username": self.user.username, "password": VALID_PASSWORD},
            format="json",
        )
        return response.data["access"]

    def test_task_due_date_on_or_before_goal_target_date_allowed(self):
        token = self._login()
        # Test Sept 10 (equal)
        payload = {
            "goal": self.goal.pk,
            "title": "Task on deadline",
            "due_date": "2026-09-10",
        }
        res = self.client.post(self.list_create_url, payload, format="json", **auth_header(token))
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Test Sept 01 (earlier)
        payload2 = {
            "goal": self.goal.pk,
            "title": "Task before deadline",
            "due_date": "2026-09-01",
        }
        res2 = self.client.post(self.list_create_url, payload2, format="json", **auth_header(token))
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

    def test_task_due_date_after_goal_target_date_rejected(self):
        token = self._login()
        # Sept 11 (after goal Sept 10)
        payload = {
            "goal": self.goal.pk,
            "title": "Task after deadline",
            "due_date": "2026-09-11",
        }
        res = self.client.post(self.list_create_url, payload, format="json", **auth_header(token))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("due_date", res.data)

    def test_patch_task_due_date_after_goal_target_date_rejected(self):
        token = self._login()
        task = Task.objects.create(
            user=self.user,
            goal=self.goal,
            title="Existing Task",
            due_date="2026-09-05",
        )
        detail_url = reverse("task-detail", kwargs={"pk": task.pk})
        res = self.client.patch(detail_url, {"due_date": "2026-09-20"}, format="json", **auth_header(token))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("due_date", res.data)

    def test_moving_task_to_goal_with_earlier_target_date_rejected(self):
        token = self._login()
        task = Task.objects.create(
            user=self.user,
            goal=self.goal,
            title="Task due Sept 08",
            due_date="2026-09-08",
        )
        detail_url = reverse("task-detail", kwargs={"pk": task.pk})
        # Moving to early_goal (target_date 2026-09-05) should fail because 2026-09-08 > 2026-09-05
        res = self.client.patch(detail_url, {"goal": self.early_goal.pk}, format="json", **auth_header(token))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_updating_goal_target_date_earlier_than_existing_task_rejected(self):
        token = self._login()
        Task.objects.create(
            user=self.user,
            goal=self.goal,
            title="Task due Sept 08",
            due_date="2026-09-08",
        )
        goal_url = reverse("goal-detail", kwargs={"pk": self.goal.pk})
        # Attempt to set goal target_date to Sept 04 (before task due Sept 08)
        res = self.client.patch(goal_url, {"target_date": "2026-09-04"}, format="json", **auth_header(token))
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("target_date", res.data)
