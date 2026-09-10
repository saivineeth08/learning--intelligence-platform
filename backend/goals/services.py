import logging

from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404

from goals.models import Goal

logger = logging.getLogger(__name__)


def list_goals(*, user, status=None, priority=None, category=None):
    """List goals owned by the specified user with optional filtering."""
    queryset = Goal.objects.filter(user=user)
    if status:
        queryset = queryset.filter(status=status)
    if priority:
        queryset = queryset.filter(priority=priority)
    if category:
        queryset = queryset.filter(category__iexact=category)
    return queryset


def create_goal(*, user, **validated_data):
    """Create a new goal belonging to the authenticated user."""
    with transaction.atomic():
        goal = Goal.objects.create(user=user, **validated_data)
        logger.info("Goal created id=%s for user_id=%s", goal.pk, user.pk)
        return goal


def get_goal_by_id(*, user, goal_id):
    """Retrieve a single goal ensuring ownership."""
    return get_object_or_404(Goal, pk=goal_id, user=user)


def update_goal(*, goal, validated_data):
    """Update goal fields safely with date validation against child tasks."""
    if "target_date" in validated_data and validated_data["target_date"] is not None:
        new_target = validated_data["target_date"]
        violating_task = goal.tasks.filter(due_date__gt=new_target).first()
        if violating_task:
            raise ValidationError(
                {
                    "target_date": (
                        f"Goal target date ({new_target}) cannot be earlier than existing task '{violating_task.title}' due date ({violating_task.due_date})."
                    )
                }
            )

    for field, value in validated_data.items():
        setattr(goal, field, value)
    goal.save(update_fields=[*validated_data.keys(), "updated_at"])
    logger.info("Goal updated id=%s", goal.pk)
    return goal


def delete_goal(*, goal):
    """Delete a goal and let cascade handle related entities."""
    goal_id = goal.pk
    goal.delete()
    logger.info("Goal deleted id=%s", goal_id)
