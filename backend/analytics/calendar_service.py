import datetime
import logging
from collections import defaultdict
from typing import Any, Dict, Optional

from django.db.models import Q
from django.utils import timezone

from goals.models import Goal
from notes.models import Note
from studies.models import StudySession
from tasks.models import Task

logger = logging.getLogger(__name__)


def get_calendar_events(
    user: Any,
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> Dict[str, Any]:
    """Derive and aggregate user's goals, tasks, study sessions, and notes into calendar day events."""
    today = timezone.localdate()

    # Determine date range
    if start_date_str and end_date_str:
        try:
            start_date = datetime.date.fromisoformat(start_date_str)
            end_date = datetime.date.fromisoformat(end_date_str)
        except (ValueError, TypeError):
            start_date = today.replace(day=1)
            next_month = (start_date.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
            end_date = next_month - datetime.timedelta(days=1)
    elif year and month:
        start_date = datetime.date(year, month, 1)
        next_month = (start_date.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
        end_date = next_month - datetime.timedelta(days=1)
    else:
        start_date = today.replace(day=1)
        next_month = (start_date.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
        end_date = next_month - datetime.timedelta(days=1)

    # 1. Fetch Goals with target_date in range (isolated to user)
    goals = Goal.objects.filter(
        user=user,
        target_date__gte=start_date,
        target_date__lte=end_date,
    )

    # 2. Fetch Tasks with due_date or completed_at in range (isolated to user)
    tasks = (
        Task.objects.filter(user=user)
        .filter(
            Q(due_date__gte=start_date, due_date__lte=end_date)
            | Q(completed_at__date__gte=start_date, completed_at__date__lte=end_date)
        )
        .select_related("goal")
    )

    # 3. Fetch StudySessions in range (isolated to user)
    studies = (
        StudySession.objects.filter(
            user=user,
            started_at__date__gte=start_date,
            started_at__date__lte=end_date,
        )
        .select_related("goal", "task")
    )

    # 4. Fetch Notes in range (isolated to user)
    notes = (
        Note.objects.filter(
            user=user,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
        )
        .select_related("goal", "task")
    )

    # Group events by ISO date string YYYY-MM-DD
    events_by_date = defaultdict(lambda: {"goals": [], "tasks": [], "studies": [], "notes": []})

    for g in goals:
        d_str = g.target_date.isoformat()
        events_by_date[d_str]["goals"].append({
            "id": g.id,
            "title": g.title,
            "status": g.status,
            "priority": g.priority,
            "category": g.category,
            "target_date": d_str,
            "type": "GOAL_DEADLINE",
        })

    for t in tasks:
        if t.due_date and start_date <= t.due_date <= end_date:
            d_str = t.due_date.isoformat()
            events_by_date[d_str]["tasks"].append({
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "goal_id": t.goal_id,
                "goal_title": t.goal.title if t.goal else "",
                "due_date": d_str,
                "is_completed": t.status == "COMPLETED",
                "type": "TASK_DUE",
            })
        elif t.completed_at and start_date <= t.completed_at.date() <= end_date:
            d_str = t.completed_at.date().isoformat()
            events_by_date[d_str]["tasks"].append({
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "goal_id": t.goal_id,
                "goal_title": t.goal.title if t.goal else "",
                "completed_at": t.completed_at.isoformat(),
                "is_completed": True,
                "type": "TASK_COMPLETED",
            })

    for s in studies:
        d_str = s.started_at.date().isoformat()
        events_by_date[d_str]["studies"].append({
            "id": s.id,
            "goal_id": s.goal_id,
            "goal_title": s.goal.title if s.goal else "",
            "task_id": s.task_id,
            "duration_seconds": s.duration_seconds,
            "started_at": s.started_at.isoformat(),
            "ended_at": s.ended_at.isoformat(),
            "notes": s.notes,
            "type": "STUDY_SESSION",
        })

    for n in notes:
        d_str = n.created_at.date().isoformat()
        events_by_date[d_str]["notes"].append({
            "id": n.id,
            "title": n.title,
            "goal_id": n.goal_id,
            "goal_title": n.goal.title if n.goal else "",
            "created_at": n.created_at.isoformat(),
            "type": "NOTE",
        })

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "events_by_date": dict(events_by_date),
        "total_days_with_activity": len(events_by_date),
    }
