from django.conf import settings
from django.db import models


class StudySession(models.Model):
    """Represents actual learning time tracked by a user, optionally tied to a task."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="study_sessions",
    )
    goal = models.ForeignKey(
        "goals.Goal",
        on_delete=models.CASCADE,
        related_name="study_sessions",
    )
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="study_sessions",
    )
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField()
    duration_seconds = models.PositiveIntegerField()
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"StudySession({self.user.username} - {self.goal.title}: {self.duration_seconds}s)"
