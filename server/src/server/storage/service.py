from pathlib import Path

from server.core.config import settings
from server.storage.supabase import supabase


class StorageService:
    def __init__(self):
        self.bucket = settings.supabase_storage_bucket

    def upload_pdf(
        self,
        file_bytes: bytes,
        storage_path: str,
    ) -> str:
        supabase.storage.from_(self.bucket).upload(
            path=storage_path,
            file=file_bytes,
            file_options={
                "content-type": "application/pdf",
                "upsert": "false",
            },
        )

        return storage_path

    def delete_file(self, storage_path: str) -> None:
        supabase.storage.from_(self.bucket).remove(
            [storage_path]
        )


storage_service = StorageService()