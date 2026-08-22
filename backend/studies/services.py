import logging

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from studies.models import StudySession

logger = logging.getLogger(__name__)


def calculate_duration_seconds(started_at, ended_at):
    """Calculate integer duration in seconds ensuring valid non-negative order."""
    if ended_at < started_at:
        raise ValidationError({"ended_at": "ended_at cannot be earlier than started_at."})
    return int((ended_at - started_at).total_seconds())


def list_study_sessions(*, user, goal_id=None, task_id=None, date=None):
    """List study sessions owned by the user with optional filters."""
    queryset = StudySession.objects.filter(user=user).select_related("goal", "task", "user")
    if goal_id:
        queryset = queryset.filter(goal_id=goal_id)
    if task_id:
        queryset = queryset.filter(task_id=task_id)
    if date:
        queryset = queryset.filter(started_at__date=date)
    return queryset


def create_study_session(*, user, goal, task=None, started_at, ended_at, notes=""):
    """Create study session validating relationships and computing duration on the server."""
    if goal.user_id != user.id:
        raise PermissionDenied("Cannot create study session for a goal owned by another user.")

    if task is not None:
        if task.user_id != user.id:
            raise PermissionDenied("Cannot attach a task owned by another user.")
        if task.goal_id != goal.id:
            raise ValidationError({"task": "Task does not belong to the selected goal."})

    duration_seconds = calculate_duration_seconds(started_at, ended_at)

    with transaction.atomic():
        session = StudySession.objects.create(
            user=user,
            goal=goal,
            task=task,
            started_at=started_at,
            ended_at=ended_at,
            duration_seconds=duration_seconds,
            notes=notes or "",
        )
        logger.info(
            "Study session created id=%s user_id=%s duration=%ss",
            session.pk,
            user.pk,
            duration_seconds,
        )
        return session


def get_study_session_by_id(*, user, session_id):
    """Retrieve single study session ensuring user ownership."""
    return get_object_or_404(
        StudySession.objects.select_related("goal", "task", "user"),
        pk=session_id,
        user=user,
    )


def update_study_session(*, session, validated_data):
    """Update study session fields and recalculate duration if timestamps change."""
    new_goal = validated_data.get("goal", session.goal)
    new_task = validated_data.get("task", session.task if "task" not in validated_data else None)

    if new_goal.user_id != session.user_id:
        raise PermissionDenied("Cannot assign study session to a goal owned by another user.")

    if new_task is not None:
        if new_task.user_id != session.user_id:
            raise PermissionDenied("Cannot attach a task owned by another user.")
        if new_task.goal_id != new_goal.id:
            raise ValidationError({"task": "Task does not belong to the selected goal."})

    started_at = validated_data.get("started_at", session.started_at)
    ended_at = validated_data.get("ended_at", session.ended_at)
    duration_seconds = calculate_duration_seconds(started_at, ended_at)

    for field, value in validated_data.items():
        setattr(session, field, value)

    session.duration_seconds = duration_seconds
    update_fields = set(validated_data.keys()) | {"duration_seconds"}
    session.save(update_fields=list(update_fields))
    logger.info("Study session updated id=%s", session.pk)
    return session


def delete_study_session(*, session):
    """Delete a study session."""
    session_id = session.pk
    session.delete()
    logger.info("Study session deleted id=%s", session_id)
