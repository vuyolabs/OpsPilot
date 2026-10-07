from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.core.auth import CurrentUser, get_current_user
from server.core.database import get_db
from server.models.conversation import ChatMessage, Conversation
from server.services.conversations import (
    ConversationNotFound,
    get_owned_conversation,
    make_title,
)

router = APIRouter(
    prefix="/api/v1/conversations",
    tags=["Conversations"],
)

MAX_CONVERSATIONS = 100


class RenameConversationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)


def serialize_conversation(conversation: Conversation) -> dict:
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat(),
    }


def to_ui_message(message: ChatMessage) -> dict:
    """Shape a stored message like an AI SDK UIMessage."""
    parts: list[dict] = [*message.sources] if message.role == "assistant" else []
    parts.append({"type": "text", "text": message.content})

    return {
        "id": message.id,
        "role": message.role,
        "parts": parts,
    }


async def load_owned(
    db: AsyncSession,
    conversation_id: UUID,
    user: CurrentUser,
) -> Conversation:
    try:
        return await get_owned_conversation(db, str(conversation_id), user.id)
    except ConversationNotFound as exc:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        ) from exc


@router.get("")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    statement = (
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
        .limit(MAX_CONVERSATIONS)
    )

    conversations = (await db.scalars(statement)).all()

    return {
        "conversations": [
            serialize_conversation(conversation)
            for conversation in conversations
        ],
    }


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    await load_owned(db, conversation_id, user)

    conversation = await db.scalar(
        select(Conversation)
        .where(Conversation.id == str(conversation_id))
        .options(selectinload(Conversation.messages))
    )

    return {
        **serialize_conversation(conversation),
        "messages": [to_ui_message(message) for message in conversation.messages],
    }


@router.patch("/{conversation_id}")
async def rename_conversation(
    conversation_id: UUID,
    request: RenameConversationRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    conversation = await load_owned(db, conversation_id, user)

    conversation.title = make_title(request.title)
    await db.commit()
    await db.refresh(conversation)

    return serialize_conversation(conversation)


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    conversation = await load_owned(db, conversation_id, user)

    await db.delete(conversation)
    await db.commit()
