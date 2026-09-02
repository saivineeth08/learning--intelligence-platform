from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from goals.models import Goal, GoalPriority, GoalStatus
from notes.models import Note
from resources.models import Resource, ResourceType
from tasks.models import Task, TaskPriority, TaskStatus

User = get_user_model()


class NoteAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="noteuser",
            email="noteuser@example.com",
            password="StrongPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="otheruser",
            email="otheruser@example.com",
            password="StrongPassword123!",
        )

        self.goal = Goal.objects.create(
            user=self.user,
            title="Algorithm Mastery",
            category="CS",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.HIGH,
        )
        self.task = Task.objects.create(
            user=self.user,
            goal=self.goal,
            title="Dynamic Programming",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.HIGH,
        )
        self.resource = Resource.objects.create(
            user=self.user,
            title="DP Cheat Sheet",
            resource_type=ResourceType.LINK,
            url="https://cheatsheet.com",
            goal=self.goal,
            task=self.task,
        )

        self.other_goal = Goal.objects.create(
            user=self.other_user,
            title="Other User Goal",
            category="Other",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.LOW,
        )
        self.other_task = Task.objects.create(
            user=self.other_user,
            goal=self.other_goal,
            title="Other User Task",
            status=TaskStatus.TODO,
            priority=TaskPriority.LOW,
        )
        self.other_resource = Resource.objects.create(
            user=self.other_user,
            title="Other Resource",
            resource_type=ResourceType.LINK,
            url="https://other.com",
        )

        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_unauthenticated_requests_are_rejected(self):
        anonymous_client = APIClient()
        response = anonymous_client.get("/api/notes/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_note_standalone_success(self):
        payload = {
            "title": "Quick Thoughts",
            "content": "Remember to practice recursion daily.",
        }
        response = self.client.post("/api/notes/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Quick Thoughts")
        self.assertEqual(response.data["content"], "Remember to practice recursion daily.")
        self.assertIsNone(response.data["goal"])
        self.assertIsNone(response.data["task"])
        self.assertIsNone(response.data["resource"])

    def test_create_note_with_all_relations_success(self):
        payload = {
            "title": "DP Knapsack Notes",
            "content": "0/1 Knapsack is solved using a 2D table or 1D rolling array.",
            "goal": self.goal.id,
            "task": self.task.id,
            "resource": self.resource.id,
        }
        response = self.client.post("/api/notes/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["goal"], self.goal.id)
        self.assertEqual(response.data["goal_title"], self.goal.title)
        self.assertEqual(response.data["task"], self.task.id)
        self.assertEqual(response.data["task_title"], self.task.title)
        self.assertEqual(response.data["resource"], self.resource.id)
        self.assertEqual(response.data["resource_title"], self.resource.title)

    def test_list_notes_scoped_to_user(self):
        Note.objects.create(
            user=self.user,
            title="User 1 Note",
            content="Private study note",
        )
        Note.objects.create(
            user=self.other_user,
            title="User 2 Note",
            content="Private other note",
        )
        response = self.client.get("/api/notes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["title"], "User 1 Note")

    def test_retrieve_and_ownership_isolation(self):
        own_note = Note.objects.create(
            user=self.user,
            title="My Note",
            content="Confidential thoughts",
        )
        other_note = Note.objects.create(
            user=self.other_user,
            title="Other Note",
            content="Secret thoughts",
        )

        response = self.client.get(f"/api/notes/{own_note.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "My Note")

        response = self.client.get(f"/api/notes/{other_note.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_own_note_success(self):
        note = Note.objects.create(
            user=self.user,
            title="Old Title",
            content="Old Content",
        )
        response = self.client.patch(
            f"/api/notes/{note.id}/",
            {"title": "New Title", "content": "New Content"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertEqual(note.title, "New Title")
        self.assertEqual(note.content, "New Content")

    def test_cannot_update_other_user_note(self):
        other_note = Note.objects.create(
            user=self.other_user,
            title="Other Title",
            content="Other Content",
        )
        response = self.client.patch(
            f"/api/notes/{other_note.id}/",
            {"title": "Hacked Title"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_own_note_success(self):
        note = Note.objects.create(
            user=self.user,
            title="To be deleted",
            content="Will be deleted",
        )
        response = self.client.delete(f"/api/notes/{note.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Note.objects.filter(id=note.id).exists())

    def test_cannot_delete_other_user_note(self):
        other_note = Note.objects.create(
            user=self.other_user,
            title="Other Note",
            content="Content",
        )
        response = self.client.delete(f"/api/notes/{other_note.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Note.objects.filter(id=other_note.id).exists())

    def test_search_and_filtering(self):
        n1 = Note.objects.create(
            user=self.user,
            title="Graph Algorithms",
            content="Dijkstra and A* algorithms",
            goal=self.goal,
        )
        n2 = Note.objects.create(
            user=self.user,
            title="Tree Traversals",
            content="Preorder, in-order, postorder",
            task=self.task,
            resource=self.resource,
        )

        # Search by title
        res = self.client.get("/api/notes/?search=Graph")
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["id"], n1.id)

        # Search by content
        res = self.client.get("/api/notes/?search=Dijkstra")
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["id"], n1.id)

        # Filter by goal
        res = self.client.get(f"/api/notes/?goal={self.goal.id}")
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["id"], n1.id)

        # Filter by task
        res = self.client.get(f"/api/notes/?task={self.task.id}")
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["id"], n2.id)

        # Filter by resource
        res = self.client.get(f"/api/notes/?resource={self.resource.id}")
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["id"], n2.id)

    def test_notes_pagination(self):
        # Create 24 more notes
        more_notes = [
            Note(
                user=self.user,
                title=f"Note #{i}",
                content=f"Content for note #{i}",
            )
            for i in range(24)
        ]
        Note.objects.bulk_create(more_notes)

        # Page 1
        res_p1 = self.client.get("/api/notes/")
        self.assertEqual(res_p1.status_code, status.HTTP_200_OK)
        self.assertEqual(res_p1.data["count"], 24)
        self.assertEqual(len(res_p1.data["results"]), 20)

        # Page 2
        res_p2 = self.client.get("/api/notes/?page=2")
        self.assertEqual(res_p2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_p2.data["results"]), 4)

    def test_cross_user_goal_rejection(self):
        payload = {
            "title": "Cross User Goal Test",
            "goal": self.other_goal.id,
        }
        response = self.client.post("/api/notes/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_user_task_rejection(self):
        payload = {
            "title": "Cross User Task Test",
            "task": self.other_task.id,
        }
        response = self.client.post("/api/notes/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_user_resource_rejection(self):
        payload = {
            "title": "Cross User Resource Test",
            "resource": self.other_resource.id,
        }
        response = self.client.post("/api/notes/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_task_goal_mismatch_rejection(self):
        another_goal = Goal.objects.create(
            user=self.user,
            title="Another Goal",
            category="Other",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.LOW,
        )
        payload = {
            "title": "Mismatch Test",
            "goal": another_goal.id,
            "task": self.task.id,  # belongs to self.goal
        }
        response = self.client.post("/api/notes/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
