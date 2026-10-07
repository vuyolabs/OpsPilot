from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    filename: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    file_type: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    source: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    storage_path: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        server_default=text("now()"),
    )

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    document_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey(
            "documents.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    embedding: Mapped[list[float]] = mapped_column(
        Vector(384),
        nullable=False,
    )

    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        server_default=text("now()"),
    )

    document: Mapped["Document"] = relationship(
        back_populates="chunks",
    )