from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.core.database import Base


# Tables are created by sql/conversations.sql.
class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
    )

    # Supabase auth.users id.
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        server_default=text("now()"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        server_default=text("now()"),
    )

    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
    )

    conversation_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey(
            "conversations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    sources: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        default=list,
    )

    created_at: Mapped[datetime] = mapped_column(
        server_default=text("now()"),
    )

    conversation: Mapped["Conversation"] = relationship(
        back_populates="messages",
    )
