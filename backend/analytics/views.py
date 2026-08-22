from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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
