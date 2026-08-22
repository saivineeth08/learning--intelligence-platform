from rest_framework import serializers

from goals.models import Goal
from tasks.models import Task, TaskPriority, TaskStatus


class TaskSerializer(serializers.ModelSerializer):
    goal = serializers.PrimaryKeyRelatedField(queryset=Goal.objects.all())
    goal_title = serializers.CharField(source="goal.title", read_only=True)
    status = serializers.ChoiceField(
        choices=TaskStatus.choices, default=TaskStatus.TODO
    )
    priority = serializers.ChoiceField(
        choices=TaskPriority.choices, default=TaskPriority.MEDIUM
    )

    class Meta:
        model = Task
        fields = (
            "id",
            "goal",
            "goal_title",
            "user",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "completed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user",
            "goal_title",
            "completed_at",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "title": {"required": True, "allow_blank": False},
            "description": {"required": False, "allow_blank": True},
            "due_date": {"required": False, "allow_null": True},
        }

    def validate_title(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Title cannot be blank.")
        return trimmed

    def validate_goal(self, value):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            if value.user_id != request.user.id:
                raise serializers.ValidationError(
                    "Selected goal does not belong to the authenticated user."
                )
        return value
