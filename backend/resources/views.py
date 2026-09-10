import mimetypes

from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsSetPagination
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
    pagination_class = StandardResultsSetPagination
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
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(resources, request)
        if page is not None:
            serializer = ResourceSerializer(
                page, many=True, context={"request": request}
            )
            return paginator.get_paginated_response(serializer.data)

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


class ResourceViewFileView(APIView):
    """Serve a resource file inline for in-browser viewing (e.g., PDF, image, text)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        resource = get_resource_by_id(user=request.user, resource_id=pk)
        if resource.resource_type != "FILE" or not resource.file:
            raise ValidationError(
                {"detail": "This resource does not contain an uploaded file."}
            )

        try:
            file_handle = resource.file.open("rb")
        except Exception:
            raise Http404("File could not be found on storage.")

        content_type, _ = mimetypes.guess_type(resource.file.name)
        if not content_type:
            content_type = "application/octet-stream"

        response = FileResponse(file_handle, content_type=content_type)
        response["Content-Disposition"] = f'inline; filename="{resource.file_name}"'
        return response


class ResourceDownloadFileView(APIView):
    """Serve a resource file as an attachment to trigger explicit download."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        resource = get_resource_by_id(user=request.user, resource_id=pk)
        if resource.resource_type != "FILE" or not resource.file:
            raise ValidationError(
                {"detail": "This resource does not contain an uploaded file."}
            )

        try:
            file_handle = resource.file.open("rb")
        except Exception:
            raise Http404("File could not be found on storage.")

        content_type, _ = mimetypes.guess_type(resource.file.name)
        if not content_type:
            content_type = "application/octet-stream"

        response = FileResponse(
            file_handle,
            content_type=content_type,
            as_attachment=True,
            filename=resource.file_name,
        )
        response["Content-Disposition"] = f'attachment; filename="{resource.file_name}"'
        return response

