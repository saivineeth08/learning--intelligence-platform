from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from goals.models import Goal
from tasks.models import Task
from notes.models import Note
from resources.models import Resource

User = get_user_model()


class SearchAuthTests(TestCase):
    """Unauthenticated requests must be rejected."""

    def test_search_requires_authentication(self):
        client = APIClient()
        response = client.get("/api/search/?q=python")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SearchValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="searcher", email="searcher@example.com", password="Pass1234!"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_empty_query_returns_error(self):
        response = self.client.get("/api/search/?q=")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_short_query_returns_error(self):
        response = self.client.get("/api/search/?q=a")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_query_returns_error(self):
        response = self.client.get("/api/search/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SearchResultTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="searcher2", email="searcher2@example.com", password="Pass1234!"
        )
        self.other_user = User.objects.create_user(
            username="other", email="other@example.com", password="Pass1234!"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.goal = Goal.objects.create(
            user=self.user,
            title="Learn Python Programming",
            description="A goal to master Python",
        )
        Task.objects.create(
            user=self.user,
            goal=self.goal,
            title="Study Python basics",
            description="Cover variables, loops, functions",
        )
        Resource.objects.create(
            user=self.user,
            title="Python Crash Course PDF",
            description="Beginner Python book",
            resource_type="FILE",
        )
        Note.objects.create(
            user=self.user,
            title="Python notes",
            content="Python is great for scripting",
        )
        # Unrelated data
        Goal.objects.create(
            user=self.user,
            title="Learn Java",
            description="Java programming",
        )
        # Other user's data — must NOT appear in results
        Goal.objects.create(
            user=self.other_user,
            title="Python goal owned by other",
        )

    def test_search_returns_matching_results(self):
        response = self.client.get("/api/search/?q=python")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("results", data)
        self.assertIn("count", data)
        self.assertIn("query", data)
        self.assertEqual(data["query"], "python")
        self.assertGreater(data["count"], 0)

    def test_search_respects_ownership(self):
        """Results must only contain the authenticated user's data."""
        response = self.client.get("/api/search/?q=python")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for result in response.json()["results"]:
            # All returned items should belong to self.user; other_user's goal must not appear
            self.assertNotEqual(result["title"], "Python goal owned by other")

    def test_search_type_filter_goals_only(self):
        response = self.client.get("/api/search/?q=python&type=goal")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for result in response.json()["results"]:
            self.assertEqual(result["type"], "goal")

    def test_search_type_filter_notes_only(self):
        response = self.client.get("/api/search/?q=python&type=note")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for result in response.json()["results"]:
            self.assertEqual(result["type"], "note")

    def test_search_no_match_returns_empty(self):
        response = self.client.get("/api/search/?q=zzznomatch")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["count"], 0)

    def test_response_schema(self):
        response = self.client.get("/api/search/?q=python")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("query", data)
        self.assertIn("count", data)
        self.assertIn("results", data)
        for result in data["results"]:
            self.assertIn("type", result)
            self.assertIn("id", result)
            self.assertIn("title", result)
            self.assertIn("url", result)
