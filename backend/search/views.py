import logging

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from goals.models import Goal
from notes.models import Note
from resources.models import Resource
from tasks.models import Task

logger = logging.getLogger(__name__)


def _search_goals(user, query):
    qs = Goal.objects.filter(
        user=user,
        status__in=["ACTIVE", "COMPLETED"],
    ).filter(
        Q(title__icontains=query) | Q(description__icontains=query) | Q(category__icontains=query)
    )
    return [
        {
            "type": "goal",
            "id": g.id,
            "title": g.title,
            "description": g.description,
            "meta": {"status": g.status, "priority": g.priority},
            "url": f"/goals/{g.id}",
        }
        for g in qs[:10]
    ]


def _search_tasks(user, query):
    qs = Task.objects.filter(user=user).filter(
        Q(title__icontains=query) | Q(description__icontains=query)
    )
    return [
        {
            "type": "task",
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "meta": {"status": t.status, "priority": t.priority},
            "url": f"/tasks",
        }
        for t in qs[:10]
    ]


def _search_resources(user, query):
    qs = Resource.objects.filter(user=user).filter(
        Q(title__icontains=query) | Q(description__icontains=query)
    )
    return [
        {
            "type": "resource",
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "meta": {"resource_type": r.resource_type},
            "url": f"/resources",
        }
        for r in qs[:10]
    ]


def _search_notes(user, query):
    qs = Note.objects.filter(user=user).filter(
        Q(title__icontains=query) | Q(content__icontains=query)
    )
    return [
        {
            "type": "note",
            "id": n.id,
            "title": n.title,
            "description": n.content[:200],
            "meta": {},
            "url": f"/notes",
        }
        for n in qs[:10]
    ]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search(request):
    """
    Full-text search across goals, tasks, resources, and notes owned by the user.

    Query parameters:
      q    — search term (required, min 2 chars)
      type — comma-separated filter: goal,task,resource,note (optional; all by default)
    """
    query = request.query_params.get("q", "").strip()
    if len(query) < 2:
        return Response(
            {"error": "Query must be at least 2 characters.", "results": []}, status=400
        )

    type_filter = request.query_params.get("type", "")
    allowed_types = {"goal", "task", "resource", "note"}
    if type_filter:
        requested = {t.strip().lower() for t in type_filter.split(",") if t.strip()}
        active_types = requested & allowed_types
    else:
        active_types = allowed_types

    results = []
    user = request.user

    if "goal" in active_types:
        results.extend(_search_goals(user, query))
    if "task" in active_types:
        results.extend(_search_tasks(user, query))
    if "resource" in active_types:
        results.extend(_search_resources(user, query))
    if "note" in active_types:
        results.extend(_search_notes(user, query))

    logger.debug("Search '%s' by user %s returned %d results", query, user.id, len(results))

    return Response(
        {
            "query": query,
            "count": len(results),
            "results": results,
        }
    )
