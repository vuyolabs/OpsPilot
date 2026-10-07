from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from server.api.schemas.knowledge import (
    KnowledgeAskRequest,
    KnowledgeSearchRequest,
)
from server.core.auth import get_current_user
from server.core.database import get_db
from server.rag.generation import generate_grounded_answer
from server.rag.retrieval import retrieve_similar_chunks

router = APIRouter(
    prefix="/api/v1/knowledge",
    tags=["Knowledge Base"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/search")
async def search_knowledge(
    request: KnowledgeSearchRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        results = await retrieve_similar_chunks(
            db=db,
            query=request.query,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold,
        )

        return {
            "query": request.query,
            "results": results,
            "count": len(results),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Knowledge search failed.",
        ) from exc


@router.post("/ask")
async def ask_knowledge(
    request: KnowledgeAskRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        results = await retrieve_similar_chunks(
            db=db,
            query=request.query,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold,
        )

        if not results:
            return {
                "query": request.query,
                "answer": (
                    "I couldn't find enough relevant information "
                    "in the knowledge base to answer this question."
                ),
                "sources": [],
            }

        answer = await generate_grounded_answer(
            query=request.query,
            retrieved_chunks=results,
        )

        sources = [
            {
                "document": chunk["metadata"].get(
                    "source",
                    "Unknown",
                ),
                "chunk_id": chunk["id"],
                "similarity": chunk["similarity"],
            }
            for chunk in results
        ]

        return {
            "query": request.query,
            "answer": answer,
            "sources": sources,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate knowledge-based answer.",
        ) from exc