import logging
import math
from typing import Any, Dict, List, Optional

from django.contrib.auth import get_user_model

from ai.models import DocumentChunk
from ai.providers import get_embedding_provider, get_llm_provider
from resources.models import Resource

logger = logging.getLogger(__name__)
User = get_user_model()


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculate cosine similarity between two float vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


def retrieve_relevant_chunks(
    user: Any,
    query: str,
    resource: Optional[Resource] = None,
    top_k: int = 4,
    similarity_threshold: float = -1.0,
    embedding_provider: Optional[Any] = None,
) -> List[Dict[str, Any]]:
    """Retrieve top-k most relevant DocumentChunks for a given user query using vector similarity."""
    if not query or not query.strip():
        return []

    # Ownership isolation: strictly query chunks belonging to this user
    chunks_qs = DocumentChunk.objects.filter(user=user).select_related("resource")
    if resource is not None:
        chunks_qs = chunks_qs.filter(resource=resource)

    candidate_chunks = list(chunks_qs)
    if not candidate_chunks:
        return []

    provider = embedding_provider or get_embedding_provider()
    query_vector = provider.generate_embedding(query.strip())
    if not query_vector:
        return []

    scored_chunks = []
    chunks_to_update = []

    for chunk in candidate_chunks:
        chunk_vector = chunk.embedding
        # If chunk embedding is missing or dimension mismatch with query vector, recalculate
        if not chunk_vector or not isinstance(chunk_vector, list) or len(chunk_vector) != len(query_vector):
            chunk_vector = provider.generate_embedding(chunk.content)
            chunk.embedding = chunk_vector
            chunks_to_update.append(chunk)

        sim = cosine_similarity(query_vector, chunk_vector)
        if sim >= similarity_threshold:
            scored_chunks.append({
                "chunk_id": chunk.id,
                "resource_id": chunk.resource_id,
                "resource_title": chunk.resource.title if chunk.resource else "Untitled Resource",
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "similarity": sim,
            })

    # Cache any computed chunk embeddings back to DB
    if chunks_to_update:
        DocumentChunk.objects.bulk_update(chunks_to_update, ["embedding"])

    # Rank by similarity score descending
    scored_chunks.sort(key=lambda item: item["similarity"], reverse=True)
    return scored_chunks[:top_k]


def generate_grounded_response(
    user: Any,
    query: str,
    resource: Optional[Resource] = None,
    top_k: int = 4,
    llm_provider=None,
    embedding_provider=None,
) -> Dict[str, Any]:
    """Execute RAG retrieval and generate grounded response with source citations."""
    relevant_chunks = retrieve_relevant_chunks(
        user=user,
        query=query,
        resource=resource,
        top_k=top_k,
        embedding_provider=embedding_provider,
    )

    if not relevant_chunks:
        return {
            "answer": "I could not find relevant information in the provided learning resources to answer this question.",
            "sources": [],
        }

    # Assemble contextual snippets
    context_blocks = []
    sources = []
    for idx, c in enumerate(relevant_chunks, 1):
        context_blocks.append(
            f"[Source {idx}: \"{c['resource_title']}\" (Chunk #{c['chunk_index']})]:\n{c['content']}"
        )
        sources.append({
            "chunk_id": c["chunk_id"],
            "resource_id": c["resource_id"],
            "resource_title": c["resource_title"],
            "chunk_index": c["chunk_index"],
            "snippet": c["content"][:180],
        })

    context_str = "\n\n".join(context_blocks)
    system_prompt = (
        "You are a helpful and precise learning assistant. "
        "Answer the user's question using ONLY the provided context. "
        "If the context does not contain enough information to answer, truthfully say you do not know based on the provided material. "
        "Do not extrapolate or hallucinate facts outside the context."
    )
    user_prompt = f"Context:\n{context_str}\n\nUser Question: {query}\n\nGrounded Answer:"

    provider = llm_provider or get_llm_provider()
    raw_answer = provider.generate_text(prompt=user_prompt, system_prompt=system_prompt)

    return {
        "answer": raw_answer.strip(),
        "sources": sources,
    }
