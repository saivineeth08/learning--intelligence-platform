import os
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from goals.models import Goal, GoalPriority, GoalStatus
from resources.models import Resource, ResourceType
from tasks.models import Task, TaskPriority, TaskStatus

User = get_user_model()
TEMP_MEDIA_ROOT = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TEMP_MEDIA_ROOT)
class ResourceAPITestCase(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="resourceuser",
            email="resourceuser@example.com",
            password="StrongPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="otheruser",
            email="otheruser@example.com",
            password="StrongPassword123!",
        )

        self.goal = Goal.objects.create(
            user=self.user,
            title="Master Django",
            category="Backend",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.HIGH,
        )
        self.task = Task.objects.create(
            user=self.user,
            goal=self.goal,
            title="Read DRF Docs",
            status=TaskStatus.TODO,
            priority=TaskPriority.HIGH,
        )

        self.other_goal = Goal.objects.create(
            user=self.other_user,
            title="Other User Goal",
            category="Other",
            status=GoalStatus.ACTIVE,
            priority=GoalPriority.MEDIUM,
        )
        self.other_task = Task.objects.create(
            user=self.other_user,
            goal=self.other_goal,
            title="Other User Task",
            status=TaskStatus.TODO,
            priority=TaskPriority.MEDIUM,
        )

        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_unauthenticated_requests_are_rejected(self):
        anonymous_client = APIClient()
        response = anonymous_client.get("/api/resources/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_file_resource_success(self):
        uploaded_file = SimpleUploadedFile(
            name="notes.pdf",
            content=b"%PDF-1.4 test document content",
            content_type="application/pdf",
        )
        payload = {
            "title": "Django PDF Guide",
            "description": "Essential architecture tips",
            "resource_type": ResourceType.FILE,
            "file": uploaded_file,
            "goal": self.goal.id,
            "task": self.task.id,
        }
        response = self.client.post("/api/resources/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Django PDF Guide")
        self.assertEqual(response.data["resource_type"], ResourceType.FILE)
        self.assertEqual(response.data["goal"], self.goal.id)
        self.assertEqual(response.data["task"], self.task.id)
        self.assertIn("notes", response.data["file_name"])
        self.assertIsNotNone(response.data["file_url"])

    def test_create_link_resource_success(self):
        payload = {
            "title": "Django Official Docs",
            "description": "Documentation website",
            "resource_type": ResourceType.LINK,
            "url": "https://docs.djangoproject.com/en/stable/",
            "goal": self.goal.id,
        }
        response = self.client.post("/api/resources/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Django Official Docs")
        self.assertEqual(response.data["resource_type"], ResourceType.LINK)
        self.assertEqual(response.data["url"], "https://docs.djangoproject.com/en/stable/")
        self.assertIsNone(response.data["file_url"])

    def test_invalid_resource_type_rejected(self):
        payload = {
            "title": "Invalid Type",
            "resource_type": "VIDEO",
            "url": "https://youtube.com",
        }
        response = self.client.post("/api/resources/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_file_and_url_mutually_exclusive_for_file_resource(self):
        uploaded_file = SimpleUploadedFile(
            name="notes.pdf",
            content=b"%PDF-1.4 content",
            content_type="application/pdf",
        )
        payload = {
            "title": "Conflicting Resource",
            "resource_type": ResourceType.FILE,
            "file": uploaded_file,
            "url": "https://example.com",
        }
        response = self.client.post("/api/resources/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_file_and_url_mutually_exclusive_for_link_resource(self):
        uploaded_file = SimpleUploadedFile(
            name="notes.pdf",
            content=b"%PDF-1.4 content",
            content_type="application/pdf",
        )
        payload = {
            "title": "Conflicting Resource",
            "resource_type": ResourceType.LINK,
            "file": uploaded_file,
            "url": "https://example.com",
        }
        response = self.client.post("/api/resources/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_file_resource_without_file_rejected(self):
        payload = {
            "title": "Missing File",
            "resource_type": ResourceType.FILE,
        }
        response = self.client.post("/api/resources/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_link_resource_without_url_rejected(self):
        payload = {
            "title": "Missing URL",
            "resource_type": ResourceType.LINK,
        }
        response = self.client.post("/api/resources/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_file_extension_rejected(self):
        uploaded_file = SimpleUploadedFile(
            name="script.exe",
            content=b"MZ binary content",
            content_type="application/x-msdownload",
        )
        payload = {
            "title": "Executable File",
            "resource_type": ResourceType.FILE,
            "file": uploaded_file,
        }
        response = self.client.post("/api/resources/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_file_rejected(self):
        large_content = b"0" * (11 * 1024 * 1024)  # 11 MB
        uploaded_file = SimpleUploadedFile(
            name="huge.pdf",
            content=large_content,
            content_type="application/pdf",
        )
        payload = {
            "title": "Huge File",
            "resource_type": ResourceType.FILE,
            "file": uploaded_file,
        }
        response = self.client.post("/api/resources/", payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_resources_scoped_to_user(self):
        Resource.objects.create(
            user=self.user,
            title="User 1 Resource",
            resource_type=ResourceType.LINK,
            url="https://user1.com",
        )
        Resource.objects.create(
            user=self.other_user,
            title="User 2 Resource",
            resource_type=ResourceType.LINK,
            url="https://user2.com",
        )
        response = self.client.get("/api/resources/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["title"], "User 1 Resource")

    def test_retrieve_and_ownership_isolation(self):
        own_res = Resource.objects.create(
            user=self.user,
            title="Own Resource",
            resource_type=ResourceType.LINK,
            url="https://own.com",
        )
        other_res = Resource.objects.create(
            user=self.other_user,
            title="Other Resource",
            resource_type=ResourceType.LINK,
            url="https://other.com",
        )

        response = self.client.get(f"/api/resources/{own_res.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Own Resource")

        response = self.client.get(f"/api/resources/{other_res.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_own_resource_success(self):
        res = Resource.objects.create(
            user=self.user,
            title="Initial Title",
            resource_type=ResourceType.LINK,
            url="https://initial.com",
        )
        response = self.client.patch(
            f"/api/resources/{res.id}/",
            {"title": "Updated Title", "description": "Updated Description"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res.refresh_from_db()
        self.assertEqual(res.title, "Updated Title")
        self.assertEqual(res.description, "Updated Description")

    def test_cannot_update_other_user_resource(self):
        other_res = Resource.objects.create(
            user=self.other_user,
            title="Other Title",
            resource_type=ResourceType.LINK,
            url="https://other.com",
        )
        response = self.client.patch(
            f"/api/resources/{other_res.id}/",
            {"title": "Hacked Title"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_own_resource_and_file_cleanup(self):
        uploaded_file = SimpleUploadedFile(
            name="cleanup.pdf",
            content=b"%PDF-1.4 file to cleanup",
            content_type="application/pdf",
        )
        res = Resource.objects.create(
            user=self.user,
            title="File to delete",
            resource_type=ResourceType.FILE,
            file=uploaded_file,
        )
        file_path = res.file.path
        self.assertTrue(os.path.isfile(file_path))

        response = self.client.delete(f"/api/resources/{res.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Resource.objects.filter(id=res.id).exists())
        self.assertFalse(os.path.isfile(file_path))

    def test_cannot_delete_other_user_resource(self):
        other_res = Resource.objects.create(
            user=self.other_user,
            title="Other Delete",
            resource_type=ResourceType.LINK,
            url="https://other.com",
        )
        response = self.client.delete(f"/api/resources/{other_res.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Resource.objects.filter(id=other_res.id).exists())

    def test_search_and_filtering(self):
        r1 = Resource.objects.create(
            user=self.user,
            title="Python Tutorial",
            description="Basics of Python",
            resource_type=ResourceType.LINK,
            url="https://python.org",
            goal=self.goal,
        )
        r2 = Resource.objects.create(
            user=self.user,
            title="Django Reference",
            description="Deep dive into ORM",
            resource_type=ResourceType.LINK,
            url="https://djangoproject.com",
            task=self.task,
        )

        # Search by title
        res = self.client.get("/api/resources/?search=Python")
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["id"], r1.id)

        # Search by description
        res = self.client.get("/api/resources/?search=ORM")
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["id"], r2.id)

        # Filter by goal
        res = self.client.get(f"/api/resources/?goal={self.goal.id}")
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["id"], r1.id)

        # Filter by task
        res = self.client.get(f"/api/resources/?task={self.task.id}")
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["id"], r2.id)

    def test_resources_pagination_and_chunks_annotation(self):
        # Create 24 more resources
        more_resources = [
            Resource(
                user=self.user,
                title=f"Resource #{i}",
                resource_type=ResourceType.LINK,
                url=f"https://resource{i}.com",
            )
            for i in range(24)
        ]
        Resource.objects.bulk_create(more_resources)

        # Page 1
        res_p1 = self.client.get("/api/resources/")
        self.assertEqual(res_p1.status_code, status.HTTP_200_OK)
        self.assertEqual(res_p1.data["count"], 24)
        self.assertEqual(len(res_p1.data["results"]), 20)
        # Verify annotated fields are present and correct
        self.assertIn("is_indexed", res_p1.data["results"][0])
        self.assertIn("chunk_count", res_p1.data["results"][0])
        self.assertFalse(res_p1.data["results"][0]["is_indexed"])
        self.assertEqual(res_p1.data["results"][0]["chunk_count"], 0)

        # Page 2
        res_p2 = self.client.get("/api/resources/?page=2")
        self.assertEqual(res_p2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_p2.data["results"]), 4)

    def test_cross_user_goal_rejection(self):
        payload = {
            "title": "Cross User Goal Test",
            "resource_type": ResourceType.LINK,
            "url": "https://test.com",
            "goal": self.other_goal.id,
        }
        response = self.client.post("/api/resources/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_user_task_rejection(self):
        payload = {
            "title": "Cross User Task Test",
            "resource_type": ResourceType.LINK,
            "url": "https://test.com",
            "task": self.other_task.id,
        }
        response = self.client.post("/api/resources/", payload, format="json")
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
            "resource_type": ResourceType.LINK,
            "url": "https://test.com",
            "goal": another_goal.id,
            "task": self.task.id,  # belongs to self.goal, not another_goal
        }
        response = self.client.post("/api/resources/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
