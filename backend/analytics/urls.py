from django.urls import path

from analytics.views import (
    DashboardAnalyticsView,
    GoalAnalyticsView,
    StudyTimeAnalyticsView,
    TaskAnalyticsView,
)

urlpatterns = [
    path("dashboard/", DashboardAnalyticsView.as_view(), name="analytics-dashboard"),
    path("study-time/", StudyTimeAnalyticsView.as_view(), name="analytics-study-time"),
    path("goals/", GoalAnalyticsView.as_view(), name="analytics-goals"),
    path("tasks/", TaskAnalyticsView.as_view(), name="analytics-tasks"),
]
