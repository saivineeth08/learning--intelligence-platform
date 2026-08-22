import os
from django.conf import settings
from django.db import models


class ResourceType(models.TextChoices):
    FILE = "FILE", "File"
    LINK = "LINK", "Link"


def resource_upload_path(instance, filename):
    """Store resource files in a user-isolated directory: resources/<user_id>/<filename>."""
    return os.path.join("resources", str(instance.user_id), filename)


class Resource(models.Model):
    """Represents a learning material, which can be an uploaded file or external link."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resources",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    resource_type = models.CharField(
        max_length=10,
        choices=ResourceType.choices,
    )
    file = models.FileField(
        upload_to=resource_upload_path,
        null=True,
        blank=True,
    )
    url = models.URLField(
        max_length=500,
        blank=True,
        default="",
    )
    goal = models.ForeignKey(
        "goals.Goal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resources",
    )
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resources",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"], name="resource_user_created_idx"),
            models.Index(fields=["user", "goal"], name="resource_user_goal_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.resource_type})"

    @property
    def file_name(self):
        if self.file:
            return os.path.basename(self.file.name)
        return ""
