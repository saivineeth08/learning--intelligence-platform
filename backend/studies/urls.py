from django.urls import path

from studies.views import StudySessionDetailView, StudySessionListCreateView

urlpatterns = [
    path("", StudySessionListCreateView.as_view(), name="study-list-create"),
    path("<int:pk>/", StudySessionDetailView.as_view(), name="study-detail"),
]
