from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
from goals.serializers import GoalSerializer
from goals.services import (
    create_goal,
    delete_goal,
    get_goal_by_id,
    list_goals,
    update_goal,
)


class GoalListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        status_filter = request.query_params.get("status")
        priority_filter = request.query_params.get("priority")
        category_filter = request.query_params.get("category")

        goals = list_goals(
            user=request.user,
            status=status_filter,
            priority=priority_filter,
            category=category_filter,
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(goals, request)
        if page is not None:
            serializer = GoalSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = GoalSerializer(goals, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = GoalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        goal = create_goal(user=request.user, **serializer.validated_data)
        return Response(GoalSerializer(goal).data, status=status.HTTP_201_CREATED)


class GoalDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        goal = get_goal_by_id(user=request.user, goal_id=pk)
        return Response(GoalSerializer(goal).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        goal = get_goal_by_id(user=request.user, goal_id=pk)
        serializer = GoalSerializer(goal, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_goal = update_goal(
            goal=goal, validated_data=serializer.validated_data
        )
        return Response(GoalSerializer(updated_goal).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        goal = get_goal_by_id(user=request.user, goal_id=pk)
        delete_goal(goal=goal)
        return Response(status=status.HTTP_204_NO_CONTENT)
