from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", include("core.urls")),
    path("api/auth/", include("users.urls")),
    path("api/goals/", include("goals.urls")),
    path("api/tasks/", include("tasks.urls")),
    path("api/studies/", include("studies.urls")),
]

