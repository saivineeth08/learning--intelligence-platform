from rest_framework import serializers

from goals.models import Goal
from notes.models import Note
from resources.models import Resource
from tasks.models import Task


class NoteSerializer(serializers.ModelSerializer):
    goal = serializers.PrimaryKeyRelatedField(
        queryset=Goal.objects.all(), required=False, allow_null=True
    )
    task = serializers.PrimaryKeyRelatedField(
        queryset=Task.objects.all(), required=False, allow_null=True
    )
    resource = serializers.PrimaryKeyRelatedField(
        queryset=Resource.objects.all(), required=False, allow_null=True
    )
    goal_title = serializers.CharField(source="goal.title", read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True)
    resource_title = serializers.CharField(source="resource.title", read_only=True)

    class Meta:
        model = Note
        fields = (
            "id",
            "user",
            "title",
            "content",
            "goal",
            "task",
            "resource",
            "goal_title",
            "task_title",
            "resource_title",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user",
            "goal_title",
            "task_title",
            "resource_title",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "title": {"required": True, "allow_blank": False},
            "content": {"required": False, "allow_blank": True},
        }

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

    def validate_resource(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            if value.user_id != request.user.id:
                raise serializers.ValidationError(
                    "Selected resource does not belong to the authenticated user."
                )
        return value

    def validate(self, attrs):
        goal = attrs.get("goal", getattr(self.instance, "goal", None))
        task = attrs.get("task", getattr(self.instance, "task", None) if "task" not in attrs else None)

        if task is not None and goal is not None:
            if task.goal_id != goal.id:
                raise serializers.ValidationError(
                    {"task": "Task does not belong to the selected goal."}
                )

        return attrs
