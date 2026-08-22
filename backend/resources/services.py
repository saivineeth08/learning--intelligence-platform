import logging
import os

from django.core.exceptions import PermissionDenied
from django.db import models, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from resources.models import Resource, ResourceType

logger = logging.getLogger(__name__)


def list_resources(*, user, search=None, resource_type=None, goal_id=None, task_id=None):
    """List resources owned by the user with optional search and filters."""
    queryset = Resource.objects.filter(user=user).select_related("goal", "task", "user")

    if search:
        search_trimmed = search.strip()
        if search_trimmed:
            queryset = queryset.filter(
                Q(title__icontains=search_trimmed) | Q(description__icontains=search_trimmed)
            )

    if resource_type:
        queryset = queryset.filter(resource_type=resource_type)

    if goal_id:
        queryset = queryset.filter(goal_id=goal_id)

    if task_id:
        queryset = queryset.filter(task_id=task_id)

    return queryset


def create_resource(*, user, title, resource_type, description="", file=None, url="", goal=None, task=None):
    """Create a new resource verifying relationships and file/url integrity."""
    if goal is not None and goal.user_id != user.id:
        raise PermissionDenied("Cannot attach a goal owned by another user.")

    if task is not None:
        if task.user_id != user.id:
            raise PermissionDenied("Cannot attach a task owned by another user.")
        if goal is not None and task.goal_id != goal.id:
            raise ValidationError({"task": "Task does not belong to the selected goal."})

    with transaction.atomic():
        resource = Resource.objects.create(
            user=user,
            title=title,
            description=description or "",
            resource_type=resource_type,
            file=file,
            url=url or "",
            goal=goal,
            task=task,
        )
        logger.info(
            "Resource created id=%s type=%s user_id=%s",
            resource.pk,
            resource_type,
            user.pk,
        )
        return resource


def get_resource_by_id(*, user, resource_id):
    """Retrieve single resource ensuring ownership."""
    return get_object_or_404(
        Resource.objects.select_related("goal", "task", "user"),
        pk=resource_id,
        user=user,
    )


def update_resource(*, resource, validated_data):
    """Update resource fields with file cleanup if replacing old file."""
    new_goal = validated_data.get("goal", resource.goal)
    new_task = validated_data.get("task", resource.task if "task" not in validated_data else None)

    if new_goal is not None and new_goal.user_id != resource.user_id:
        raise PermissionDenied("Cannot assign a goal owned by another user.")

    if new_task is not None:
        if new_task.user_id != resource.user_id:
            raise PermissionDenied("Cannot attach a task owned by another user.")
        if new_goal is not None and new_task.goal_id != new_goal.id:
            raise ValidationError({"task": "Task does not belong to the selected goal."})

    # If new file is uploaded, remove previous file from storage
    if "file" in validated_data and validated_data["file"] and resource.file:
        old_file = resource.file
        if old_file and os.path.isfile(old_file.path):
            try:
                os.remove(old_file.path)
            except OSError as e:
                logger.warning("Failed to remove old resource file: %s", e)

    for field, value in validated_data.items():
        setattr(resource, field, value)

    update_fields = set(validated_data.keys()) | {"updated_at"}
    resource.save(update_fields=list(update_fields))
    logger.info("Resource updated id=%s", resource.pk)
    return resource


def delete_resource(*, resource):
    """Delete a resource and clean up its uploaded file."""
    resource_id = resource.pk
    file_path = resource.file.path if resource.file and hasattr(resource.file, "path") else None

    resource.delete()

    if file_path and os.path.isfile(file_path):
        try:
            os.remove(file_path)
            logger.info("Removed resource file: %s", file_path)
        except OSError as e:
            logger.warning("Failed to delete physical file for resource %s: %s", resource_id, e)

    logger.info("Resource deleted id=%s", resource_id)
