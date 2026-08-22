from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from django.test import TestCase

from goals.models import Goal, GoalStatus
from studies.models import StudySession
from tasks.models import Task, TaskStatus

User = get_user_model()

RECOMMENDATIONS_URL = "/api/ai/recommendations/"


class RecommendationsAuthTests(TestCase):
    def test_unauthenticated_request_is_rejected(self):
        client = APIClient()
        response = client.get(RECOMMENDATIONS_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RecommendationsResponseTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="reco_user", email="reco@example.com", password="Pass1234!"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_returns_200_with_no_data(self):
        """With no goals/tasks a response still returns 200."""
        response = self.client.get(RECOMMENDATIONS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("count", data)
        self.assertIn("recommendations", data)
        self.assertIsInstance(data["recommendations"], list)

    def test_no_active_goals_recommendation(self):
        """User with no active goals should receive a 'no_active_goals' recommendation."""
        response = self.client.get(RECOMMENDATIONS_URL)
        types = [r["type"] for r in response.json()["recommendations"]]
        self.assertIn("no_active_goals", types)

    def test_overdue_task_recommendation(self):
        """An overdue task triggers an overdue_task recommendation."""
        goal = Goal.objects.create(user=self.user, title="Test Goal")
        Task.objects.create(
            user=self.user,
            goal=goal,
            title="Overdue Task",
            status=TaskStatus.TODO,
            due_date=(timezone.now() - timedelta(days=3)).date(),
        )
        response = self.client.get(RECOMMENDATIONS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        types = [r["type"] for r in response.json()["recommendations"]]
        self.assertIn("overdue_task", types)

    def test_no_recent_study_recommendation(self):
        """User with an active goal but no recent study session gets warned."""
        Goal.objects.create(user=self.user, title="Active Goal", status=GoalStatus.ACTIVE)
        response = self.client.get(RECOMMENDATIONS_URL)
        types = [r["type"] for r in response.json()["recommendations"]]
        self.assertIn("no_recent_study", types)

    def test_goal_approaching_deadline_recommendation(self):
        """A goal with a deadline within 7 days triggers an approaching_deadline recommendation."""
        Goal.objects.create(
            user=self.user,
            title="Deadline Goal",
            status=GoalStatus.ACTIVE,
            target_date=(timezone.now() + timedelta(days=3)).date(),
        )
        response = self.client.get(RECOMMENDATIONS_URL)
        types = [r["type"] for r in response.json()["recommendations"]]
        self.assertIn("goal_approaching_deadline", types)

    def test_recommendation_schema(self):
        """Every recommendation object has the required fields."""
        Goal.objects.create(user=self.user, title="Schema Test Goal")
        response = self.client.get(RECOMMENDATIONS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for rec in response.json()["recommendations"]:
            self.assertIn("priority", rec)
            self.assertIn("type", rec)
            self.assertIn("title", rec)
            self.assertIn("message", rec)
            self.assertIn("action_url", rec)
            self.assertIn(rec["priority"], ["HIGH", "MEDIUM", "LOW"])

    def test_other_users_data_not_included(self):
        """Recommendations are computed only from the requesting user's data."""
        other_user = User.objects.create_user(
            username="other_reco", email="other_reco@example.com", password="Pass1234!"
        )
        goal = Goal.objects.create(user=other_user, title="Other User Goal")
        Task.objects.create(
            user=other_user,
            goal=goal,
            title="Other user overdue",
            status=TaskStatus.TODO,
            due_date=(timezone.now() - timedelta(days=5)).date(),
        )
        response = self.client.get(RECOMMENDATIONS_URL)
        # Our user has no overdue tasks — should not see overdue_task from other user
        for rec in response.json()["recommendations"]:
            if rec["type"] == "overdue_task":
                self.fail("Recommendations included another user's overdue task.")
