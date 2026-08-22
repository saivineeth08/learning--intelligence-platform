from rest_framework import serializers

from goals.models import Goal
from studies.models import StudySession
from tasks.models import Task


class StudySessionSerializer(serializers.ModelSerializer):
    goal = serializers.PrimaryKeyRelatedField(queryset=Goal.objects.all())
    goal_title = serializers.CharField(source="goal.title", read_only=True)
    task = serializers.PrimaryKeyRelatedField(
        queryset=Task.objects.all(), required=False, allow_null=True
    )
    task_title = serializers.CharField(source="task.title", read_only=True)

    class Meta:
        model = StudySession
        fields = (
            "id",
            "goal",
            "goal_title",
            "task",
            "task_title",
            "user",
            "started_at",
            "ended_at",
            "duration_seconds",
            "notes",
            "created_at",
        )
        read_only_fields = (
            "id",
            "user",
            "goal_title",
            "task_title",
            "duration_seconds",
            "created_at",
        )
        extra_kwargs = {
            "notes": {"required": False, "allow_blank": True},
        }

    def validate_goal(self, value):
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
        started_at = attrs.get(
            "started_at",
            getattr(self.instance, "started_at", None),
        )
        ended_at = attrs.get(
            "ended_at",
            getattr(self.instance, "ended_at", None),
        )

        if started_at and ended_at and ended_at < started_at:
            raise serializers.ValidationError(
                {"ended_at": "ended_at cannot be earlier than started_at."}
            )

        goal = attrs.get("goal", getattr(self.instance, "goal", None))
        task = attrs.get("task", getattr(self.instance, "task", None) if "task" not in attrs else None)

        if task is not None and goal is not None:
            if task.goal_id != goal.id:
                raise serializers.ValidationError(
                    {"task": "Task does not belong to the selected goal."}
                )

        return attrs
