import json
import logging
import os
from typing import Any, Dict, List, Optional

from django.conf import settings
from rest_framework.exceptions import APIException

from ai.providers.base import BaseEmbeddingProvider, BaseLLMProvider

logger = logging.getLogger(__name__)


class AIConfigurationError(APIException):
    status_code = 503
    default_detail = "AI Service is currently unavailable or unconfigured."
    default_code = "ai_service_unconfigured"


class OpenAIProvider(BaseLLMProvider, BaseEmbeddingProvider):
    """OpenAI API provider implementation with graceful fallback and configuration handling."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        embedding_model: Optional[str] = None,
    ):
        self.api_key = (
            api_key
            or getattr(settings, "AI_API_KEY", "")
            or os.environ.get("OPENAI_API_KEY", "")
        )
        self.model = (
            model
            or getattr(settings, "AI_MODEL", "")
            or os.environ.get("AI_MODEL", "gpt-4o-mini")
        )
        self.embedding_model = (
            embedding_model
            or getattr(settings, "EMBEDDING_MODEL", "")
            or os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")
        )

    def _get_client(self):
        if not self.api_key:
            raise AIConfigurationError(
                "OpenAI API key is missing. Please configure OPENAI_API_KEY in the environment."
            )
        try:
            import openai

            return openai.OpenAI(api_key=self.api_key)
        except ImportError:
            raise AIConfigurationError(
                "The 'openai' python package is not installed."
            )

    def generate_text(
        self, prompt: str, system_prompt: Optional[str] = None, **kwargs: Any
    ) -> str:
        client = self._get_client()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=kwargs.get("temperature", 0.7),
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error("OpenAI API call failed: %s", str(e))
            raise AIConfigurationError(f"AI Provider error: {str(e)}")

    def generate_json(
        self, prompt: str, system_prompt: Optional[str] = None, **kwargs: Any
    ) -> Dict[str, Any]:
        raw_text = self.generate_text(prompt, system_prompt=system_prompt, **kwargs)
        try:
            return json.loads(raw_text)
        except json.JSONDecodeError:
            # Fallback if markdown fenced json
            cleaned = raw_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())

    def generate_embedding(self, text: str, **kwargs: Any) -> List[float]:
        client = self._get_client()
        try:
            response = client.embeddings.create(
                model=self.embedding_model,
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error("OpenAI Embedding call failed: %s", str(e))
            raise AIConfigurationError(f"Embedding Provider error: {str(e)}")

    def generate_embeddings(
        self, texts: List[str], **kwargs: Any
    ) -> List[List[float]]:
        if not texts:
            return []
        client = self._get_client()
        try:
            response = client.embeddings.create(
                model=self.embedding_model,
                input=texts,
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.error("OpenAI Batch Embedding call failed: %s", str(e))
            raise AIConfigurationError(f"Batch Embedding Provider error: {str(e)}")
