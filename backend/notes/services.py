import logging

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from notes.models import Note

logger = logging.getLogger(__name__)


def list_notes(*, user, search=None, goal_id=None, task_id=None, resource_id=None):
    """List notes owned by user with search and relational filters."""
    queryset = Note.objects.filter(user=user).select_related("goal", "task", "resource", "user")

    if search:
        search_trimmed = search.strip()
        if search_trimmed:
            queryset = queryset.filter(
                Q(title__icontains=search_trimmed) | Q(content__icontains=search_trimmed)
            )

    if goal_id:
        queryset = queryset.filter(goal_id=goal_id)

    if task_id:
        queryset = queryset.filter(task_id=task_id)

    if resource_id:
        queryset = queryset.filter(resource_id=resource_id)

    return queryset


def create_note(*, user, title, content="", goal=None, task=None, resource=None):
    """Create a note verifying ownership of all optional relations."""
    if goal is not None and goal.user_id != user.id:
        raise PermissionDenied("Cannot attach a goal owned by another user.")

    if task is not None:
        if task.user_id != user.id:
            raise PermissionDenied("Cannot attach a task owned by another user.")
        if goal is not None and task.goal_id != goal.id:
            raise ValidationError({"task": "Task does not belong to the selected goal."})

    if resource is not None and resource.user_id != user.id:
        raise PermissionDenied("Cannot attach a resource owned by another user.")

    with transaction.atomic():
        note = Note.objects.create(
            user=user,
            title=title,
            content=content or "",
            goal=goal,
            task=task,
            resource=resource,
        )
        logger.info("Note created id=%s for user_id=%s", note.pk, user.pk)
        return note


def get_note_by_id(*, user, note_id):
    """Retrieve a single note ensuring user ownership."""
    return get_object_or_404(
        Note.objects.select_related("goal", "task", "resource", "user"),
        pk=note_id,
        user=user,
    )


def update_note(*, note, validated_data):
    """Update note fields ensuring relationship security."""
    new_goal = validated_data.get("goal", note.goal)
    new_task = validated_data.get("task", note.task if "task" not in validated_data else None)
    new_resource = validated_data.get("resource", note.resource if "resource" not in validated_data else None)

    if new_goal is not None and new_goal.user_id != note.user_id:
        raise PermissionDenied("Cannot assign a goal owned by another user.")

    if new_task is not None:
        if new_task.user_id != note.user_id:
            raise PermissionDenied("Cannot attach a task owned by another user.")
        if new_goal is not None and new_task.goal_id != new_goal.id:
            raise ValidationError({"task": "Task does not belong to the selected goal."})

    if new_resource is not None and new_resource.user_id != note.user_id:
        raise PermissionDenied("Cannot attach a resource owned by another user.")

    for field, value in validated_data.items():
        setattr(note, field, value)

    update_fields = set(validated_data.keys()) | {"updated_at"}
    note.save(update_fields=list(update_fields))
    logger.info("Note updated id=%s", note.pk)
    return note


def delete_note(*, note):
    """Delete a note."""
    note_id = note.pk
    note.delete()
    logger.info("Note deleted id=%s", note_id)
