from django.urls import path

from resources.views import ResourceDetailView, ResourceListCreateView

urlpatterns = [
    path("", ResourceListCreateView.as_view(), name="resource-list-create"),
    path("<int:pk>/", ResourceDetailView.as_view(), name="resource-detail"),
]
