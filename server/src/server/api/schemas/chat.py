from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UIMessagePart(BaseModel):
    """A single part of an AI SDK UIMessage. Only `text` parts are read."""

    model_config = ConfigDict(extra="allow")

    type: str
    text: str | None = None


class UIMessage(BaseModel):
    """Message shape sent by the Vercel AI SDK `useChat` hook."""

    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1, max_length=100)
    role: Literal["system", "user", "assistant"]
    parts: list[UIMessagePart] = Field(default_factory=list)
    metadata: Any = None

    @property
    def text(self) -> str:
        return "".join(
            part.text or ""
            for part in self.parts
            if part.type == "text"
        ).strip()


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    # The AI SDK chat id, used as the conversation id.
    id: UUID
    messages: list[UIMessage] = Field(min_length=1)
    trigger: Literal["submit-message", "regenerate-message"] = "submit-message"

    top_k: int = Field(
        default=5,
        ge=1,
        le=10,
    )

    similarity_threshold: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
    )
