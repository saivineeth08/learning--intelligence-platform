from django.urls import path

from goals.views import GoalDetailView, GoalListCreateView

urlpatterns = [
    path("", GoalListCreateView.as_view(), name="goal-list-create"),
    path("<int:pk>/", GoalDetailView.as_view(), name="goal-detail"),
]
