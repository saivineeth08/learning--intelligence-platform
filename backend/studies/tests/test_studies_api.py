from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from goals.models import Goal, GoalPriority, GoalStatus
from studies.models import StudySession
from tasks.models import Task, TaskPriority, TaskStatus
from users.tests import auth_header, create_user


class StudiesAPITests(APITestCase):
    def setUp(self):
        self.user = create_user(username="user1", email="user1@example.com")
        self.other_user = create_user(username="user2", email="user2@example.com")
        self.list_create_url = reverse("study-list-create")

        # Goals
        self.goal = Goal.objects.create(
            user=self.user,
            title="Master Django",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.HIGH,
        )
        self.goal2 = Goal.objects.create(
            user=self.user,
            title="Learn SQL Optimization",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.MEDIUM,
        )
        self.other_goal = Goal.objects.create(
            user=self.other_user,
            title="Learn Rust",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.MEDIUM,
        )

        # Tasks
        self.task = Task.objects.create(
            user=self.user,
            goal=self.goal,
            title="Build Models",
            status=TaskStatus.TODO,
            priority=TaskPriority.HIGH,
        )
        self.task_goal2 = Task.objects.create(
            user=self.user,
            goal=self.goal2,
            title="Indexing Strategies",
            status=TaskStatus.TODO,
            priority=TaskPriority.MEDIUM,
        )
        self.other_task = Task.objects.create(
            user=self.other_user,
            goal=self.other_goal,
            title="Rust Ownership",
            status=TaskStatus.TODO,
            priority=TaskPriority.HIGH,
        )

        # Base times
        self.now = timezone.now().replace(microsecond=0)
        self.start_time = self.now - timedelta(hours=2)
        self.end_time = self.now - timedelta(hours=1)

        # Existing sessions
        self.session = StudySession.objects.create(
            user=self.user,
            goal=self.goal,
            task=self.task,
            started_at=self.start_time,
            ended_at=self.end_time,
            duration_seconds=3600,
            notes="Covered models and relationships",
        )
        self.other_session = StudySession.objects.create(
            user=self.other_user,
            goal=self.other_goal,
            task=self.other_task,
            started_at=self.start_time,
            ended_at=self.end_time,
            duration_seconds=3600,
            notes="Rust lifetimes",
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

        detail_url = reverse("study-detail", kwargs={"pk": self.session.pk})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_study_sessions_scoped_to_user(self):
        token = self._login(self.user)
        response = self.client.get(self.list_create_url, **auth_header(token))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.session.pk)
        self.assertEqual(response.data[0]["duration_seconds"], 3600)

    def test_create_study_session_with_task_and_duration_calculation(self):
        token = self._login(self.user)
        start = (self.now - timedelta(minutes=90)).isoformat()
        end = self.now.isoformat()

        payload = {
            "goal": self.goal.pk,
            "task": self.task.pk,
            "started_at": start,
            "ended_at": end,
            "notes": "Studied 90 minutes",
            "duration_seconds": 99999,  # Should be ignored and calculated as 5400
        }

        response = self.client.post(
            self.list_create_url, payload, format="json", **auth_header(token)
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["duration_seconds"], 5400)
        self.assertEqual(response.data["goal"], self.goal.pk)
        self.assertEqual(response.data["task"], self.task.pk)
        self.assertEqual(response.data["user"], self.user.pk)

    def test_create_study_session_without_task_optional(self):
        token = self._login(self.user)
        start = (self.now - timedelta(minutes=45)).isoformat()
        end = self.now.isoformat()

        payload = {
            "goal": self.goal.pk,
            "started_at": start,
            "ended_at": end,
            "notes": "General study without specific task",
        }

        response = self.client.post(
            self.list_create_url, payload, format="json", **auth_header(token)
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["task"])
        self.assertEqual(response.data["duration_seconds"], 2700)

    def test_invalid_time_range_ended_at_before_started_at_rejected(self):
        token = self._login(self.user)
        start = self.now.isoformat()
        end = (self.now - timedelta(minutes=30)).isoformat()

        payload = {
            "goal": self.goal.pk,
            "started_at": start,
            "ended_at": end,
        }

        response = self.client.post(
            self.list_create_url, payload, format="json", **auth_header(token)
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ended_at", response.data)

    def test_update_study_session_recalculates_duration(self):
        token = self._login(self.user)
        detail_url = reverse("study-detail", kwargs={"pk": self.session.pk})

        new_end = (self.start_time + timedelta(minutes=30)).isoformat()
        response = self.client.patch(
            detail_url, {"ended_at": new_end}, format="json", **auth_header(token)
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["duration_seconds"], 1800)
        self.session.refresh_from_db()
        self.assertEqual(self.session.duration_seconds, 1800)

    def test_delete_study_session_success(self):
        token = self._login(self.user)
        detail_url = reverse("study-detail", kwargs={"pk": self.session.pk})
        response = self.client.delete(detail_url, **auth_header(token))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(StudySession.objects.filter(pk=self.session.pk).exists())

    def test_user_cannot_access_or_modify_other_users_study_session(self):
        token = self._login(self.user)
        other_detail_url = reverse("study-detail", kwargs={"pk": self.other_session.pk})

        # Cannot GET
        get_res = self.client.get(other_detail_url, **auth_header(token))
        self.assertEqual(get_res.status_code, status.HTTP_404_NOT_FOUND)

        # Cannot PATCH
        patch_res = self.client.patch(
            other_detail_url, {"notes": "Hacked"}, format="json", **auth_header(token)
        )
        self.assertEqual(patch_res.status_code, status.HTTP_404_NOT_FOUND)

        # Cannot DELETE
        del_res = self.client.delete(other_detail_url, **auth_header(token))
        self.assertEqual(del_res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(StudySession.objects.filter(pk=self.other_session.pk).exists())

    def test_cannot_create_session_with_other_users_goal(self):
        token = self._login(self.user)
        payload = {
            "goal": self.other_goal.pk,
            "started_at": self.start_time.isoformat(),
            "ended_at": self.end_time.isoformat(),
        }
        response = self.client.post(
            self.list_create_url, payload, format="json", **auth_header(token)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("goal", response.data)

    def test_cannot_create_session_with_other_users_task(self):
        token = self._login(self.user)
        payload = {
            "goal": self.goal.pk,
            "task": self.other_task.pk,
            "started_at": self.start_time.isoformat(),
            "ended_at": self.end_time.isoformat(),
        }
        response = self.client.post(
            self.list_create_url, payload, format="json", **auth_header(token)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("task", response.data)

    def test_cannot_create_session_with_task_belonging_to_different_goal(self):
        token = self._login(self.user)
        # self.task_goal2 belongs to self.goal2, but we submit with self.goal
        payload = {
            "goal": self.goal.pk,
            "task": self.task_goal2.pk,
            "started_at": self.start_time.isoformat(),
            "ended_at": self.end_time.isoformat(),
        }
        response = self.client.post(
            self.list_create_url, payload, format="json", **auth_header(token)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("task", response.data)
