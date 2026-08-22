from django.conf import settings
from django.db import models

from goals.models import Goal
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
    embedding = models.JSONField(null=True, blank=True)
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


class AIChatSession(models.Model):
    """Represents a dedicated conversation session grounded in user resources."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_sessions",
    )
    resource = models.ForeignKey(
        Resource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_sessions",
    )
    title = models.CharField(max_length=255, default="New Chat Session")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"Chat Session: {self.title} (User {self.user_id})"


class AIChatMessage(models.Model):
    """Represents an individual message turn within an AI chat session."""

    class SenderChoices(models.TextChoices):
        USER = "USER", "User"
        AI = "AI", "AI"

    session = models.ForeignKey(
        AIChatSession,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.CharField(max_length=10, choices=SenderChoices.choices)
    message = models.TextField()
    sources = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["session", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.sender}] {self.message[:40]}"


class Quiz(models.Model):
    """Represents an AI-generated assessment quiz for learning verification."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quizzes",
    )
    goal = models.ForeignKey(
        Goal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quizzes",
    )
    resource = models.ForeignKey(
        Resource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quizzes",
    )
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"Quiz: {self.title} (User {self.user_id})"


class QuizQuestion(models.Model):
    """Represents a multiple-choice question within an AI-generated quiz."""

    class DifficultyChoices(models.TextChoices):
        EASY = "EASY", "Easy"
        MEDIUM = "MEDIUM", "Medium"
        HARD = "HARD", "Hard"

    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    question = models.TextField()
    options = models.JSONField(default=list)
    correct_answer = models.CharField(max_length=255)
    explanation = models.TextField(blank=True, default="")
    difficulty = models.CharField(
        max_length=10,
        choices=DifficultyChoices.choices,
        default=DifficultyChoices.MEDIUM,
    )

    class Meta:
        ordering = ["id"]
        indexes = [
            models.Index(fields=["quiz"]),
        ]

    def __str__(self):
        return f"Question for Quiz {self.quiz_id}: {self.question[:50]}"
