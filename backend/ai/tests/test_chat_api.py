from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from ai.models import AIChatMessage, AIChatSession, DocumentChunk
from resources.models import Resource, ResourceType

User = get_user_model()


class ChatAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="chatuser",
            email="chatuser@example.com",
            password="StrongPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="otherchatuser",
            email="otherchatuser@example.com",
            password="StrongPassword123!",
        )

        self.resource = Resource.objects.create(
            user=self.user,
            title="Operating Systems Concepts",
            resource_type=ResourceType.LINK,
            url="https://example.com/os",
        )
        self.chunk = DocumentChunk.objects.create(
            resource=self.resource,
            user=self.user,
            chunk_index=0,
            content="Virtual memory allows the execution of processes that may not be completely in memory.",
        )

        self.other_resource = Resource.objects.create(
            user=self.other_user,
            title="Other's Secret Doc",
            resource_type=ResourceType.LINK,
            url="https://example.com/other",
        )

    def test_unauthenticated_requests_are_rejected(self):
        endpoints = [
            ("get", "/api/ai/chat/sessions/"),
            ("post", "/api/ai/chat/sessions/"),
            ("get", "/api/ai/chat/sessions/1/"),
            ("post", "/api/ai/chat/sessions/1/messages/"),
        ]
        for method, url in endpoints:
            response = getattr(self.client, method)(url)
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"Expected 401 for {method.upper()} {url}",
            )

    def test_create_chat_session_success(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "resource_id": self.resource.id,
            "title": "OS Study Chat",
        }
        response = self.client.post("/api/ai/chat/sessions/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "OS Study Chat")
        self.assertEqual(response.data["resource"], self.resource.id)
        self.assertEqual(response.data["resource_title"], self.resource.title)

        session = AIChatSession.objects.get(id=response.data["id"])
        self.assertEqual(session.user, self.user)

    def test_create_chat_session_cross_user_resource_rejected(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "resource_id": self.other_resource.id,
            "title": "Illegal Chat",
        }
        response = self.client.post("/api/ai/chat/sessions/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_chat_sessions_user_isolation(self):
        AIChatSession.objects.create(user=self.user, title="User A Session")
        AIChatSession.objects.create(user=self.other_user, title="User B Session")

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/ai/chat/sessions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "User A Session")

    def test_get_chat_session_detail_and_history(self):
        session = AIChatSession.objects.create(user=self.user, resource=self.resource, title="OS Session")
        AIChatMessage.objects.create(session=session, sender="USER", message="What is virtual memory?")
        AIChatMessage.objects.create(
            session=session,
            sender="AI",
            message="Virtual memory separates user logical memory from physical memory.",
            sources=[{"chunk_id": self.chunk.id, "snippet": "Virtual memory allows..."}],
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"/api/ai/chat/sessions/{session.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "OS Session")
        self.assertEqual(len(response.data["messages"]), 2)
        self.assertEqual(response.data["messages"][0]["sender"], "USER")
        self.assertEqual(response.data["messages"][1]["sender"], "AI")
        self.assertEqual(len(response.data["messages"][1]["sources"]), 1)

    def test_get_other_user_chat_session_rejected(self):
        other_session = AIChatSession.objects.create(user=self.other_user, title="Private Session")

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"/api/ai/chat/sessions/{other_session.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_send_chat_message_flow(self):
        session = AIChatSession.objects.create(user=self.user, resource=self.resource, title="Live Chat")

        self.client.force_authenticate(user=self.user)
        payload = {"message": "Explain virtual memory execution."}
        response = self.client.post(
            f"/api/ai/chat/sessions/{session.id}/messages/",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sender"], "AI")
        self.assertTrue(len(response.data["message"]) > 0)
        self.assertIsInstance(response.data["sources"], list)

        # Verify DB state
        messages = session.messages.order_by("created_at")
        self.assertEqual(messages.count(), 2)
        self.assertEqual(messages[0].sender, "USER")
        self.assertEqual(messages[0].message, "Explain virtual memory execution.")
        self.assertEqual(messages[1].sender, "AI")

    def test_send_chat_message_to_other_user_session_rejected(self):
        other_session = AIChatSession.objects.create(user=self.other_user, title="Other Session")

        self.client.force_authenticate(user=self.user)
        payload = {"message": "Trying to write to other's session"}
        response = self.client.post(
            f"/api/ai/chat/sessions/{other_session.id}/messages/",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_send_empty_chat_message_rejected(self):
        session = AIChatSession.objects.create(user=self.user, title="Empty Test")
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f"/api/ai/chat/sessions/{session.id}/messages/",
            {"message": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
