import os
from rest_framework import serializers

from goals.models import Goal
from resources.models import Resource, ResourceType
from resources.validators import validate_resource_file
from tasks.models import Task


class ResourceSerializer(serializers.ModelSerializer):
    goal = serializers.PrimaryKeyRelatedField(
        queryset=Goal.objects.all(), required=False, allow_null=True
    )
    task = serializers.PrimaryKeyRelatedField(
        queryset=Task.objects.all(), required=False, allow_null=True
    )
    goal_title = serializers.CharField(source="goal.title", read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True)
    file_name = serializers.CharField(read_only=True)
    file_url = serializers.SerializerMethodField()
    is_indexed = serializers.SerializerMethodField()
    chunk_count = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = (
            "id",
            "user",
            "title",
            "description",
            "resource_type",
            "file",
            "url",
            "goal",
            "task",
            "goal_title",
            "task_title",
            "file_name",
            "file_url",
            "is_indexed",
            "chunk_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user",
            "goal_title",
            "task_title",
            "file_name",
            "file_url",
            "is_indexed",
            "chunk_count",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "title": {"required": True, "allow_blank": False},
            "description": {"required": False, "allow_blank": True},
            "url": {"required": False, "allow_blank": True},
            "file": {"required": False, "allow_null": True},
        }

    def get_is_indexed(self, obj):
        if hasattr(obj, "chunks_count"):
            return obj.chunks_count > 0
        if hasattr(obj, "chunks"):
            return obj.chunks.exists()
        return False

    def get_chunk_count(self, obj):
        if hasattr(obj, "chunks_count"):
            return obj.chunks_count
        if hasattr(obj, "chunks"):
            return obj.chunks.count()
        return 0

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def validate_title(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Title cannot be blank.")
        return trimmed

    def validate_goal(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            if value.user_id != request.user.id:
                raise serializers.ValidationError(
                    "Selected goal does not belong to the authenticated user."
                )
        return value

    def validate_task(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            if value.user_id != request.user.id:
                raise serializers.ValidationError(
                    "Selected task does not belong to the authenticated user."
                )
        return value

    def validate(self, attrs):
        resource_type = attrs.get(
            "resource_type",
            getattr(self.instance, "resource_type", None),
        )
        file_obj = attrs.get("file", getattr(self.instance, "file", None))
        url_val = attrs.get("url", getattr(self.instance, "url", ""))

        if resource_type == ResourceType.FILE:
            if not file_obj:
                raise serializers.ValidationError({"file": "File is required for FILE resources."})
            if attrs.get("url") and attrs.get("url").strip():
                raise serializers.ValidationError({"url": "URL cannot be provided for FILE resources."})
            if "file" in attrs and attrs["file"]:
                validate_resource_file(attrs["file"])
                # Ensure url is cleared for file resources
                attrs["url"] = ""

        elif resource_type == ResourceType.LINK:
            if not url_val or not url_val.strip():
                raise serializers.ValidationError({"url": "URL is required for LINK resources."})
            if attrs.get("file"):
                raise serializers.ValidationError({"file": "File cannot be provided for LINK resources."})
            # Ensure file is cleared for link resources
            attrs["file"] = None

        goal = attrs.get("goal", getattr(self.instance, "goal", None))
        task = attrs.get("task", getattr(self.instance, "task", None) if "task" not in attrs else None)

        if task is not None and goal is not None:
            if task.goal_id != goal.id:
                raise serializers.ValidationError(
                    {"task": "Task does not belong to the selected goal."}
                )

        return attrs
