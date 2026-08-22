from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from resources.serializers import ResourceSerializer
from resources.services import (
    create_resource,
    delete_resource,
    get_resource_by_id,
    list_resources,
    update_resource,
)


class ResourceListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        search = request.query_params.get("search")
        resource_type = request.query_params.get("type")
        goal_id = request.query_params.get("goal")
        task_id = request.query_params.get("task")

        resources = list_resources(
            user=request.user,
            search=search,
            resource_type=resource_type,
            goal_id=goal_id,
            task_id=task_id,
        )
        serializer = ResourceSerializer(
            resources, many=True, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ResourceSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        resource = create_resource(
            user=request.user, **serializer.validated_data
        )
        return Response(
            ResourceSerializer(resource, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ResourceDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        resource = get_resource_by_id(user=request.user, resource_id=pk)
        return Response(
            ResourceSerializer(resource, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        resource = get_resource_by_id(user=request.user, resource_id=pk)
        serializer = ResourceSerializer(
            resource, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        updated = update_resource(
            resource=resource, validated_data=serializer.validated_data
        )
        return Response(
            ResourceSerializer(updated, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        resource = get_resource_by_id(user=request.user, resource_id=pk)
        delete_resource(resource=resource)
        return Response(status=status.HTTP_204_NO_CONTENT)
