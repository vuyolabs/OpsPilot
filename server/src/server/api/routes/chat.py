import asyncio
import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from server.api.schemas.chat import ChatRequest
from server.core.auth import CurrentUser, get_current_user
from server.core.database import SessionLocal, get_db
from server.rag.generation import stream_grounded_answer
from server.rag.retrieval import retrieve_similar_chunks
from server.services.conversations import (
    ConversationNotFound,
    record_assistant_message,
    record_user_turn,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/chat",
    tags=["Chat"],
    dependencies=[Depends(get_current_user)],
)

# Number of previous turns sent to the LLM as conversation history.
MAX_HISTORY_MESSAGES = 10

NO_CONTEXT_ANSWER = (
    "I couldn't find enough relevant information "
    "in the knowledge base to answer this question."
)

# Headers required by the Vercel AI SDK UI message stream protocol.
# https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol
UI_MESSAGE_STREAM_HEADERS = {
    "x-vercel-ai-ui-message-stream": "v1",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


def sse(part: dict[str, Any] | str) -> str:
    payload = part if isinstance(part, str) else json.dumps(part)
    return f"data: {payload}\n\n"


def unique_sources(chunks: list[dict]) -> list[dict]:
    sources: dict[str, dict] = {}

    for chunk in chunks:
        document_id = str(chunk["document_id"])

        if document_id not in sources:
            sources[document_id] = {
                "type": "source-document",
                "sourceId": document_id,
                "mediaType": "application/pdf",
                "title": chunk["metadata"].get("source", "Unknown"),
            }

    return list(sources.values())


async def save_answer(
    conversation_id: str,
    message_id: str,
    text: str,
    sources: list[dict],
) -> None:
    # Uses its own session: the request's session is closed by the time
    # the stream finishes.
    try:
        async with SessionLocal() as db:
            await record_assistant_message(
                db,
                conversation_id=conversation_id,
                message_id=message_id,
                text=text,
                sources=sources,
            )
    except Exception:
        logger.exception("Failed to save answer for %s", conversation_id)


async def ui_message_stream(
    conversation_id: str,
    query: str,
    chunks: list[dict],
    history: list[tuple[str, str]],
) -> AsyncIterator[str]:
    message_id = f"msg_{uuid.uuid4().hex}"
    text_id = f"text_{uuid.uuid4().hex}"
    sources = unique_sources(chunks)
    answer: list[str] = []

    yield sse({"type": "start", "messageId": message_id})
    yield sse({"type": "start-step"})

    for source in sources:
        yield sse(source)

    yield sse({"type": "text-start", "id": text_id})

    try:
        if not chunks:
            answer.append(NO_CONTEXT_ANSWER)
            yield sse({"type": "text-delta", "id": text_id, "delta": NO_CONTEXT_ANSWER})
        else:
            async for delta in stream_grounded_answer(query, chunks, history):
                answer.append(delta)
                yield sse({"type": "text-delta", "id": text_id, "delta": delta})

    except Exception:
        logger.exception("Chat stream failed")
        yield sse({"type": "text-end", "id": text_id})
        yield sse({"type": "error", "errorText": "Failed to generate an answer."})
        yield sse("[DONE]")
        return

    finally:
        # Also runs when the user presses stop or disconnects, so the
        # partial answer they saw is kept. Shielded so a cancelled stream
        # can't interrupt the save halfway.
        if answer:
            try:
                await asyncio.shield(
                    asyncio.ensure_future(
                        save_answer(conversation_id, message_id, "".join(answer), sources)
                    )
                )
            except asyncio.CancelledError:
                pass

    yield sse({"type": "text-end", "id": text_id})
    yield sse({"type": "finish-step"})
    yield sse({"type": "finish"})
    yield sse("[DONE]")


@router.post("")
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    last_message = request.messages[-1]
    query = last_message.text

    if last_message.role != "user" or len(query) < 2:
        raise HTTPException(
            status_code=400,
            detail="The last message must be a user message with text.",
        )

    conversation_id = str(request.id)

    try:
        await record_user_turn(
            db,
            conversation_id=conversation_id,
            user_id=user.id,
            message_id=last_message.id,
            text=query,
            regenerate=request.trigger == "regenerate-message",
        )
    except ConversationNotFound as exc:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        ) from exc

    history = [
        (message.role, message.text)
        for message in request.messages[:-1][-MAX_HISTORY_MESSAGES:]
        if message.role in ("user", "assistant") and message.text
    ]

    # Retrieve before streaming so the DB session is not held open
    # for the whole duration of the LLM response.
    try:
        chunks = await retrieve_similar_chunks(
            db=db,
            query=query,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Knowledge search failed.",
        ) from exc

    return StreamingResponse(
        ui_message_stream(conversation_id, query, chunks, history),
        media_type="text/event-stream",
        headers=UI_MESSAGE_STREAM_HEADERS,
    )
