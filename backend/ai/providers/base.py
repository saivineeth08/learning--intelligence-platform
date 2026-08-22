from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseLLMProvider(ABC):
    """Abstract base class for Large Language Model text generation providers."""

    @abstractmethod
    def generate_text(
        self, prompt: str, system_prompt: Optional[str] = None, **kwargs: Any
    ) -> str:
        """Generate a raw text completion from the model."""
        pass

    @abstractmethod
    def generate_json(
        self, prompt: str, system_prompt: Optional[str] = None, **kwargs: Any
    ) -> Dict[str, Any]:
        """Generate a structured JSON object response from the model."""
        pass


class BaseEmbeddingProvider(ABC):
    """Abstract base class for text vector embedding providers."""

    @abstractmethod
    def generate_embedding(self, text: str, **kwargs: Any) -> List[float]:
        """Generate a dense vector embedding for a single text string."""
        pass

    @abstractmethod
    def generate_embeddings(
        self, texts: List[str], **kwargs: Any
    ) -> List[List[float]]:
        """Generate dense vector embeddings for a batch of text strings."""
        pass
