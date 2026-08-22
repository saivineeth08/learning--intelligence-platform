import logging
from typing import Any, List, Optional

from django.db import transaction
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from ai.models import AIChatMessage, AIChatSession
from ai.services.rag_service import generate_grounded_response
from resources.models import Resource

logger = logging.getLogger(__name__)


def create_chat_session(
    user: Any,
    resource_id: Optional[int] = None,
    title: Optional[str] = None,
) -> AIChatSession:
    """Create a new AI chat session strictly isolated to the authenticated user."""
    resource = None
    if resource_id:
        try:
            resource = Resource.objects.get(id=resource_id)
            if resource.user_id != user.id:
                raise PermissionDenied("You do not have permission to use this resource.")
        except Resource.DoesNotExist:
            raise NotFound("Specified resource not found.")

    session_title = title.strip() if title else ""
    if not session_title:
        session_title = f"Chat: {resource.title}" if resource else "New Learning Chat"

    session = AIChatSession.objects.create(
        user=user,
        resource=resource,
        title=session_title,
    )
    logger.info("AIChatSession created id=%d user_id=%d", session.id, user.id)
    return session


def list_chat_sessions(user: Any):
    """Retrieve all chat sessions owned by the authenticated user."""
    return AIChatSession.objects.filter(user=user).select_related("resource").order_by("-created_at")


def get_chat_session(user: Any, session_id: int) -> AIChatSession:
    """Retrieve a specific chat session with ownership verification."""
    try:
        session = (
            AIChatSession.objects.select_related("resource")
            .prefetch_related("messages")
            .get(id=session_id)
        )
    except AIChatSession.DoesNotExist:
        raise NotFound("Chat session not found.")

    if session.user_id != user.id:
        raise NotFound("Chat session not found.")

    return session


def send_chat_message(
    user: Any,
    session_id: int,
    message_text: str,
    llm_provider=None,
) -> AIChatMessage:
    """Send a user message in a session, trigger RAG retrieval, and save the AI answer."""
    clean_text = (message_text or "").strip()
    if not clean_text:
        raise ValidationError({"message": "Message text cannot be empty."})

    session = get_chat_session(user=user, session_id=session_id)

    with transaction.atomic():
        # Persist user turn
        AIChatMessage.objects.create(
            session=session,
            sender=AIChatMessage.SenderChoices.USER,
            message=clean_text,
            sources=[],
        )

        # Execute grounded RAG response
        rag_response = generate_grounded_response(
            user=user,
            query=clean_text,
            resource=session.resource,
            llm_provider=llm_provider,
        )

        # Persist AI response
        ai_message = AIChatMessage.objects.create(
            session=session,
            sender=AIChatMessage.SenderChoices.AI,
            message=rag_response["answer"],
            sources=rag_response.get("sources", []),
        )

    logger.info(
        "Chat exchange completed for session_id=%d user_id=%d ai_msg_id=%d",
        session.id,
        user.id,
        ai_message.id,
    )
    return ai_message
