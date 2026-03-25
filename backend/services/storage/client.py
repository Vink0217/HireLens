"""
Cloudinary file storage client for HireLens.

Uploads resume files (PDF/DOCX) to Cloudinary.
Falls back to local filesystem if CLOUDINARY_URL is not configured.
"""

import logging
import os
from pathlib import Path

import cloudinary
import cloudinary.uploader

from core.config import settings

logger = logging.getLogger(__name__)

# ── Local storage directory (fallback) ──────────────────────
_LOCAL_UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"


def init_storage():
    """
    Configure Cloudinary from CLOUDINARY_URL, or prepare local fallback.

    Call once at app startup (in FastAPI lifespan).
    """
    if settings.USE_LOCAL_STORAGE:
        _LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        logger.info("Storage: using LOCAL filesystem at %s", _LOCAL_UPLOAD_DIR)
    else:
        cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
        logger.info("Storage: Cloudinary configured.")


async def upload_file(file_bytes: bytes, file_name: str) -> str:
    """
    Upload a file and return its public URL.

    - Production: uploads to Cloudinary `hirelens-resumes/` folder.
    - Development: saves to local `uploads/` directory.

    Args:
        file_bytes: Raw file content.
        file_name: Original filename (used for naming in storage).

    Returns:
        Public URL string (Cloudinary URL or local file path).
    """
    if settings.USE_LOCAL_STORAGE:
        return _save_locally(file_bytes, file_name)

    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            folder="hirelens-resumes",
            resource_type="raw",
            public_id=file_name.rsplit(".", 1)[0],  # strip extension for public_id
            overwrite=False,
            unique_filename=True,
        )
        url = result.get("secure_url", result.get("url", ""))
        logger.info("Uploaded to Cloudinary: %s", url)
        return url

    except Exception as e:
        logger.error("Cloudinary upload failed: %s — falling back to local", e)
        return _save_locally(file_bytes, file_name)


async def delete_file(file_url: str) -> bool:
    """
    Delete a file from storage.

    Args:
        file_url: The URL returned by upload_file.

    Returns:
        True if deleted successfully.
    """
    if settings.USE_LOCAL_STORAGE or not file_url.startswith("http"):
        # Local file — delete from filesystem
        path = Path(file_url)
        if path.exists():
            path.unlink()
            return True
        return False

    try:
        # Extract public_id from Cloudinary URL
        public_id = file_url.split("/hirelens-resumes/")[-1].rsplit(".", 1)[0]
        full_id = f"hirelens-resumes/{public_id}"
        result = cloudinary.uploader.destroy(full_id, resource_type="raw")
        return result.get("result") == "ok"
    except Exception as e:
        logger.error("Cloudinary delete failed: %s", e)
        return False


def _save_locally(file_bytes: bytes, file_name: str) -> str:
    """Save file to local uploads/ directory. Returns the file path."""
    _LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Add a simple counter to avoid overwrites
    dest = _LOCAL_UPLOAD_DIR / file_name
    counter = 1
    while dest.exists():
        stem = file_name.rsplit(".", 1)[0]
        ext = file_name.rsplit(".", 1)[1] if "." in file_name else ""
        dest = _LOCAL_UPLOAD_DIR / f"{stem}_{counter}.{ext}"
        counter += 1

    dest.write_bytes(file_bytes)
    logger.info("Saved locally: %s", dest)
    return str(dest)
