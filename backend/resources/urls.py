from django.urls import path

from resources.views import (
    ResourceDetailView,
    ResourceDownloadFileView,
    ResourceListCreateView,
    ResourceViewFileView,
)

urlpatterns = [
    path("", ResourceListCreateView.as_view(), name="resource-list-create"),
    path("<int:pk>/", ResourceDetailView.as_view(), name="resource-detail"),
    path("<int:pk>/view/", ResourceViewFileView.as_view(), name="resource-file-view"),
    path(
        "<int:pk>/download/",
        ResourceDownloadFileView.as_view(),
        name="resource-file-download",
    ),
]

