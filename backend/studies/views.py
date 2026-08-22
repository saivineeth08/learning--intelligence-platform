from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from studies.serializers import StudySessionSerializer
from studies.services import (
    create_study_session,
    delete_study_session,
    get_study_session_by_id,
    list_study_sessions,
    update_study_session,
)


class StudySessionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        goal_filter = request.query_params.get("goal")
        task_filter = request.query_params.get("task")
        date_filter = request.query_params.get("date")

        sessions = list_study_sessions(
            user=request.user,
            goal_id=goal_filter,
            task_id=task_filter,
            date=date_filter,
        )
        serializer = StudySessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = StudySessionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        session = create_study_session(
            user=request.user, **serializer.validated_data
        )
        return Response(
            StudySessionSerializer(session).data, status=status.HTTP_201_CREATED
        )


class StudySessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        session = get_study_session_by_id(user=request.user, session_id=pk)
        return Response(StudySessionSerializer(session).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        session = get_study_session_by_id(user=request.user, session_id=pk)
        serializer = StudySessionSerializer(
            session, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        updated = update_study_session(
            session=session, validated_data=serializer.validated_data
        )
        return Response(StudySessionSerializer(updated).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        session = get_study_session_by_id(user=request.user, session_id=pk)
        delete_study_session(session=session)
        return Response(status=status.HTTP_204_NO_CONTENT)
