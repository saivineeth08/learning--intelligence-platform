from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from goals.models import Goal, GoalPriority, GoalStatus
from notes.models import Note
from studies.models import StudySession
from tasks.models import Task, TaskPriority, TaskStatus
from users.tests import auth_header, create_user


class CalendarAPITests(APITestCase):
    def setUp(self):
        self.user = create_user(username="cal_user1", email="cal1@example.com")
        self.other_user = create_user(username="cal_user2", email="cal2@example.com")
        self.calendar_url = reverse("calendar-events")

        # Create user 1 entities
        self.goal = Goal.objects.create(
            user=self.user,
            title="Complete Django Project",
            target_date="2026-09-10",
        )
        self.task = Task.objects.create(
            user=self.user,
            goal=self.goal,
            title="Finish Serializers",
            due_date="2026-09-10",
        )
        now = timezone.now()
        self.study = StudySession.objects.create(
            user=self.user,
            goal=self.goal,
            notes="Django REST Framework",
            started_at=now,
            ended_at=now + timezone.timedelta(minutes=80),
            duration_seconds=4800,
        )
        self.note = Note.objects.create(
            user=self.user,
            title="JWT Notes",
            content="Authentication notes",
        )

        # Create user 2 entities
        self.other_goal = Goal.objects.create(
            user=self.other_user,
            title="User 2 Secret Goal",
            target_date="2026-09-10",
        )
        self.other_task = Task.objects.create(
            user=self.other_user,
            goal=self.other_goal,
            title="User 2 Secret Task",
            due_date="2026-09-10",
        )

    def _login(self, user):
        from users.tests import VALID_PASSWORD
        res = self.client.post(
            reverse("auth-login"),
            {"username": user.username, "password": VALID_PASSWORD},
            format="json",
        )
        return res.data["access"]

    def test_unauthenticated_calendar_access_rejected(self):
        res = self.client.get(self.calendar_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_calendar_events_user_isolation(self):
        token = self._login(self.user)
        res = self.client.get(f"{self.calendar_url}?start_date=2026-09-01&end_date=2026-09-30", **auth_header(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        events_by_date = res.data["events_by_date"]
        all_titles = []
        for d, day_data in events_by_date.items():
            for g in day_data.get("goals", []):
                all_titles.append(g["title"])
            for t in day_data.get("tasks", []):
                all_titles.append(t["title"])
            for n in day_data.get("notes", []):
                all_titles.append(n["title"])

        self.assertIn("Complete Django Project", all_titles)
        self.assertIn("Finish Serializers", all_titles)
        self.assertNotIn("User 2 Secret Goal", all_titles)
        self.assertNotIn("User 2 Secret Task", all_titles)

    def test_calendar_year_month_query(self):
        token = self._login(self.user)
        res = self.client.get(f"{self.calendar_url}?year=2026&month=9", **auth_header(token))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("events_by_date", res.data)
        self.assertIn("2026-09-10", res.data["events_by_date"])
