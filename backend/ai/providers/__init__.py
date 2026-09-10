import os
from django.conf import settings

from ai.providers.base import BaseEmbeddingProvider, BaseLLMProvider
from ai.providers.mock_provider import MockEmbeddingProvider, MockLLMProvider
from ai.providers.openai_provider import AIConfigurationError, OpenAIProvider

__all__ = [
    "BaseLLMProvider",
    "BaseEmbeddingProvider",
    "MockLLMProvider",
    "MockEmbeddingProvider",
    "OpenAIProvider",
    "AIConfigurationError",
    "get_llm_provider",
    "get_embedding_provider",
]


def get_llm_provider(fixed_response=None) -> BaseLLMProvider:
    """Factory to retrieve configured LLM provider instance."""
    if fixed_response is not None:
        return MockLLMProvider(fixed_response=fixed_response)

    provider_name = getattr(settings, "AI_PROVIDER", "mock").lower()
    api_key = getattr(settings, "AI_API_KEY", "") or os.environ.get("OPENAI_API_KEY", "")

    if provider_name == "mock":
        return MockLLMProvider()

    if provider_name == "openai":
        if not api_key:
            raise AIConfigurationError("AI service is not configured. Please configure an AI provider.")
        return OpenAIProvider(api_key=api_key)

    raise AIConfigurationError(f"Unsupported or unconfigured AI provider: '{provider_name}'.")


def get_embedding_provider() -> BaseEmbeddingProvider:
    """Factory to retrieve configured Embedding provider instance."""
    provider_name = getattr(settings, "AI_PROVIDER", "mock").lower()
    api_key = getattr(settings, "AI_API_KEY", "") or os.environ.get("OPENAI_API_KEY", "")

    if provider_name == "mock":
        return MockEmbeddingProvider()

    if provider_name == "openai":
        if not api_key:
            raise AIConfigurationError("AI service is not configured. Please configure an AI provider.")
        return OpenAIProvider(api_key=api_key)

    raise AIConfigurationError(f"Unsupported or unconfigured AI provider: '{provider_name}'.")

