"""
HireLens Configuration — loads environment variables with validation.

Uses python-dotenv to load from .env file, then validates required vars.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend directory (parent of core directory)
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(_env_path)


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    # Required
    GEMINI_API_KEY: str = ""

    # Database — Neon Postgres connection string
    DATABASE_URL: str = ""

    # File storage — Cloudinary connection string (empty = local filesystem)
    CLOUDINARY_URL: str = ""

    # Optional
    GEMINI_EMBEDDING_MODEL: str = "models/text-embedding-004"
    MAX_FILE_SIZE_MB: int = 10
    CORS_ORIGINS: list[str] = field(default_factory=lambda: ["http://localhost:3000"])

    # Computed flags
    USE_LOCAL_STORAGE: bool = False

    def __post_init__(self):
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
        self.DATABASE_URL = os.getenv("DATABASE_URL", "")
        self.CLOUDINARY_URL = os.getenv("CLOUDINARY_URL", "")
        self.GEMINI_EMBEDDING_MODEL = os.getenv(
            "GEMINI_EMBEDDING_MODEL", "models/text-embedding-004"
        )
        self.MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "10"))

        cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
        self.CORS_ORIGINS = [origin.strip() for origin in cors_raw.split(",")]

        # Determine fallback modes
        self.USE_LOCAL_STORAGE = not self.CLOUDINARY_URL

    def validate(self):
        """Validate required settings. Raises ValueError if missing."""
        errors = []
        if not self.GEMINI_API_KEY:
            errors.append("GEMINI_API_KEY is required")
        if not self.DATABASE_URL:
            errors.append("DATABASE_URL is required (Neon Postgres connection string)")
        if errors:
            raise ValueError(
                "Missing required environment variables:\n"
                + "\n".join(f"  - {e}" for e in errors)
            )

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


# Singleton instance
settings = Settings()
