import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from server.models.document import Document, DocumentChunk
from server.rag.embeddings import generate_embeddings
from server.rag.loader import extract_text_from_pdf
from server.rag.splitter import split_text
from server.storage.service import storage_service

logger = logging.getLogger(__name__)


async def ingest_document(
    db: AsyncSession,
    file_bytes: bytes,
    filename: str,
    content_type: str,
    uploaded_by: dict[str, str | None] | None = None,
):
    # Extraction, embedding and storage calls are blocking, so they run
    # in worker threads to keep the event loop free for other requests.

    # Extract text from PDF
    text = await asyncio.to_thread(extract_text_from_pdf, file_bytes)

    if not text.strip():
        raise ValueError(
            "No readable text found in the PDF."
        )

    # Split text into chunks
    chunks = split_text(text)

    if not chunks:
        raise ValueError(
            "No chunks could be generated from the document."
        )

    # Generate embeddings
    embeddings = await asyncio.to_thread(generate_embeddings, chunks)

    # Create document record
    document = Document(
        filename=filename,
        file_type=content_type,
        source="upload",
        metadata_={
            "chunk_count": len(chunks),
            "size_bytes": len(file_bytes),
            "uploaded_by": uploaded_by,
        },
    )

    db.add(document)
    await db.flush()

    # Upload original PDF to Supabase Storage
    storage_path = (
        f"documents/{document.id}/{filename}"
    )

    await asyncio.to_thread(
        storage_service.upload_pdf,
        file_bytes=file_bytes,
        storage_path=storage_path,
    )

    document.storage_path = storage_path

    try:
        # Store chunks and embeddings
        for index, (chunk, embedding) in enumerate(
            zip(chunks, embeddings)
        ):
            document_chunk = DocumentChunk(
                document_id=document.id,
                content=chunk,
                chunk_index=index,
                embedding=embedding,
                metadata_={
                    "source": filename,
                },
            )

            db.add(document_chunk)

        await db.commit()

    except Exception:
        # Don't leave an orphaned PDF in storage if the DB write fails.
        try:
            await asyncio.to_thread(storage_service.delete_file, storage_path)
        except Exception:
            logger.exception("Failed to clean up %s", storage_path)
        raise

    await db.refresh(document)

    return document
