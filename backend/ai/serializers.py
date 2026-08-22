from rest_framework import serializers

from ai.models import AIChatMessage, AIChatSession, Quiz, QuizQuestion


class AIChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIChatMessage
        fields = [
            "id",
            "session",
            "sender",
            "message",
            "sources",
            "created_at",
        ]
        read_only_fields = ["id", "session", "sender", "sources", "created_at"]


class AIChatSessionSerializer(serializers.ModelSerializer):
    resource_title = serializers.CharField(source="resource.title", read_only=True, default=None)
    messages = AIChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = AIChatSession
        fields = [
            "id",
            "user",
            "resource",
            "resource_title",
            "title",
            "created_at",
            "messages",
            "message_count",
        ]
        read_only_fields = ["id", "user", "created_at"]

    def get_message_count(self, obj):
        return obj.messages.count()


class CreateChatSessionSerializer(serializers.Serializer):
    resource_id = serializers.IntegerField(required=False, allow_null=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)


class SendChatMessageSerializer(serializers.Serializer):
    message = serializers.CharField(required=True, allow_blank=False)


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = [
            "id",
            "quiz",
            "question",
            "options",
            "correct_answer",
            "explanation",
            "difficulty",
        ]
        read_only_fields = ["id", "quiz"]


class QuizSerializer(serializers.ModelSerializer):
    resource_title = serializers.CharField(source="resource.title", read_only=True, default=None)
    goal_title = serializers.CharField(source="goal.title", read_only=True, default=None)
    questions = QuizQuestionSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            "id",
            "user",
            "goal",
            "goal_title",
            "resource",
            "resource_title",
            "title",
            "created_at",
            "questions",
            "question_count",
        ]
        read_only_fields = ["id", "user", "created_at"]

    def get_question_count(self, obj):
        return obj.questions.count()


class GenerateQuizSerializer(serializers.Serializer):
    resource_id = serializers.IntegerField(required=False, allow_null=True)
    goal_id = serializers.IntegerField(required=False, allow_null=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    question_count = serializers.IntegerField(default=5, min_value=1, max_value=20)
    difficulty = serializers.ChoiceField(
        choices=QuizQuestion.DifficultyChoices.values,
        default=QuizQuestion.DifficultyChoices.MEDIUM,
    )


class DocumentIndexRequestSerializer(serializers.Serializer):
    resource_id = serializers.IntegerField(required=True)


class RecommendationSerializer(serializers.Serializer):
    priority = serializers.ChoiceField(choices=["HIGH", "MEDIUM", "LOW"])
    type = serializers.CharField()
    title = serializers.CharField()
    message = serializers.CharField()
    action_url = serializers.CharField(allow_blank=True, default="")

