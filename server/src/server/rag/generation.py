from collections.abc import AsyncIterator

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
)

from server.ai.llm import llm


SYSTEM_PROMPT = """
You are OpsPilot, an AI internal operations assistant.

Your job is to answer questions using ONLY the provided knowledge base context.

Rules:

1. Use only the information provided in the context.
2. Do not invent, assume, or hallucinate company policies or facts.
3. If the context does not contain enough information to answer the question,
   clearly say that the information was not found in the knowledge base.
4. Keep answers concise and useful.
5. When appropriate, mention the relevant source document.
6. Never claim that you performed an action unless a tool actually performed it.

Knowledge Base Context:
"""


def build_context(retrieved_chunks: list[dict]) -> str:
    context_parts = []

    for index, chunk in enumerate(retrieved_chunks, start=1):
        context_parts.append(
            f"""
Source {index}
Document: {chunk["metadata"].get("source", "Unknown")}
Similarity: {chunk["similarity"]:.3f}

Content:
{chunk["content"]}
"""
        )

    return "\n".join(context_parts)


def build_messages(
    query: str,
    retrieved_chunks: list[dict],
    history: list[tuple[str, str]] | None = None,
) -> list[BaseMessage]:
    messages: list[BaseMessage] = [
        SystemMessage(
            content=SYSTEM_PROMPT + "\n" + build_context(retrieved_chunks)
        ),
    ]

    for role, text in history or []:
        if role == "user":
            messages.append(HumanMessage(content=text))
        elif role == "assistant":
            messages.append(AIMessage(content=text))

    messages.append(
        HumanMessage(
            content=query
        )
    )

    return messages


async def generate_grounded_answer(
    query: str,
    retrieved_chunks: list[dict],
) -> str:
    response = await llm.ainvoke(
        build_messages(query, retrieved_chunks)
    )

    return response.content


async def stream_grounded_answer(
    query: str,
    retrieved_chunks: list[dict],
    history: list[tuple[str, str]] | None = None,
) -> AsyncIterator[str]:
    async for chunk in llm.astream(
        build_messages(query, retrieved_chunks, history)
    ):
        if isinstance(chunk.content, str) and chunk.content:
            yield chunk.content
