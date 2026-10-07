from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.models.document import DocumentChunk
from server.rag.embeddings import generate_embedding


async def retrieve_similar_chunks(
    db: AsyncSession,
    query: str,
    top_k: int = 5,
    similarity_threshold: float = 0.3,
):
    query_embedding = generate_embedding(query)

    distance = DocumentChunk.embedding.cosine_distance(
        query_embedding
    )

    similarity = (1 - distance).label("similarity")

    statement = (
        select(
            DocumentChunk,
            similarity,
        )
        .where(
            similarity >= similarity_threshold
        )
        .order_by(distance)
        .limit(top_k)
    )

    result = await db.execute(statement)

    rows = result.all()

    return [
        {
            "id": chunk.id,
            "document_id": chunk.document_id,
            "content": chunk.content,
            "chunk_index": chunk.chunk_index,
            "similarity": float(score),
            "metadata": chunk.metadata_,
        }
        for chunk, score in rows
    ]