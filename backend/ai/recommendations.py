"""
Rule-based recommendation engine.

Generates actionable learning recommendations by analysing the user's existing
data (goals, tasks, study sessions) without requiring an LLM.

Each recommendation is a dict with:
  priority   — HIGH / MEDIUM / LOW
  type       — machine-readable category string
  title      — short headline
  message    — fuller explanation
  action_url — optional frontend path the user can navigate to
"""

import logging
from datetime import timedelta

from django.utils import timezone

from goals.models import Goal, GoalStatus
from studies.models import StudySession
from tasks.models import Task, TaskStatus

logger = logging.getLogger(__name__)

# ── tuneable thresholds ──────────────────────────────────────────────────────
OVERDUE_TASK_PRIORITY = "HIGH"
NO_STUDY_DAYS_THRESHOLD = 2          # days without any study session → warn
APPROACHING_GOAL_DAYS = 7            # days until target_date → high priority
LOW_PROGRESS_TASK_STALE_DAYS = 5     # IN_PROGRESS task unchanged for N days
WEEKLY_STUDY_GOAL_SECONDS = 5 * 3600  # 5 hours per week target


def get_recommendations(user) -> list[dict]:
    """Return a list of prioritised recommendation dicts for *user*."""
    recs = []
    now = timezone.now()
    today = now.date()

    # 1. Overdue tasks -----------------------------------------------------------
    overdue_tasks = Task.objects.filter(
        user=user,
        status__in=[TaskStatus.TODO, TaskStatus.IN_PROGRESS],
        due_date__lt=today,
    ).select_related("goal").order_by("due_date")[:5]

    for task in overdue_tasks:
        days_overdue = (today - task.due_date).days
        recs.append(
            {
                "priority": OVERDUE_TASK_PRIORITY,
                "type": "overdue_task",
                "title": f'Overdue task: "{task.title}"',
                "message": (
                    f'This task has been overdue for {days_overdue} day{"s" if days_overdue != 1 else ""}. '
                    f"Complete it or reschedule it."
                ),
                "action_url": "/tasks",
            }
        )

    # 2. No study session in the past N days ------------------------------------
    recent_cutoff = now - timedelta(days=NO_STUDY_DAYS_THRESHOLD)
    has_recent_study = StudySession.objects.filter(
        user=user, started_at__gte=recent_cutoff
    ).exists()
    if not has_recent_study:
        active_goals = Goal.objects.filter(user=user, status=GoalStatus.ACTIVE).count()
        if active_goals > 0:
            recs.append(
                {
                    "priority": "MEDIUM",
                    "type": "no_recent_study",
                    "title": "No study sessions recently",
                    "message": (
                        f"You haven't logged a study session in the past {NO_STUDY_DAYS_THRESHOLD} days. "
                        "Start a session to keep your streak alive."
                    ),
                    "action_url": "/study-sessions",
                }
            )

    # 3. Goals approaching their target date ------------------------------------
    deadline_cutoff = today + timedelta(days=APPROACHING_GOAL_DAYS)
    approaching_goals = Goal.objects.filter(
        user=user,
        status=GoalStatus.ACTIVE,
        target_date__isnull=False,
        target_date__lte=deadline_cutoff,
        target_date__gte=today,
    )
    for goal in approaching_goals:
        days_left = (goal.target_date - today).days
        recs.append(
            {
                "priority": "HIGH",
                "type": "goal_approaching_deadline",
                "title": f'Goal deadline approaching: "{goal.title}"',
                "message": (
                    f"{days_left} day{'s' if days_left != 1 else ''} remaining to reach your goal. "
                    "Review your tasks and increase study time."
                ),
                "action_url": f"/goals/{goal.id}",
            }
        )

    # 4. Stale IN_PROGRESS tasks ------------------------------------------------
    stale_cutoff = now - timedelta(days=LOW_PROGRESS_TASK_STALE_DAYS)
    stale_tasks = Task.objects.filter(
        user=user,
        status=TaskStatus.IN_PROGRESS,
        updated_at__lt=stale_cutoff,
    ).order_by("updated_at")[:3]

    for task in stale_tasks:
        recs.append(
            {
                "priority": "MEDIUM",
                "type": "stale_task",
                "title": f'Stalled task: "{task.title}"',
                "message": (
                    f"This task has been in progress for more than {LOW_PROGRESS_TASK_STALE_DAYS} days "
                    "without an update. Consider breaking it into smaller sub-tasks."
                ),
                "action_url": "/tasks",
            }
        )

    # 5. Below weekly study goal ------------------------------------------------
    week_start = now - timedelta(days=7)
    weekly_seconds = 0
    for session in StudySession.objects.filter(user=user, started_at__gte=week_start):
        weekly_seconds += session.duration_seconds

    if weekly_seconds < WEEKLY_STUDY_GOAL_SECONDS:
        hours_studied = round(weekly_seconds / 3600, 1)
        hours_target = round(WEEKLY_STUDY_GOAL_SECONDS / 3600, 1)
        recs.append(
            {
                "priority": "LOW",
                "type": "below_weekly_goal",
                "title": "Below weekly study target",
                "message": (
                    f"You've studied {hours_studied}h this week. "
                    f"Your target is {hours_target}h. Log more sessions to stay on track."
                ),
                "action_url": "/study-sessions",
            }
        )

    # 6. No active goals --------------------------------------------------------
    active_goal_count = Goal.objects.filter(user=user, status=GoalStatus.ACTIVE).count()
    if active_goal_count == 0:
        recs.append(
            {
                "priority": "MEDIUM",
                "type": "no_active_goals",
                "title": "No active learning goals",
                "message": "Create a goal to start tracking your learning progress.",
                "action_url": "/goals",
            }
        )

    logger.debug("Generated %d recommendations for user %s", len(recs), user.id)
    return recs
