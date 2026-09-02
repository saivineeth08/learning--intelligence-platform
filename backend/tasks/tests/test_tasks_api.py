from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from goals.models import Goal, GoalPriority, GoalStatus
from tasks.models import Task, TaskPriority, TaskStatus
from users.tests import auth_header, create_user


class TasksAPITests(APITestCase):
    def setUp(self):
        self.user = create_user(username="user1", email="user1@example.com")
        self.other_user = create_user(username="user2", email="user2@example.com")
        self.list_create_url = reverse("task-list-create")

        # Goals
        self.goal = Goal.objects.create(
            user=self.user,
            title="Learn Django",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.HIGH,
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
            description="Create models.py with constraints",
            status=TaskStatus.TODO,
            priority=TaskPriority.HIGH,
            due_date="2026-09-01",
        )
        self.other_task = Task.objects.create(
            user=self.other_user,
            goal=self.other_goal,
            title="Learn Borrow Checker",
            status=TaskStatus.TODO,
            priority=TaskPriority.MEDIUM,
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

        detail_url = reverse("task-detail", kwargs={"pk": self.task.pk})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_tasks_returns_only_authenticated_users_tasks(self):
        token = self._login(self.user)
        response = self.client.get(self.list_create_url, **auth_header(token))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], self.task.pk)
        self.assertEqual(response.data["results"][0]["title"], "Build Models")

    def test_filter_tasks(self):
        token = self._login(self.user)
        second_task = Task.objects.create(
            user=self.user,
            goal=self.goal,
            title="Build Views",
            status=TaskStatus.COMPLETED,
            priority=TaskPriority.LOW,
            due_date="2026-09-10",
        )

        # Filter by status
        res_status = self.client.get(
            f"{self.list_create_url}?status=COMPLETED", **auth_header(token)
        )
        self.assertEqual(res_status.data["count"], 1)
        self.assertEqual(res_status.data["results"][0]["id"], second_task.pk)

        # Filter by priority
        res_priority = self.client.get(
            f"{self.list_create_url}?priority=HIGH", **auth_header(token)
        )
        self.assertEqual(res_priority.data["count"], 1)
        self.assertEqual(res_priority.data["results"][0]["id"], self.task.pk)

        # Filter by goal
        res_goal = self.client.get(
            f"{self.list_create_url}?goal={self.goal.pk}", **auth_header(token)
        )
        self.assertEqual(res_goal.data["count"], 2)

    def test_tasks_pagination(self):
        token = self._login(self.user)
        # Create 24 more tasks (total 25)
        more_tasks = [
            Task(
                user=self.user,
                goal=self.goal,
                title=f"Task #{i}",
                status=TaskStatus.TODO,
                priority=TaskPriority.MEDIUM,
            )
            for i in range(24)
        ]
        Task.objects.bulk_create(more_tasks)

        # Page 1
        res_p1 = self.client.get(self.list_create_url, **auth_header(token))
        self.assertEqual(res_p1.status_code, status.HTTP_200_OK)
        self.assertEqual(res_p1.data["count"], 25)
        self.assertEqual(len(res_p1.data["results"]), 20)

        # Page 2
        res_p2 = self.client.get(f"{self.list_create_url}?page=2", **auth_header(token))
        self.assertEqual(res_p2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_p2.data["results"]), 5)

    def test_create_task_success(self):
        token = self._login(self.user)
        payload = {
            "goal": self.goal.pk,
            "title": "Write Serializers",
            "description": "Validation logic",
            "status": "TODO",
            "priority": "MEDIUM",
            "due_date": "2026-09-05",
        }
        response = self.client.post(
            self.list_create_url, payload, format="json", **auth_header(token)
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Write Serializers")
        self.assertEqual(response.data["user"], self.user.pk)
        self.assertEqual(response.data["goal"], self.goal.pk)
        self.assertIsNone(response.data["completed_at"])

    def test_create_task_with_completed_status_sets_completed_at(self):
        token = self._login(self.user)
        payload = {
            "goal": self.goal.pk,
            "title": "Already done task",
            "status": "COMPLETED",
        }
        response = self.client.post(
            self.list_create_url, payload, format="json", **auth_header(token)
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data["completed_at"])

    def test_task_status_transition_completed_at_behavior(self):
        token = self._login(self.user)
        detail_url = reverse("task-detail", kwargs={"pk": self.task.pk})

        # Transition to COMPLETED
        res_complete = self.client.patch(
            detail_url, {"status": "COMPLETED"}, format="json", **auth_header(token)
        )
        self.assertEqual(res_complete.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res_complete.data["completed_at"])
        self.task.refresh_from_db()
        self.assertIsNotNone(self.task.completed_at)

        # Transition back to IN_PROGRESS
        res_revert = self.client.patch(
            detail_url, {"status": "IN_PROGRESS"}, format="json", **auth_header(token)
        )
        self.assertEqual(res_revert.status_code, status.HTTP_200_OK)
        self.assertIsNone(res_revert.data["completed_at"])
        self.task.refresh_from_db()
        self.assertIsNone(self.task.completed_at)

    def test_delete_task_success(self):
        token = self._login(self.user)
        detail_url = reverse("task-detail", kwargs={"pk": self.task.pk})
        response = self.client.delete(detail_url, **auth_header(token))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(pk=self.task.pk).exists())

    def test_user_cannot_access_or_modify_other_users_task(self):
        token = self._login(self.user)
        other_detail_url = reverse("task-detail", kwargs={"pk": self.other_task.pk})

        # Cannot GET
        get_res = self.client.get(other_detail_url, **auth_header(token))
        self.assertEqual(get_res.status_code, status.HTTP_404_NOT_FOUND)

        # Cannot PATCH
        patch_res = self.client.patch(
            other_detail_url, {"title": "Hacked"}, format="json", **auth_header(token)
        )
        self.assertEqual(patch_res.status_code, status.HTTP_404_NOT_FOUND)

        # Cannot DELETE
        del_res = self.client.delete(other_detail_url, **auth_header(token))
        self.assertEqual(del_res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Task.objects.filter(pk=self.other_task.pk).exists())

    def test_user_cannot_create_task_using_another_users_goal(self):
        token = self._login(self.user)
        payload = {
            "goal": self.other_goal.pk,
            "title": "Sneaky Task on Other's Goal",
        }
        response = self.client.post(
            self.list_create_url, payload, format="json", **auth_header(token)
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("goal", response.data)
        self.assertFalse(Task.objects.filter(title="Sneaky Task on Other's Goal").exists())

    def test_user_cannot_move_task_to_another_users_goal(self):
        token = self._login(self.user)
        detail_url = reverse("task-detail", kwargs={"pk": self.task.pk})

        response = self.client.patch(
            detail_url, {"goal": self.other_goal.pk}, format="json", **auth_header(token)
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("goal", response.data)
        self.task.refresh_from_db()
        self.assertEqual(self.task.goal, self.goal)
