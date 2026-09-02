from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from tasks.serializers import TaskSerializer
from tasks.services import (
    create_task,
    delete_task,
    get_task_by_id,
    list_tasks,
    update_task,
)


class TaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        goal_filter = request.query_params.get("goal")
        status_filter = request.query_params.get("status")
        priority_filter = request.query_params.get("priority")
        due_date_filter = request.query_params.get("due_date")

        tasks = list_tasks(
            user=request.user,
            goal_id=goal_filter,
            status=status_filter,
            priority=priority_filter,
            due_date=due_date_filter,
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(tasks, request)
        if page is not None:
            serializer = TaskSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = TaskSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        task = create_task(user=request.user, **serializer.validated_data)
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)


class TaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        task = get_task_by_id(user=request.user, task_id=pk)
        return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        task = get_task_by_id(user=request.user, task_id=pk)
        serializer = TaskSerializer(
            task, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        updated_task = update_task(
            task=task, validated_data=serializer.validated_data
        )
        return Response(TaskSerializer(updated_task).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        task = get_task_by_id(user=request.user, task_id=pk)
        delete_task(task=task)
        return Response(status=status.HTTP_204_NO_CONTENT)
