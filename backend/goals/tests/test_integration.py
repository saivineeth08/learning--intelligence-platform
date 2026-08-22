from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from goals.models import Goal
from studies.models import StudySession
from tasks.models import Task, TaskStatus
from users.tests import VALID_PASSWORD, auth_header


class Milestone3IntegrationTests(APITestCase):
    def test_full_learning_management_flow(self):
        # 1. Register User
        reg_payload = {
            "username": "integrator",
            "email": "integrator@example.com",
            "first_name": "Integration",
            "last_name": "Tester",
            "password": VALID_PASSWORD,
            "password_confirm": VALID_PASSWORD,
        }
        reg_res = self.client.post(reverse("auth-register"), reg_payload, format="json")
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)

        # 2. Login User
        login_res = self.client.post(
            reverse("auth-login"),
            {"username": "integrator", "password": VALID_PASSWORD},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        token = login_res.data["access"]
        auth = auth_header(token)

        # 3. Create Goal
        goal_payload = {
            "title": "Full Stack Mastery",
            "description": "Learn Django & React",
            "category": "Web Development",
            "status": "ACTIVE",
            "priority": "HIGH",
            "target_date": "2026-11-30",
        }
        goal_res = self.client.post(reverse("goal-list-create"), goal_payload, format="json", **auth)
        self.assertEqual(goal_res.status_code, status.HTTP_201_CREATED)
        goal_id = goal_res.data["id"]

        # 4. Create Task linked to Goal
        task_payload = {
            "goal": goal_id,
            "title": "Implement Models & Services",
            "description": "Write clean business logic",
            "status": "TODO",
            "priority": "HIGH",
            "due_date": "2026-10-01",
        }
        task_res = self.client.post(reverse("task-list-create"), task_payload, format="json", **auth)
        self.assertEqual(task_res.status_code, status.HTTP_201_CREATED)
        task_id = task_res.data["id"]
        self.assertIsNone(task_res.data["completed_at"])

        # 5. Record Study Session for the Task
        now = timezone.now().replace(microsecond=0)
        started_at = (now - timedelta(minutes=75)).isoformat()
        ended_at = now.isoformat()
        session_payload = {
            "goal": goal_id,
            "task": task_id,
            "started_at": started_at,
            "ended_at": ended_at,
            "notes": "Deep work session for 75 minutes",
        }
        session_res = self.client.post(reverse("study-list-create"), session_payload, format="json", **auth)
        self.assertEqual(session_res.status_code, status.HTTP_201_CREATED)
        session_id = session_res.data["id"]
        self.assertEqual(session_res.data["duration_seconds"], 4500)

        # 6. Complete the Task
        task_patch_res = self.client.patch(
            reverse("task-detail", kwargs={"pk": task_id}),
            {"status": "COMPLETED"},
            format="json",
            **auth,
        )
        self.assertEqual(task_patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(task_patch_res.data["status"], TaskStatus.COMPLETED)
        self.assertIsNotNone(task_patch_res.data["completed_at"])

        # 7. Verify List Endpoints
        goals_list = self.client.get(reverse("goal-list-create"), **auth)
        tasks_list = self.client.get(reverse("task-list-create"), **auth)
        studies_list = self.client.get(reverse("study-list-create"), **auth)

        self.assertEqual(len(goals_list.data), 1)
        self.assertEqual(len(tasks_list.data), 1)
        self.assertEqual(len(studies_list.data), 1)

        # 8. Delete Goal and verify cascading delete of task and study session
        goal_del_res = self.client.delete(reverse("goal-detail", kwargs={"pk": goal_id}), **auth)
        self.assertEqual(goal_del_res.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(Goal.objects.filter(pk=goal_id).exists())
        self.assertFalse(Task.objects.filter(pk=task_id).exists())
        self.assertFalse(StudySession.objects.filter(pk=session_id).exists())
