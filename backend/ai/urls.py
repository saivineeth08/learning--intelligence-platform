from django.urls import path

from ai.views import (
    ChatMessageCreateView,
    ChatSessionDetailView,
    ChatSessionListCreateView,
    DocumentIndexView,
    DocumentStatusView,
    QuizDetailView,
    QuizListGenerateView,
)

urlpatterns = [
    # Document Ingestion & Status
    path("documents/index/", DocumentIndexView.as_view(), name="document-index"),
    path("documents/<int:pk>/status/", DocumentStatusView.as_view(), name="document-status"),

    # AI Document Chat
    path("chat/sessions/", ChatSessionListCreateView.as_view(), name="chat-session-list-create"),
    path("chat/sessions/<int:pk>/", ChatSessionDetailView.as_view(), name="chat-session-detail"),
    path("chat/sessions/<int:pk>/messages/", ChatMessageCreateView.as_view(), name="chat-message-create"),

    # AI Quizzes
    path("quizzes/", QuizListGenerateView.as_view(), name="quiz-list"),
    path("quizzes/generate/", QuizListGenerateView.as_view(), name="quiz-generate"),
    path("quizzes/<int:pk>/", QuizDetailView.as_view(), name="quiz-detail"),
]

