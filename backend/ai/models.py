from django.conf import settings
from django.db import models

from resources.models import Resource


class DocumentChunk(models.Model):
    """Represents a discrete text chunk extracted and partitioned from a learning resource."""

    resource = models.ForeignKey(
        Resource,
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_chunks",
    )
    chunk_index = models.PositiveIntegerField()
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["resource", "chunk_index"]
        constraints = [
            models.UniqueConstraint(
                fields=["resource", "chunk_index"],
                name="unique_resource_chunk_index",
            )
        ]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["resource", "chunk_index"]),
        ]

    def __str__(self):
        return f"Chunk {self.chunk_index} for Resource {self.resource_id} (User {self.user_id})"
