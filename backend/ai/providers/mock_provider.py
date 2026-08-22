import hashlib
import json
import math
from typing import Any, Dict, List, Optional

from ai.providers.base import BaseEmbeddingProvider, BaseLLMProvider


class MockLLMProvider(BaseLLMProvider):
    """Deterministic mock LLM provider for unit tests and local development."""

    def __init__(self, fixed_response: Optional[str] = None):
        self.fixed_response = fixed_response

    def generate_text(
        self, prompt: str, system_prompt: Optional[str] = None, **kwargs: Any
    ) -> str:
        if self.fixed_response is not None:
            return self.fixed_response
        return f"[MOCK AI RESPONSE]: Grounded response to prompt length {len(prompt)}."

    def generate_json(
        self, prompt: str, system_prompt: Optional[str] = None, **kwargs: Any
    ) -> Dict[str, Any]:
        if self.fixed_response is not None:
            try:
                return json.loads(self.fixed_response)
            except json.JSONDecodeError:
                pass
        return {
            "status": "success",
            "mock": True,
            "prompt_length": len(prompt),
            "summary": "Mock structured response",
        }


class MockEmbeddingProvider(BaseEmbeddingProvider):
    """Deterministic embedding provider that creates normalized fixed-size pseudo-vectors."""

    def __init__(self, dimension: int = 128):
        self.dimension = dimension

    def generate_embedding(self, text: str, **kwargs: Any) -> List[float]:
        if not text:
            return [0.0] * self.dimension

        # Generate a deterministic vector from text MD5 hash seeds
        raw_values = []
        for i in range(self.dimension):
            seed = f"{text}:{i}".encode("utf-8")
            hash_val = int(hashlib.md5(seed).hexdigest(), 16)
            # Map to [-1.0, 1.0]
            val = (hash_val % 2000 - 1000) / 1000.0
            raw_values.append(val)

        # Normalize to unit length
        norm = math.sqrt(sum(v * v for v in raw_values))
        if norm == 0:
            return raw_values
        return [round(v / norm, 6) for v in raw_values]

    def generate_embeddings(
        self, texts: List[str], **kwargs: Any
    ) -> List[List[float]]:
        return [self.generate_embedding(t, **kwargs) for t in texts]
