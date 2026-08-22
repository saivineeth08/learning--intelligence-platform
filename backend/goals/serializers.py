from rest_framework import serializers

from goals.models import Goal, GoalPriority, GoalStatus


class GoalSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(
        choices=GoalStatus.choices, default=GoalStatus.ACTIVE
    )
    priority = serializers.ChoiceField(
        choices=GoalPriority.choices, default=GoalPriority.MEDIUM
    )

    class Meta:
        model = Goal
        fields = (
            "id",
            "user",
            "title",
            "description",
            "category",
            "status",
            "priority",
            "target_date",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user", "created_at", "updated_at")
        extra_kwargs = {
            "title": {"required": True, "allow_blank": False},
            "description": {"required": False, "allow_blank": True},
            "category": {"required": False, "allow_blank": True},
            "target_date": {"required": False, "allow_null": True},
        }

    def validate_title(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Title cannot be blank.")
        return trimmed

    def validate_category(self, value):
        return value.strip() if value else ""
