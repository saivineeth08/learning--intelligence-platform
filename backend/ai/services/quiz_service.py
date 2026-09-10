import json
import logging
from typing import Any, Dict, List, Optional

from django.db import transaction
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from ai.models import DocumentChunk, Quiz, QuizQuestion
from ai.providers import get_llm_provider
from ai.services.document_service import extract_text, index_resource
from goals.models import Goal
from resources.models import Resource

logger = logging.getLogger(__name__)


def generate_quiz(
    user: Any,
    resource_id: Optional[int] = None,
    goal_id: Optional[int] = None,
    title: Optional[str] = None,
    question_count: int = 5,
    difficulty: str = "MEDIUM",
    llm_provider=None,
) -> Quiz:
    """Generate and persist a structured learning quiz from user resources or goals."""
    if not (1 <= question_count <= 20):
        raise ValidationError({"question_count": "Question count must be between 1 and 20."})

    diff_choice = difficulty.upper().strip()
    if diff_choice not in QuizQuestion.DifficultyChoices.values:
        diff_choice = QuizQuestion.DifficultyChoices.MEDIUM

    resource = None
    if resource_id:
        try:
            resource = Resource.objects.get(id=resource_id)
            if resource.user_id != user.id:
                raise PermissionDenied("You do not have permission to use this resource.")
        except Resource.DoesNotExist:
            raise NotFound("Specified resource not found.")

    goal = None
    if goal_id:
        try:
            goal = Goal.objects.get(id=goal_id)
            if goal.user_id != user.id:
                raise PermissionDenied("You do not have permission to use this goal.")
        except Goal.DoesNotExist:
            raise NotFound("Specified goal not found.")

    # Gather learning content
    content_snippets = []
    if resource:
        chunks = DocumentChunk.objects.filter(resource=resource, user=user)
        if not chunks.exists():
            index_resource(resource, request_user=user)
            chunks = DocumentChunk.objects.filter(resource=resource, user=user)

        chunk_texts = [c.content for c in chunks]
        if chunk_texts:
            content_snippets.extend(chunk_texts[:10])
        else:
            raw_text = extract_text(resource)
            if raw_text:
                content_snippets.append(raw_text)

    if goal and not content_snippets:
        goal_text = f"Goal: {goal.title}\nDescription: {goal.description}"
        content_snippets.append(goal_text)

    combined_text = "\n\n".join(content_snippets).strip()
    if not combined_text:
        raise ValidationError({
            "error": "No readable content found in the selected resource or goal to generate questions."
        })

    # Prepare prompt
    system_prompt = (
        "You are an expert educator who generates high-quality multiple choice quizzes. "
        "Generate distinct, thoughtful multiple-choice questions strictly based on the provided material. "
        "Strictly adhere to the provided JSON schema."
    )
    user_prompt = (
        f"Generate {question_count} unique multiple-choice questions with difficulty level {diff_choice} "
        f"based on the following learning material:\n\n"
        f"{combined_text[:4000]}\n\n"
        "Return a valid JSON object with the key 'questions' containing a list of question objects. "
        "Each object must have exactly:\n"
        "- 'question': string (unique question text)\n"
        "- 'options': list of 4 distinct answer choices\n"
        "- 'correct_answer': the exact text of the correct option (must match one of the 4 options)\n"
        "- 'explanation': a clear explanation of why the correct answer is right based on the material\n"
        "- 'difficulty': 'EASY', 'MEDIUM', or 'HARD'"
    )

    provider = llm_provider or get_llm_provider()
    
    # Handle Mock provider or real LLM provider response
    raw_result = provider.generate_json(prompt=user_prompt, system_prompt=system_prompt)

    # Normalize response format
    question_data = []
    if isinstance(raw_result, dict):
        if "questions" in raw_result and isinstance(raw_result["questions"], list):
            question_data = raw_result["questions"]
        elif "data" in raw_result and isinstance(raw_result["data"], list):
            question_data = raw_result["data"]
        elif "mock" in raw_result:
            # Diverse deterministic mock questions for test environments
            topics = [
                "Core Architecture & Fundamentals",
                "Data Flow & Optimization",
                "Key Algorithms & Complexity",
                "State Management & Execution",
                "Security & Best Practices",
            ]
            target_name = resource.title if resource else (goal.title if goal else "the Subject")
            question_data = []
            for i in range(question_count):
                topic = topics[i % len(topics)]
                question_data.append({
                    "question": f"Regarding {target_name} ({topic}): Which statement is correct?",
                    "options": [
                        f"It implements {topic.lower()} to ensure reliable learning execution.",
                        "It bypasses data validation to maximize speed at the cost of correctness.",
                        "It is an obsolete pattern no longer recommended for modern architectures.",
                        "It requires unrelated third-party microservices for simple operations.",
                    ],
                    "correct_answer": f"It implements {topic.lower()} to ensure reliable learning execution.",
                    "explanation": f"Understanding {topic.lower()} is essential to mastering {target_name}.",
                    "difficulty": diff_choice,
                })
    elif isinstance(raw_result, list):
        question_data = raw_result

    if not question_data:
        raise ValidationError({"error": "Failed to parse questions from AI provider output."})

    quiz_title = title.strip() if title else ""
    if not quiz_title:
        target_name = resource.title if resource else (goal.title if goal else "General Knowledge")
        quiz_title = f"Quiz: {target_name}"

    with transaction.atomic():
        quiz = Quiz.objects.create(
            user=user,
            resource=resource,
            goal=goal,
            title=quiz_title,
        )

        seen_questions = set()
        created_questions = []
        for item in question_data:
            if len(created_questions) >= question_count:
                break

            q_text = str(item.get("question", "")).strip()
            options = item.get("options", [])
            correct = str(item.get("correct_answer", "")).strip()
            expl = str(item.get("explanation", "")).strip()
            diff = str(item.get("difficulty", diff_choice)).upper()

            if not q_text or not options or not correct:
                continue

            # Deduplicate questions
            q_lower = q_text.lower()
            if q_lower in seen_questions:
                continue
            seen_questions.add(q_lower)

            if not isinstance(options, list) or len(options) < 2:
                continue

            # Clean options
            clean_opts = [str(opt).strip() for opt in options if str(opt).strip()]
            if len(clean_opts) < 2:
                continue

            # Ensure correct answer is one of the options
            if correct not in clean_opts:
                # Check for case-insensitive match or add if missing
                matched = next((opt for opt in clean_opts if opt.lower() == correct.lower()), None)
                if matched:
                    correct = matched
                else:
                    clean_opts[0] = correct

            if diff not in QuizQuestion.DifficultyChoices.values:
                diff = diff_choice

            created_questions.append(
                QuizQuestion(
                    quiz=quiz,
                    question=q_text,
                    options=clean_opts,
                    correct_answer=correct,
                    explanation=expl or "No explanation provided.",
                    difficulty=diff,
                )
            )

        if not created_questions:
            raise ValidationError({"error": "AI provider generated invalid question formats."})

        QuizQuestion.objects.bulk_create(created_questions)

    logger.info("Quiz generated id=%d user_id=%d questions=%d", quiz.id, user.id, len(created_questions))
    return Quiz.objects.select_related("resource", "goal").prefetch_related("questions").get(id=quiz.id)


def list_quizzes(user: Any):
    """List all quizzes created by the authenticated user."""
    return Quiz.objects.filter(user=user).select_related("resource", "goal").prefetch_related("questions").order_by("-created_at")


def get_quiz(user: Any, quiz_id: int) -> Quiz:
    """Retrieve a specific quiz with ownership validation."""
    try:
        quiz = (
            Quiz.objects.select_related("resource", "goal")
            .prefetch_related("questions")
            .get(id=quiz_id)
        )
    except Quiz.DoesNotExist:
        raise NotFound("Quiz not found.")

    if quiz.user_id != user.id:
        raise NotFound("Quiz not found.")

    return quiz
