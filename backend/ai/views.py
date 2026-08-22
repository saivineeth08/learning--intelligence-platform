from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.serializers import (
    AIChatMessageSerializer,
    AIChatSessionSerializer,
    CreateChatSessionSerializer,
    GenerateQuizSerializer,
    QuizSerializer,
    SendChatMessageSerializer,
)
from ai.services import (
    create_chat_session,
    generate_quiz,
    get_chat_session,
    get_quiz,
    list_chat_sessions,
    list_quizzes,
    send_chat_message,
)


class ChatSessionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = list_chat_sessions(request.user)
        serializer = AIChatSessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CreateChatSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = create_chat_session(
            user=request.user,
            resource_id=serializer.validated_data.get("resource_id"),
            title=serializer.validated_data.get("title"),
        )
        return Response(AIChatSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class ChatSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        session = get_chat_session(user=request.user, session_id=pk)
        return Response(AIChatSessionSerializer(session).data, status=status.HTTP_200_OK)


class ChatMessageCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = SendChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ai_message = send_chat_message(
            user=request.user,
            session_id=pk,
            message_text=serializer.validated_data["message"],
        )
        return Response(AIChatMessageSerializer(ai_message).data, status=status.HTTP_201_CREATED)


class QuizListGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        quizzes = list_quizzes(request.user)
        serializer = QuizSerializer(quizzes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = GenerateQuizSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quiz = generate_quiz(
            user=request.user,
            resource_id=serializer.validated_data.get("resource_id"),
            goal_id=serializer.validated_data.get("goal_id"),
            title=serializer.validated_data.get("title"),
            question_count=serializer.validated_data.get("question_count", 5),
            difficulty=serializer.validated_data.get("difficulty", "MEDIUM"),
        )
        return Response(QuizSerializer(quiz).data, status=status.HTTP_201_CREATED)


class QuizDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        quiz = get_quiz(user=request.user, quiz_id=pk)
        return Response(QuizSerializer(quiz).data, status=status.HTTP_200_OK)
