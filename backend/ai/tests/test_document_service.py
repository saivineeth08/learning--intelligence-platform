import io
import os
import shutil
import tempfile
import zipfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
try:
    from pypdf import PageObject, PdfWriter
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False
from rest_framework.exceptions import PermissionDenied

from ai.models import DocumentChunk
from ai.providers.mock_provider import MockEmbeddingProvider, MockLLMProvider
from ai.providers.openai_provider import AIConfigurationError, OpenAIProvider
from ai.services.document_service import (
    clean_text,
    chunk_text,
    extract_text,
    extract_text_from_file,
    index_resource,
)
from resources.models import Resource, ResourceType

User = get_user_model()
TEST_MEDIA_DIR = tempfile.mkdtemp(prefix="ai_test_media_")


@override_settings(MEDIA_ROOT=TEST_MEDIA_DIR)
class DocumentServiceTestCase(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_DIR, ignore_errors=True)

    def setUp(self):
        self.user = User.objects.create_user(
            username="aiuser",
            email="aiuser@example.com",
            password="StrongPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="otheraiuser",
            email="otheraiuser@example.com",
            password="StrongPassword123!",
        )

    def test_clean_text_normalization(self):
        dirty = "  Hello \t World!\r\n\r\n\r\n\r\nThis is a   test.\xa0\xa0\nLine 2   \n\n\n\nEnd.  "
        cleaned = clean_text(dirty)
        expected = "Hello World!\n\nThis is a test.\nLine 2\n\nEnd."
        self.assertEqual(cleaned, expected)
        self.assertEqual(clean_text(""), "")
        self.assertEqual(clean_text(None), "")

    def test_chunk_text_basic_and_ordering(self):
        text = "Sentence one. Sentence two. Sentence three. Sentence four. Sentence five."
        chunks = chunk_text(text, chunk_size=30, overlap=10)
        self.assertTrue(len(chunks) > 1)
        # Verify ordering
        self.assertTrue(chunks[0].startswith("Sentence one"))
        self.assertTrue(chunks[-1].endswith("Sentence five."))

    def test_chunk_text_overlap(self):
        text = "0123456789012345678901234567890123456789"
        chunks = chunk_text(text, chunk_size=20, overlap=5)
        self.assertTrue(len(chunks) >= 2)
        # End of chunk 0 should overlap with start of chunk 1
        self.assertEqual(chunks[0][-5:], chunks[1][:5])

    def test_chunk_text_empty_and_short_document(self):
        self.assertEqual(chunk_text(""), [])
        self.assertEqual(chunk_text("   "), [])
        short = "Short document content."
        self.assertEqual(chunk_text(short, chunk_size=100), [short])

    def test_chunk_text_invalid_parameters(self):
        with self.assertRaises(ValueError):
            chunk_text("Sample", chunk_size=0)
        with self.assertRaises(ValueError):
            chunk_text("Sample", chunk_size=100, overlap=100)
        with self.assertRaises(ValueError):
            chunk_text("Sample", chunk_size=100, overlap=-5)

    def test_txt_and_markdown_extraction(self):
        txt_file = SimpleUploadedFile("guide.txt", b"Introduction to Algorithms\nChapter 1.", content_type="text/plain")
        md_file = SimpleUploadedFile("notes.md", b"# Header\n\n* Bullet 1\n* Bullet 2", content_type="text/markdown")

        res_txt = Resource.objects.create(user=self.user, title="Text Doc", resource_type=ResourceType.FILE, file=txt_file)
        res_md = Resource.objects.create(user=self.user, title="MD Doc", resource_type=ResourceType.FILE, file=md_file)

        self.assertIn("Introduction to Algorithms", extract_text(res_txt))
        self.assertIn("Bullet 1", extract_text(res_md))

    def test_pdf_extraction(self):
        # Create a real minimal PDF in memory
        writer = PdfWriter()
        page = PageObject.create_blank_page(width=200, height=200)
        writer.add_page(page)

        pdf_io = io.BytesIO()
        writer.write(pdf_io)
        pdf_bytes = pdf_io.getvalue()

        pdf_file = SimpleUploadedFile("sample.pdf", pdf_bytes, content_type="application/pdf")
        res_pdf = Resource.objects.create(user=self.user, title="PDF Doc", resource_type=ResourceType.FILE, file=pdf_file)

        extracted = extract_text(res_pdf)
        self.assertIsInstance(extracted, str)

    def test_docx_extraction(self):
        # Create a real minimal DOCX zip in memory
        docx_io = io.BytesIO()
        with zipfile.ZipFile(docx_io, "w") as zf:
            xml_data = (
                b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                b'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                b'<w:body><w:p><w:r><w:t>Hello DOCX World!</w:t></w:r></w:p></w:body></w:document>'
            )
            zf.writestr("word/document.xml", xml_data)

        docx_file = SimpleUploadedFile("sample.docx", docx_io.getvalue(), content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        res_docx = Resource.objects.create(user=self.user, title="DOCX Doc", resource_type=ResourceType.FILE, file=docx_file)

        extracted = extract_text(res_docx)
        self.assertEqual(extracted, "Hello DOCX World!")

    def test_link_resource_extraction(self):
        res_link = Resource.objects.create(
            user=self.user,
            title="External Resource",
            description="Documentation for Django REST Framework",
            resource_type=ResourceType.LINK,
            url="https://www.django-rest-framework.org/",
        )
        extracted = extract_text(res_link)
        self.assertIn("External Resource", extracted)
        self.assertIn("Documentation for Django REST Framework", extracted)

    def test_unsupported_format_graceful_handling(self):
        img_file = SimpleUploadedFile("photo.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        res_img = Resource.objects.create(user=self.user, title="Image", resource_type=ResourceType.FILE, file=img_file)
        self.assertEqual(extract_text(res_img), "")

    def test_index_resource_creates_document_chunks(self):
        content = "Section 1: Data Structures.\nSection 2: Sorting Algorithms.\nSection 3: Graph Traversal."
        txt_file = SimpleUploadedFile("course.txt", content.encode("utf-8"), content_type="text/plain")
        res = Resource.objects.create(user=self.user, title="Course", resource_type=ResourceType.FILE, file=txt_file)

        result = index_resource(res, request_user=self.user, chunk_size=40, overlap=10)
        self.assertEqual(result["status"], "indexed")
        self.assertTrue(result["total_chunks"] >= 2)

        chunks = DocumentChunk.objects.filter(resource=res).order_by("chunk_index")
        self.assertEqual(chunks.count(), result["total_chunks"])
        self.assertEqual(chunks[0].chunk_index, 0)
        self.assertEqual(chunks[0].user, self.user)
        self.assertTrue(len(chunks[0].content) > 0)

    def test_index_resource_idempotence(self):
        content = "Paragraph A content.\n\nParagraph B content."
        txt_file = SimpleUploadedFile("idempotent.txt", content.encode("utf-8"), content_type="text/plain")
        res = Resource.objects.create(user=self.user, title="Idempotent", resource_type=ResourceType.FILE, file=txt_file)

        # Index once
        res1 = index_resource(res, request_user=self.user, chunk_size=30, overlap=5)
        chunks_count1 = DocumentChunk.objects.filter(resource=res).count()

        # Re-index without changing content
        res2 = index_resource(res, request_user=self.user, chunk_size=30, overlap=5)
        chunks_count2 = DocumentChunk.objects.filter(resource=res).count()

        self.assertEqual(chunks_count1, chunks_count2)
        self.assertEqual(res1["total_chunks"], res2["total_chunks"])

    def test_index_resource_cross_user_rejection(self):
        txt_file = SimpleUploadedFile("private.txt", b"Secret data", content_type="text/plain")
        res = Resource.objects.create(user=self.user, title="Private", resource_type=ResourceType.FILE, file=txt_file)

        with self.assertRaises(PermissionDenied):
            index_resource(res, request_user=self.other_user)

    def test_mock_llm_and_embedding_providers(self):
        llm = MockLLMProvider()
        text_resp = llm.generate_text("Explain binary search")
        self.assertIn("[MOCK AI RESPONSE]", text_resp)

        json_resp = llm.generate_json("Generate quiz")
        self.assertEqual(json_resp["status"], "success")

        emb = MockEmbeddingProvider(dimension=64)
        vec = emb.generate_embedding("Test sentence")
        self.assertEqual(len(vec), 64)
        self.assertEqual(len(emb.generate_embeddings(["A", "B"])), 2)

    def test_openai_provider_missing_key_graceful_handling(self):
        provider = OpenAIProvider(api_key="")
        with self.assertRaises(AIConfigurationError):
            provider.generate_text("Hello")

    def test_document_index_and_status_api_endpoints(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.user)

        txt_file = SimpleUploadedFile("api_doc.txt", b"First chapter of study material.", content_type="text/plain")
        res = Resource.objects.create(user=self.user, title="API Doc", resource_type=ResourceType.FILE, file=txt_file)

        # Status before indexing
        status_resp = client.get(f"/api/ai/documents/{res.id}/status/")
        self.assertEqual(status_resp.status_code, 200)
        self.assertFalse(status_resp.data["is_indexed"])
        self.assertEqual(status_resp.data["total_chunks"], 0)

        # Trigger indexing via API
        index_resp = client.post("/api/ai/documents/index/", {"resource_id": res.id}, format="json")
        self.assertEqual(index_resp.status_code, 200)
        self.assertEqual(index_resp.data["status"], "indexed")

        # Status after indexing
        status_resp2 = client.get(f"/api/ai/documents/{res.id}/status/")
        self.assertEqual(status_resp2.status_code, 200)
        self.assertTrue(status_resp2.data["is_indexed"])
        self.assertTrue(status_resp2.data["total_chunks"] >= 1)

        # Cross-user indexing rejection
        client.force_authenticate(user=self.other_user)
        rej_resp = client.post("/api/ai/documents/index/", {"resource_id": res.id}, format="json")
        self.assertEqual(rej_resp.status_code, 403)

