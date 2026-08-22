from datetime import timedelta
import logging

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from goals.models import Goal, GoalStatus
from notes.models import Note
from resources.models import Resource
from studies.models import StudySession
from tasks.models import Task, TaskPriority, TaskStatus

logger = logging.getLogger(__name__)


def calculate_study_streak(user):
    """Calculate the consecutive number of active days with logged study sessions.
    
    A streak is active if the latest study day was today or yesterday.
    Multiple sessions on the same calendar day count as 1 day towards the streak.
    """
    study_dates = (
        StudySession.objects.filter(user=user, duration_seconds__gt=0)
        .annotate(study_date=TruncDate("started_at"))
        .values_list("study_date", flat=True)
        .distinct()
        .order_by("-study_date")
    )

    if not study_dates:
        return 0

    today = timezone.localdate()
    yesterday = today - timedelta(days=1)

    most_recent = study_dates[0]
    if most_recent < yesterday:
        return 0

    streak = 1
    expected_prev = most_recent - timedelta(days=1)

    for study_date in study_dates[1:]:
        if study_date == expected_prev:
            streak += 1
            expected_prev = study_date - timedelta(days=1)
        else:
            break

    return streak


def get_dashboard_summary(user):
    """Aggregate high-level learning summary metrics for the dashboard."""
    today = timezone.localdate()
    start_of_week = today - timedelta(days=6)
    start_of_month = today - timedelta(days=29)

    sessions_qs = StudySession.objects.filter(user=user)

    today_study_seconds = (
        sessions_qs.filter(started_at__date=today).aggregate(t=Sum("duration_seconds"))["t"]
        or 0
    )
    weekly_study_seconds = (
        sessions_qs.filter(
            started_at__date__gte=start_of_week, started_at__date__lte=today
        ).aggregate(t=Sum("duration_seconds"))["t"]
        or 0
    )
    monthly_study_seconds = (
        sessions_qs.filter(
            started_at__date__gte=start_of_month, started_at__date__lte=today
        ).aggregate(t=Sum("duration_seconds"))["t"]
        or 0
    )
    total_study_seconds = sessions_qs.aggregate(t=Sum("duration_seconds"))["t"] or 0

    goals_qs = Goal.objects.filter(user=user)
    active_goals_count = goals_qs.filter(status=GoalStatus.ACTIVE).count()
    completed_goals_count = goals_qs.filter(status=GoalStatus.COMPLETED).count()
    total_goals_count = goals_qs.count()

    tasks_qs = Task.objects.filter(user=user)
    total_tasks_count = tasks_qs.count()
    pending_tasks_count = tasks_qs.filter(
        status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS]
    ).count()
    completed_tasks_count = tasks_qs.filter(status=TaskStatus.COMPLETED).count()
    overdue_tasks_count = tasks_qs.filter(
        due_date__lt=today, status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS]
    ).count()

    streak = calculate_study_streak(user)

    # Recent study sessions
    recent_sessions = [
        {
            "id": s.id,
            "goal_id": s.goal_id,
            "goal_title": s.goal.title if s.goal else "",
            "task_id": s.task_id,
            "task_title": s.task.title if s.task else "",
            "started_at": s.started_at,
            "ended_at": s.ended_at,
            "duration_seconds": s.duration_seconds,
            "notes": s.notes,
        }
        for s in sessions_qs.select_related("goal", "task").order_by("-started_at")[:5]
    ]

    # Recent notes
    recent_notes = [
        {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "goal_id": n.goal_id,
            "goal_title": n.goal.title if n.goal else "",
            "task_id": n.task_id,
            "task_title": n.task.title if n.task else "",
            "resource_id": n.resource_id,
            "resource_title": n.resource.title if n.resource else "",
            "created_at": n.created_at,
        }
        for n in Note.objects.filter(user=user)
        .select_related("goal", "task", "resource")
        .order_by("-created_at")[:5]
    ]

    # Recent resources
    recent_resources = [
        {
            "id": r.id,
            "title": r.title,
            "resource_type": r.resource_type,
            "file_name": r.file_name,
            "file_url": r.file.url if r.file else None,
            "url": r.url,
            "goal_id": r.goal_id,
            "goal_title": r.goal.title if r.goal else "",
            "task_id": r.task_id,
            "task_title": r.task.title if r.task else "",
            "created_at": r.created_at,
        }
        for r in Resource.objects.filter(user=user)
        .select_related("goal", "task")
        .order_by("-created_at")[:5]
    ]

    return {
        "today_study_seconds": today_study_seconds,
        "weekly_study_seconds": weekly_study_seconds,
        "monthly_study_seconds": monthly_study_seconds,
        "total_study_seconds": total_study_seconds,
        "active_goals_count": active_goals_count,
        "completed_goals_count": completed_goals_count,
        "total_goals_count": total_goals_count,
        "pending_tasks_count": pending_tasks_count,
        "completed_tasks_count": completed_tasks_count,
        "overdue_tasks_count": overdue_tasks_count,
        "total_tasks_count": total_tasks_count,
        "current_streak": streak,
        "recent_study_sessions": recent_sessions,
        "recent_notes": recent_notes,
        "recent_resources": recent_resources,
    }


def get_study_time_analytics(user, days=7):
    """Retrieve daily study time breakdown for a continuous date window."""
    try:
        days = int(days)
    except (ValueError, TypeError):
        raise ValidationError({"days": "Days must be a valid integer."})

    if days < 1 or days > 365:
        raise ValidationError({"days": "Days must be between 1 and 365."})

    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)

    daily_aggregates = (
        StudySession.objects.filter(
            user=user,
            started_at__date__gte=start_date,
            started_at__date__lte=today,
        )
        .annotate(day=TruncDate("started_at"))
        .values("day")
        .annotate(total=Sum("duration_seconds"))
        .order_by("day")
    )

    day_map = {item["day"]: item["total"] for item in daily_aggregates}

    daily_breakdown = []
    total_window_seconds = 0

    for i in range(days):
        current_day = start_date + timedelta(days=i)
        duration = day_map.get(current_day, 0)
        total_window_seconds += duration
        daily_breakdown.append(
            {
                "date": current_day.isoformat(),
                "duration_seconds": duration,
            }
        )

    return {
        "days": days,
        "total_seconds": total_window_seconds,
        "daily_breakdown": daily_breakdown,
    }


def get_goal_analytics(user):
    """Retrieve detailed progress and study investment metrics for all user goals."""
    goals = Goal.objects.filter(user=user).prefetch_related("tasks", "study_sessions").order_by("-created_at")

    goal_stats = []
    for g in goals:
        tasks = list(g.tasks.all())
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
        completion_percentage = (
            round((completed_tasks / total_tasks) * 100, 1) if total_tasks > 0 else 0.0
        )
        total_study_seconds = sum(s.duration_seconds for s in g.study_sessions.all())

        goal_stats.append(
            {
                "id": g.id,
                "title": g.title,
                "category": g.category,
                "status": g.status,
                "priority": g.priority,
                "target_date": g.target_date,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "completion_percentage": completion_percentage,
                "total_study_seconds": total_study_seconds,
            }
        )

    return goal_stats


def get_task_analytics(user):
    """Retrieve task status distribution, priority distribution, and velocity metrics."""
    today = timezone.localdate()
    tasks = list(Task.objects.filter(user=user))

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
    pending_tasks = sum(
        1 for t in tasks if t.status in (TaskStatus.TODO, TaskStatus.IN_PROGRESS)
    )
    overdue_tasks = sum(
        1
        for t in tasks
        if t.due_date and t.due_date < today and t.status in (TaskStatus.TODO, TaskStatus.IN_PROGRESS)
    )

    status_distribution = {
        status_choice.value: sum(1 for t in tasks if t.status == status_choice.value)
        for status_choice in TaskStatus
    }

    priority_distribution = {
        priority_choice.value: sum(1 for t in tasks if t.priority == priority_choice.value)
        for priority_choice in TaskPriority
    }

    completion_rate = (
        round((completed_tasks / total_tasks) * 100, 1) if total_tasks > 0 else 0.0
    )

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "overdue_tasks": overdue_tasks,
        "completion_rate": completion_rate,
        "status_distribution": status_distribution,
        "priority_distribution": priority_distribution,
    }
