from django.contrib.auth import get_user_model
from django.test import TestCase

from ai.models import DocumentChunk
from ai.providers.mock_provider import MockLLMProvider
from ai.services.rag_service import (
    cosine_similarity,
    generate_grounded_response,
    retrieve_relevant_chunks,
)
from resources.models import Resource, ResourceType

User = get_user_model()


class RAGServiceTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="raguser",
            email="raguser@example.com",
            password="StrongPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="otherraguser",
            email="otherraguser@example.com",
            password="StrongPassword123!",
        )

        self.resource = Resource.objects.create(
            user=self.user,
            title="Data Structures & Algorithms",
            resource_type=ResourceType.LINK,
            url="https://example.com/dsa",
        )

        self.chunk1 = DocumentChunk.objects.create(
            resource=self.resource,
            user=self.user,
            chunk_index=0,
            content="Binary Search runs in logarithmic time O(log n) on sorted arrays.",
        )
        self.chunk2 = DocumentChunk.objects.create(
            resource=self.resource,
            user=self.user,
            chunk_index=1,
            content="Merge Sort is a divide-and-conquer algorithm with O(n log n) complexity.",
        )
        self.chunk3 = DocumentChunk.objects.create(
            resource=self.resource,
            user=self.user,
            chunk_index=2,
            content="Quick Sort chooses a pivot and partitions the array.",
        )

        # Other user's chunk
        self.other_resource = Resource.objects.create(
            user=self.other_user,
            title="Private Math Notes",
            resource_type=ResourceType.LINK,
            url="https://example.com/math",
        )
        self.other_chunk = DocumentChunk.objects.create(
            resource=self.other_resource,
            user=self.other_user,
            chunk_index=0,
            content="Secret Calculus Theorems and Integral formulas.",
        )

    def test_cosine_similarity_edge_cases(self):
        self.assertEqual(cosine_similarity([], []), 0.0)
        self.assertEqual(cosine_similarity([1.0, 0.0], [0.0, 1.0]), 0.0)
        self.assertAlmostEqual(cosine_similarity([1.0, 1.0], [1.0, 1.0]), 1.0, places=5)
        self.assertEqual(cosine_similarity([0.0, 0.0], [1.0, 1.0]), 0.0)

    def test_retrieve_relevant_chunks_ordering_and_top_k(self):
        results = retrieve_relevant_chunks(
            user=self.user,
            query="Binary Search time complexity",
            top_k=2,
        )
        self.assertTrue(len(results) <= 2)
        self.assertTrue(len(results) > 0)
        # Verify result contains citation metadata
        self.assertIn("chunk_id", results[0])
        self.assertIn("resource_id", results[0])
        self.assertIn("similarity", results[0])

    def test_retrieve_relevant_chunks_user_isolation(self):
        # Searching as self.user should never return other_user's chunks
        results = retrieve_relevant_chunks(
            user=self.user,
            query="Calculus Theorems and formulas",
            top_k=10,
        )
        returned_chunk_ids = [r["chunk_id"] for r in results]
        self.assertNotIn(self.other_chunk.id, returned_chunk_ids)

    def test_retrieve_relevant_chunks_empty_query(self):
        self.assertEqual(retrieve_relevant_chunks(user=self.user, query=""), [])
        self.assertEqual(retrieve_relevant_chunks(user=self.user, query="   "), [])

    def test_generate_grounded_response_with_mock_llm(self):
        custom_llm = MockLLMProvider(fixed_response="Binary Search requires O(log n) time.")
        resp = generate_grounded_response(
            user=self.user,
            query="What is the time complexity of Binary Search?",
            resource=self.resource,
            llm_provider=custom_llm,
        )
        self.assertEqual(resp["answer"], "Binary Search requires O(log n) time.")
        self.assertTrue(len(resp["sources"]) > 0)
        self.assertEqual(resp["sources"][0]["resource_id"], self.resource.id)

    def test_generate_grounded_response_empty_state_safety(self):
        # User with no chunks gets graceful fallback
        empty_user = User.objects.create_user(
            username="emptyuser",
            email="empty@example.com",
            password="StrongPassword123!",
        )
        resp = generate_grounded_response(
            user=empty_user,
            query="Explain recursion",
        )
        self.assertIn("could not find relevant information", resp["answer"].lower())
        self.assertEqual(resp["sources"], [])
