"""Storage service — file upload abstraction (Cloudinary + local fallback)."""

from services.storage.client import init_storage, upload_file, delete_file

__all__ = ["init_storage", "upload_file", "delete_file"]
