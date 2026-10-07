from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from server.models.conversation import ChatMessage, Conversation

TITLE_MAX_LENGTH = 80


class ConversationNotFound(Exception):
    """Raised when a conversation doesn't exist or belongs to someone else."""


def make_title(text: str) -> str:
    title = " ".join(text.split())

    if len(title) > TITLE_MAX_LENGTH:
        title = title[: TITLE_MAX_LENGTH - 1].rstrip() + "…"

    return title or "New chat"


async def get_owned_conversation(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
) -> Conversation:
    conversation = await db.get(Conversation, conversation_id)

    # Someone else's conversation is reported exactly like a missing one.
    if conversation is None or conversation.user_id != user_id:
        raise ConversationNotFound

    return conversation


async def record_user_turn(
    db: AsyncSession,
    conversation_id: str,
    user_id: str,
    message_id: str,
    text: str,
    regenerate: bool,
) -> None:
    """Create the conversation if needed and store the user's message.

    On regenerate the user message is already stored, so instead the
    previous answer to it is removed before a new one is generated.
    """
    conversation = await db.get(Conversation, conversation_id)

    if conversation is None:
        db.add(
            Conversation(
                id=conversation_id,
                user_id=user_id,
                title=make_title(text),
            )
        )
        await db.flush()

    elif conversation.user_id != user_id:
        raise ConversationNotFound

    if regenerate:
        last_user_message_at = (
            select(func.max(ChatMessage.created_at))
            .where(
                ChatMessage.conversation_id == conversation_id,
                ChatMessage.role == "user",
            )
            .scalar_subquery()
        )

        await db.execute(
            delete(ChatMessage).where(
                ChatMessage.conversation_id == conversation_id,
                ChatMessage.role == "assistant",
                ChatMessage.created_at >= last_user_message_at,
            )
        )

    else:
        # Ignore retries of a message that was already saved.
        await db.execute(
            insert(ChatMessage)
            .values(
                id=message_id,
                conversation_id=conversation_id,
                role="user",
                content=text,
            )
            .on_conflict_do_nothing(index_elements=["id"])
        )

    await touch(db, conversation_id)
    await db.commit()


async def record_assistant_message(
    db: AsyncSession,
    conversation_id: str,
    message_id: str,
    text: str,
    sources: list[dict],
) -> None:
    db.add(
        ChatMessage(
            id=message_id,
            conversation_id=conversation_id,
            role="assistant",
            content=text,
            sources=sources,
        )
    )

    await touch(db, conversation_id)
    await db.commit()


async def touch(db: AsyncSession, conversation_id: str) -> None:
    conversation = await db.get(Conversation, conversation_id)

    if conversation is not None:
        conversation.updated_at = func.now()
