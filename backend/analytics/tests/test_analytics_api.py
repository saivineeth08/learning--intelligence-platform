from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from goals.models import Goal, GoalPriority, GoalStatus
from notes.models import Note
from resources.models import Resource, ResourceType
from studies.models import StudySession
from tasks.models import Task, TaskPriority, TaskStatus

User = get_user_model()


class AnalyticsAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="analyticsuser",
            email="analyticsuser@example.com",
            password="StrongPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="otheruser",
            email="otheruser@example.com",
            password="StrongPassword123!",
        )

        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_unauthenticated_requests_are_rejected(self):
        anon_client = APIClient()
        for endpoint in ["/api/analytics/dashboard/", "/api/analytics/study-time/", "/api/analytics/goals/", "/api/analytics/tasks/"]:
            response = anon_client.get(endpoint)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_summary_empty_state_safety(self):
        response = self.client.get("/api/analytics/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["today_study_seconds"], 0)
        self.assertEqual(response.data["weekly_study_seconds"], 0)
        self.assertEqual(response.data["monthly_study_seconds"], 0)
        self.assertEqual(response.data["total_study_seconds"], 0)
        self.assertEqual(response.data["active_goals_count"], 0)
        self.assertEqual(response.data["completed_goals_count"], 0)
        self.assertEqual(response.data["total_goals_count"], 0)
        self.assertEqual(response.data["pending_tasks_count"], 0)
        self.assertEqual(response.data["completed_tasks_count"], 0)
        self.assertEqual(response.data["overdue_tasks_count"], 0)
        self.assertEqual(response.data["total_tasks_count"], 0)
        self.assertEqual(response.data["current_streak"], 0)
        self.assertEqual(response.data["recent_study_sessions"], [])
        self.assertEqual(response.data["recent_notes"], [])
        self.assertEqual(response.data["recent_resources"], [])

    def test_dashboard_metrics_accuracy(self):
        today = timezone.localdate()
        now = timezone.now()

        goal1 = Goal.objects.create(
            user=self.user,
            title="Goal 1",
            category="CS",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.HIGH,
        )
        goal2 = Goal.objects.create(
            user=self.user,
            title="Goal 2",
            category="Math",
            status=GoalStatus.COMPLETED,
            priority=GoalPriority.MEDIUM,
        )

        Task.objects.create(
            user=self.user,
            goal=goal1,
            title="Pending Task 1",
            status=TaskStatus.TODO,
            priority=TaskPriority.HIGH,
            due_date=today + timedelta(days=2),
        )
        Task.objects.create(
            user=self.user,
            goal=goal1,
            title="Overdue Task",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.HIGH,
            due_date=today - timedelta(days=1),
        )
        Task.objects.create(
            user=self.user,
            goal=goal2,
            title="Completed Task",
            status=TaskStatus.COMPLETED,
            priority=TaskPriority.MEDIUM,
            due_date=today,
        )

        # Today study session: 3600 seconds
        StudySession.objects.create(
            user=self.user,
            goal=goal1,
            started_at=now - timedelta(hours=1),
            ended_at=now,
            duration_seconds=3600,
        )
        # 3 days ago study session: 1800 seconds
        past_time = now - timedelta(days=3)
        StudySession.objects.create(
            user=self.user,
            goal=goal1,
            started_at=past_time - timedelta(minutes=30),
            ended_at=past_time,
            duration_seconds=1800,
        )

        # Note and Resource
        note = Note.objects.create(user=self.user, title="Quick Note", content="Sample note")
        res = Resource.objects.create(
            user=self.user,
            title="Sample Resource",
            resource_type=ResourceType.LINK,
            url="https://example.com",
        )

        response = self.client.get("/api/analytics/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["today_study_seconds"], 3600)
        self.assertEqual(response.data["weekly_study_seconds"], 5400)
        self.assertEqual(response.data["monthly_study_seconds"], 5400)
        self.assertEqual(response.data["total_study_seconds"], 5400)
        self.assertEqual(response.data["active_goals_count"], 1)
        self.assertEqual(response.data["completed_goals_count"], 1)
        self.assertEqual(response.data["total_goals_count"], 2)
        self.assertEqual(response.data["pending_tasks_count"], 2)
        self.assertEqual(response.data["completed_tasks_count"], 1)
        self.assertEqual(response.data["overdue_tasks_count"], 1)
        self.assertEqual(response.data["total_tasks_count"], 3)
        self.assertEqual(len(response.data["recent_study_sessions"]), 2)
        self.assertEqual(len(response.data["recent_notes"]), 1)
        self.assertEqual(len(response.data["recent_resources"]), 1)

    def test_study_time_daily_breakdown_7_days(self):
        now = timezone.now()
        goal = Goal.objects.create(user=self.user, title="Study Goal", category="CS")

        StudySession.objects.create(
            user=self.user,
            goal=goal,
            started_at=now - timedelta(hours=1),
            ended_at=now,
            duration_seconds=3600,
        )

        response = self.client.get("/api/analytics/study-time/?days=7")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["days"], 7)
        self.assertEqual(len(response.data["daily_breakdown"]), 7)
        self.assertEqual(response.data["total_seconds"], 3600)

        today_str = timezone.localdate().isoformat()
        today_entry = next(
            (item for item in response.data["daily_breakdown"] if item["date"] == today_str),
            None,
        )
        self.assertIsNotNone(today_entry)
        self.assertEqual(today_entry["duration_seconds"], 3600)

    def test_study_time_daily_breakdown_30_days(self):
        response = self.client.get("/api/analytics/study-time/?days=30")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["days"], 30)
        self.assertEqual(len(response.data["daily_breakdown"]), 30)

    def test_study_time_invalid_days_param(self):
        response = self.client.get("/api/analytics/study-time/?days=invalid")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.get("/api/analytics/study-time/?days=0")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.get("/api/analytics/study-time/?days=500")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_goal_analytics_and_zero_tasks_safety(self):
        g1 = Goal.objects.create(user=self.user, title="Goal with Tasks", category="CS")
        g2 = Goal.objects.create(user=self.user, title="Goal with Zero Tasks", category="Math")

        Task.objects.create(user=self.user, goal=g1, title="T1", status=TaskStatus.COMPLETED)
        Task.objects.create(user=self.user, goal=g1, title="T2", status=TaskStatus.TODO)

        now = timezone.now()
        StudySession.objects.create(
            user=self.user,
            goal=g1,
            started_at=now - timedelta(hours=1),
            ended_at=now,
            duration_seconds=3600,
        )

        response = self.client.get("/api/analytics/goals/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        g1_data = next(item for item in response.data if item["id"] == g1.id)
        self.assertEqual(g1_data["total_tasks"], 2)
        self.assertEqual(g1_data["completed_tasks"], 1)
        self.assertEqual(g1_data["completion_percentage"], 50.0)
        self.assertEqual(g1_data["total_study_seconds"], 3600)

        g2_data = next(item for item in response.data if item["id"] == g2.id)
        self.assertEqual(g2_data["total_tasks"], 0)
        self.assertEqual(g2_data["completed_tasks"], 0)
        self.assertEqual(g2_data["completion_percentage"], 0.0)
        self.assertEqual(g2_data["total_study_seconds"], 0)

    def test_task_analytics_distributions_and_counts(self):
        today = timezone.localdate()
        goal = Goal.objects.create(user=self.user, title="Goal", category="CS")

        Task.objects.create(
            user=self.user,
            goal=goal,
            title="T1",
            status=TaskStatus.COMPLETED,
            priority=TaskPriority.HIGH,
        )
        Task.objects.create(
            user=self.user,
            goal=goal,
            title="T2",
            status=TaskStatus.TODO,
            priority=TaskPriority.MEDIUM,
            due_date=today + timedelta(days=1),
        )
        Task.objects.create(
            user=self.user,
            goal=goal,
            title="T3",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.HIGH,
            due_date=today - timedelta(days=2),  # Overdue
        )

        response = self.client.get("/api/analytics/tasks/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_tasks"], 3)
        self.assertEqual(response.data["completed_tasks"], 1)
        self.assertEqual(response.data["pending_tasks"], 2)
        self.assertEqual(response.data["overdue_tasks"], 1)
        self.assertEqual(response.data["completion_rate"], 33.3)
        self.assertEqual(response.data["status_distribution"]["COMPLETED"], 1)
        self.assertEqual(response.data["status_distribution"]["TODO"], 1)
        self.assertEqual(response.data["status_distribution"]["IN_PROGRESS"], 1)
        self.assertEqual(response.data["priority_distribution"]["HIGH"], 2)
        self.assertEqual(response.data["priority_distribution"]["MEDIUM"], 1)

    def test_streak_calculation_active_today(self):
        now = timezone.now()
        goal = Goal.objects.create(user=self.user, title="Streak Goal", category="CS")

        for days_ago in [2, 1, 0]:
            session_time = now - timedelta(days=days_ago)
            StudySession.objects.create(
                user=self.user,
                goal=goal,
                started_at=session_time - timedelta(minutes=30),
                ended_at=session_time,
                duration_seconds=1800,
            )

        response = self.client.get("/api/analytics/dashboard/")
        self.assertEqual(response.data["current_streak"], 3)

    def test_streak_calculation_active_yesterday(self):
        now = timezone.now()
        goal = Goal.objects.create(user=self.user, title="Streak Goal", category="CS")

        for days_ago in [2, 1]:
            session_time = now - timedelta(days=days_ago)
            StudySession.objects.create(
                user=self.user,
                goal=goal,
                started_at=session_time - timedelta(minutes=30),
                ended_at=session_time,
                duration_seconds=1800,
            )

        response = self.client.get("/api/analytics/dashboard/")
        self.assertEqual(response.data["current_streak"], 2)

    def test_streak_calculation_broken(self):
        now = timezone.now()
        goal = Goal.objects.create(user=self.user, title="Streak Goal", category="CS")

        for days_ago in [4, 3, 2]:  # None yesterday or today
            session_time = now - timedelta(days=days_ago)
            StudySession.objects.create(
                user=self.user,
                goal=goal,
                started_at=session_time - timedelta(minutes=30),
                ended_at=session_time,
                duration_seconds=1800,
            )

        response = self.client.get("/api/analytics/dashboard/")
        self.assertEqual(response.data["current_streak"], 0)

    def test_multiple_sessions_same_day_count_as_one_streak_day(self):
        now = timezone.now()
        goal = Goal.objects.create(user=self.user, title="Streak Goal", category="CS")

        # 3 sessions today
        for _ in range(3):
            StudySession.objects.create(
                user=self.user,
                goal=goal,
                started_at=now - timedelta(minutes=45),
                ended_at=now,
                duration_seconds=2700,
            )

        response = self.client.get("/api/analytics/dashboard/")
        self.assertEqual(response.data["current_streak"], 1)

    def test_cross_user_isolation(self):
        # User A data
        g_a = Goal.objects.create(user=self.user, title="User A Goal", category="CS")
        Task.objects.create(user=self.user, goal=g_a, title="User A Task", status=TaskStatus.COMPLETED)
        StudySession.objects.create(
            user=self.user,
            goal=g_a,
            started_at=timezone.now() - timedelta(minutes=30),
            ended_at=timezone.now(),
            duration_seconds=1800,
        )

        # User B data
        g_b = Goal.objects.create(user=self.other_user, title="User B Goal", category="Math")
        Task.objects.create(user=self.other_user, goal=g_b, title="User B Task", status=TaskStatus.COMPLETED)
        StudySession.objects.create(
            user=self.other_user,
            goal=g_b,
            started_at=timezone.now() - timedelta(minutes=60),
            ended_at=timezone.now(),
            duration_seconds=3600,
        )

        # Authenticated as User A
        res_dash = self.client.get("/api/analytics/dashboard/")
        self.assertEqual(res_dash.data["total_study_seconds"], 1800)
        self.assertEqual(res_dash.data["total_goals_count"], 1)
        self.assertEqual(res_dash.data["total_tasks_count"], 1)

        res_goals = self.client.get("/api/analytics/goals/")
        self.assertEqual(len(res_goals.data), 1)
        self.assertEqual(res_goals.data[0]["id"], g_a.id)

        res_tasks = self.client.get("/api/analytics/tasks/")
        self.assertEqual(res_tasks.data["total_tasks"], 1)

        res_study = self.client.get("/api/analytics/study-time/?days=7")
        self.assertEqual(res_study.data["total_seconds"], 1800)
