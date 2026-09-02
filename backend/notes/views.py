from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from notes.serializers import NoteSerializer
from notes.services import (
    create_note,
    delete_note,
    get_note_by_id,
    list_notes,
    update_note,
)


class NoteListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        search = request.query_params.get("search")
        goal_id = request.query_params.get("goal")
        task_id = request.query_params.get("task")
        resource_id = request.query_params.get("resource")

        notes = list_notes(
            user=request.user,
            search=search,
            goal_id=goal_id,
            task_id=task_id,
            resource_id=resource_id,
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(notes, request)
        if page is not None:
            serializer = NoteSerializer(page, many=True, context={"request": request})
            return paginator.get_paginated_response(serializer.data)

        serializer = NoteSerializer(notes, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = NoteSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        note = create_note(
            user=request.user, **serializer.validated_data
        )
        return Response(
            NoteSerializer(note, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class NoteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        note = get_note_by_id(user=request.user, note_id=pk)
        return Response(
            NoteSerializer(note, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        note = get_note_by_id(user=request.user, note_id=pk)
        serializer = NoteSerializer(
            note, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        updated = update_note(
            note=note, validated_data=serializer.validated_data
        )
        return Response(
            NoteSerializer(updated, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        note = get_note_by_id(user=request.user, note_id=pk)
        delete_note(note=note)
        return Response(status=status.HTTP_204_NO_CONTENT)
