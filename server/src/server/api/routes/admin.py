import asyncio
import logging
from pathlib import PurePath
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from server.core.auth import CurrentUser, require_admin
from server.core.database import get_db
from server.models.document import Document, DocumentChunk
from server.rag.ingestion import ingest_document
from server.storage.service import storage_service

logger = logging.getLogger(__name__)

# Every route here answers 404 to non-admins and is left out of the
# public OpenAPI docs, so normal users can't discover the admin API.
router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
    include_in_schema=False,
)

MAX_UPLOAD_BYTES = 20 * 1024 * 1024


def serialize_document(document: Document, chunk_count: int) -> dict:
    metadata = document.metadata_ or {}

    return {
        "id": document.id,
        "filename": document.filename,
        "chunk_count": chunk_count,
        "size_bytes": metadata.get("size_bytes"),
        "uploaded_by": (metadata.get("uploaded_by") or {}).get("email"),
        "created_at": document.created_at.isoformat(),
    }


@router.get("/documents")
async def list_documents(
    db: AsyncSession = Depends(get_db),
):
    chunk_counts = (
        select(
            DocumentChunk.document_id,
            func.count().label("chunk_count"),
        )
        .group_by(DocumentChunk.document_id)
        .subquery()
    )

    statement = (
        select(
            Document,
            func.coalesce(chunk_counts.c.chunk_count, 0),
        )
        .outerjoin(
            chunk_counts,
            chunk_counts.c.document_id == Document.id,
        )
        .order_by(Document.created_at.desc())
    )

    rows = (await db.execute(statement)).all()

    return {
        "documents": [
            serialize_document(document, count)
            for document, count in rows
        ],
    }


@router.post("/documents", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="PDF must be 20 MB or smaller.",
        )

    # Drop any directory parts so the name can't escape the storage folder.
    filename = PurePath(file.filename or "").name or "document.pdf"

    try:
        document = await ingest_document(
            db=db,
            file_bytes=file_bytes,
            filename=filename,
            content_type=file.content_type,
            uploaded_by={"id": admin.id, "email": admin.email},
        )

    except ValueError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception("Failed to ingest %s", filename)
        await db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to ingest document.",
        ) from exc

    return serialize_document(
        document,
        document.metadata_.get("chunk_count", 0),
    )


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    document = await db.get(Document, str(document_id))

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    storage_path = document.storage_path

    # Chunks are removed by the ON DELETE CASCADE foreign key.
    await db.execute(
        delete(Document).where(Document.id == str(document_id))
    )
    await db.commit()

    if storage_path:
        try:
            await asyncio.to_thread(storage_service.delete_file, storage_path)
        except Exception:
            logger.exception("Failed to delete %s from storage", storage_path)
