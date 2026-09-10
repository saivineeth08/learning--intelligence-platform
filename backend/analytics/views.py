from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.calendar_service import get_calendar_events
from analytics.services import (
    get_dashboard_summary,
    get_goal_analytics,
    get_study_time_analytics,
    get_task_analytics,
)


class DashboardAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_dashboard_summary(request.user)
        return Response(data, status=status.HTTP_200_OK)


class StudyTimeAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days_param = request.query_params.get("days", 7)
        data = get_study_time_analytics(request.user, days=days_param)
        return Response(data, status=status.HTTP_200_OK)


class GoalAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_goal_analytics(request.user)
        return Response(data, status=status.HTTP_200_OK)


class TaskAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_task_analytics(request.user)
        return Response(data, status=status.HTTP_200_OK)


class CalendarEventsView(APIView):
    """Serve calendar events derived from goals, tasks, study sessions, and notes."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        year = request.query_params.get("year")
        month = request.query_params.get("month")

        year_int = int(year) if year and year.isdigit() else None
        month_int = int(month) if month and month.isdigit() else None

        data = get_calendar_events(
            user=request.user,
            start_date_str=start_date,
            end_date_str=end_date,
            year=year_int,
            month=month_int,
        )
        return Response(data, status=status.HTTP_200_OK)
