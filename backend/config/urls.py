from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", include("core.urls")),
    path("api/auth/", include("users.urls")),
    path("api/goals/", include("goals.urls")),
    path("api/tasks/", include("tasks.urls")),
    path("api/studies/", include("studies.urls")),
    path("api/resources/", include("resources.urls")),
    path("api/notes/", include("notes.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/ai/", include("ai.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


