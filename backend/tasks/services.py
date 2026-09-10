import logging

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from tasks.models import Task, TaskStatus

logger = logging.getLogger(__name__)


def list_tasks(*, user, goal_id=None, status=None, priority=None, due_date=None):
    """List tasks owned by user with optional filtering."""
    queryset = Task.objects.filter(user=user).select_related("goal", "user")
    if goal_id:
        queryset = queryset.filter(goal_id=goal_id)
    if status:
        queryset = queryset.filter(status=status)
    if priority:
        queryset = queryset.filter(priority=priority)
    if due_date:
        queryset = queryset.filter(due_date=due_date)
    return queryset


def create_task(*, user, goal, **validated_data):
    """Create a task for the authenticated user and their goal."""
    if goal.user_id != user.id:
        raise PermissionDenied("Cannot create task for a goal owned by another user.")

    due_date = validated_data.get("due_date")
    if due_date and goal.target_date and due_date > goal.target_date:
        raise ValidationError({"due_date": f"Task due date ({due_date}) cannot be after the goal target date ({goal.target_date})."})

    status_val = validated_data.get("status", TaskStatus.TODO)
    completed_at = timezone.now() if status_val == TaskStatus.COMPLETED else None

    with transaction.atomic():
        task = Task.objects.create(
            user=user,
            goal=goal,
            completed_at=completed_at,
            **validated_data,
        )
        logger.info("Task created id=%s for user_id=%s under goal_id=%s", task.pk, user.pk, goal.pk)
        return task


def get_task_by_id(*, user, task_id):
    """Retrieve a single task verifying user ownership."""
    return get_object_or_404(Task.objects.select_related("goal", "user"), pk=task_id, user=user)


def update_task(*, task, validated_data):
    """Update task fields and manage completed_at transitions."""
    new_goal = validated_data.get("goal", task.goal)
    if "goal" in validated_data and new_goal.user_id != task.user_id:
        raise PermissionDenied("Cannot move task to a goal owned by another user.")

    new_due_date = validated_data.get("due_date", task.due_date)
    if new_due_date and new_goal and new_goal.target_date and new_due_date > new_goal.target_date:
        raise ValidationError({"due_date": f"Task due date ({new_due_date}) cannot be after the goal target date ({new_goal.target_date})."})

    if "status" in validated_data:
        new_status = validated_data["status"]
        if new_status == TaskStatus.COMPLETED and task.status != TaskStatus.COMPLETED:
            task.completed_at = timezone.now()
        elif new_status != TaskStatus.COMPLETED and task.status == TaskStatus.COMPLETED:
            task.completed_at = None

    for field, value in validated_data.items():
        setattr(task, field, value)

    update_fields = set(validated_data.keys()) | {"completed_at", "updated_at"}
    task.save(update_fields=list(update_fields))
    logger.info("Task updated id=%s", task.pk)
    return task


def delete_task(*, task):
    """Delete a task."""
    task_id = task.pk
    task.delete()
    logger.info("Task deleted id=%s", task_id)
