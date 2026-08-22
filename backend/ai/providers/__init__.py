import os
from django.conf import settings

from ai.providers.base import BaseEmbeddingProvider, BaseLLMProvider
from ai.providers.mock_provider import MockEmbeddingProvider, MockLLMProvider
from ai.providers.openai_provider import OpenAIProvider

__all__ = [
    "BaseLLMProvider",
    "BaseEmbeddingProvider",
    "MockLLMProvider",
    "MockEmbeddingProvider",
    "OpenAIProvider",
    "get_llm_provider",
    "get_embedding_provider",
]


def get_llm_provider(fixed_response=None) -> BaseLLMProvider:
    """Factory to retrieve configured LLM provider instance."""
    if fixed_response is not None:
        return MockLLMProvider(fixed_response=fixed_response)

    provider_name = getattr(settings, "AI_PROVIDER", "mock").lower()
    api_key = getattr(settings, "AI_API_KEY", "") or os.environ.get("OPENAI_API_KEY", "")

    if provider_name == "openai" and api_key:
        return OpenAIProvider()
    return MockLLMProvider()


def get_embedding_provider() -> BaseEmbeddingProvider:
    """Factory to retrieve configured Embedding provider instance."""
    provider_name = getattr(settings, "AI_PROVIDER", "mock").lower()
    api_key = getattr(settings, "AI_API_KEY", "") or os.environ.get("OPENAI_API_KEY", "")

    if provider_name == "openai" and api_key:
        return OpenAIProvider()
    return MockEmbeddingProvider()
