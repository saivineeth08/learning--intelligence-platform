from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from ai.models import DocumentChunk, Quiz, QuizQuestion
from ai.providers.mock_provider import MockLLMProvider
from ai.services.quiz_service import generate_quiz
from goals.models import Goal
from resources.models import Resource, ResourceType

User = get_user_model()


class QuizAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="quizuser",
            email="quizuser@example.com",
            password="StrongPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="otherquizuser",
            email="otherquizuser@example.com",
            password="StrongPassword123!",
        )

        self.goal = Goal.objects.create(
            user=self.user,
            title="Master Python Data Structures",
            description="Learn lists, dictionaries, tuples, sets, and deque.",
        )
        self.resource = Resource.objects.create(
            user=self.user,
            title="Python Algorithms Handbook",
            resource_type=ResourceType.LINK,
            url="https://example.com/python-algo",
        )
        DocumentChunk.objects.create(
            resource=self.resource,
            user=self.user,
            chunk_index=0,
            content="Python dictionaries are implemented using hash tables providing O(1) average lookup time.",
        )

        self.other_resource = Resource.objects.create(
            user=self.other_user,
            title="Other Secret Resource",
            resource_type=ResourceType.LINK,
            url="https://example.com/other-secret",
        )

    def test_unauthenticated_requests_are_rejected(self):
        endpoints = [
            ("get", "/api/ai/quizzes/"),
            ("post", "/api/ai/quizzes/generate/"),
            ("get", "/api/ai/quizzes/1/"),
        ]
        for method, url in endpoints:
            response = getattr(self.client, method)(url)
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"Expected 401 for {method.upper()} {url}",
            )

    def test_generate_quiz_from_resource_success(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "resource_id": self.resource.id,
            "title": "Python Dict Quiz",
            "question_count": 3,
            "difficulty": "MEDIUM",
        }
        response = self.client.post("/api/ai/quizzes/generate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Python Dict Quiz")
        self.assertEqual(response.data["resource"], self.resource.id)
        self.assertEqual(len(response.data["questions"]), 3)

        first_q = response.data["questions"][0]
        self.assertTrue(len(first_q["question"]) > 0)
        self.assertEqual(len(first_q["options"]), 4)
        self.assertTrue(len(first_q["correct_answer"]) > 0)
        self.assertTrue(len(first_q["explanation"]) > 0)
        self.assertEqual(first_q["difficulty"], "MEDIUM")

        # Verify DB state
        quiz = Quiz.objects.get(id=response.data["id"])
        self.assertEqual(quiz.user, self.user)
        self.assertEqual(quiz.questions.count(), 3)

    def test_generate_quiz_cross_user_resource_rejected(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "resource_id": self.other_resource.id,
            "question_count": 3,
        }
        response = self.client.post("/api/ai/quizzes/generate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_generate_quiz_invalid_question_count_rejected(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "resource_id": self.resource.id,
            "question_count": 50,  # Max allowed is 20
        }
        response = self.client.post("/api/ai/quizzes/generate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_quizzes_user_isolation(self):
        q1 = Quiz.objects.create(user=self.user, title="User A Quiz 1")
        q2 = Quiz.objects.create(user=self.other_user, title="User B Quiz 1")

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/ai/quizzes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], q1.id)

    def test_get_quiz_detail_and_questions(self):
        quiz = Quiz.objects.create(user=self.user, resource=self.resource, title="Detailed Quiz")
        QuizQuestion.objects.create(
            quiz=quiz,
            question="What is the average time complexity of dict lookup?",
            options=["O(1)", "O(n)", "O(log n)", "O(n^2)"],
            correct_answer="O(1)",
            explanation="Hash tables offer constant time average lookup.",
            difficulty="EASY",
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"/api/ai/quizzes/{quiz.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Detailed Quiz")
        self.assertEqual(len(response.data["questions"]), 1)
        self.assertEqual(response.data["questions"][0]["correct_answer"], "O(1)")

    def test_get_other_user_quiz_rejected(self):
        other_quiz = Quiz.objects.create(user=self.other_user, title="Other Quiz")

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"/api/ai/quizzes/{other_quiz.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_malformed_llm_output_handled_cleanly(self):
        bad_llm = MockLLMProvider(fixed_response="Invalid Non-JSON format")
        with self.assertRaises(Exception):
            generate_quiz(
                user=self.user,
                resource_id=self.resource.id,
                llm_provider=bad_llm,
            )
