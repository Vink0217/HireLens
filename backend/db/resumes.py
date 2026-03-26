"""
Database operations for resumes table.
Includes duplicate detection via SHA-256 content hash.
"""

from __future__ import annotations

import hashlib
import json
from uuid import UUID

import asyncpg


def generate_content_hash(raw_text: str, job_id: str) -> str:
    """
    Generate SHA-256 hash of (normalized_text + job_id).

    Same resume for a DIFFERENT job is NOT a duplicate.
    This is intentional — a candidate can apply to multiple roles.
    """
    normalized = " ".join(raw_text.lower().split())  # normalize whitespace/case
    content = f"{normalized}:{job_id}"
    return hashlib.sha256(content.encode()).hexdigest()


async def check_duplicate(
    pool: asyncpg.Pool, content_hash: str
) -> dict | None:
    """
    Check if a resume with this content hash already exists.
    Returns the existing resume + screening info if found, else None.
    """
    row = await pool.fetchrow(
        """
        SELECT r.id, r.file_name, r.created_at,
               s.score, s.summary, s.created_at AS screened_at
        FROM resumes r
        LEFT JOIN screenings s ON s.resume_id = r.id
        WHERE r.content_hash = $1
        LIMIT 1
        """,
        content_hash,
    )
    return dict(row) if row else None


async def save_resume(
    pool: asyncpg.Pool,
    *,
    file_name: str,
    file_url: str,
    file_size: int,
    file_type: str,
    raw_text: str,
    content_hash: str,
    extracted_data: dict | None = None,
    config_id: str | None = None,
) -> dict:
    """Save a parsed resume to the database."""
    row = await pool.fetchrow(
        """
        INSERT INTO resumes (
            file_name, file_url, file_size, file_type,
            raw_text, content_hash, extracted_data, config_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, file_name, file_url, file_size, file_type,
                  content_hash, extracted_data, config_id, created_at
        """,
        file_name,
        file_url,
        file_size,
        file_type,
        raw_text,
        content_hash,
        json.dumps(extracted_data) if extracted_data else None,
        UUID(config_id) if config_id else None,
    )
    return dict(row)


async def get_resume(pool: asyncpg.Pool, resume_id: str) -> dict | None:
    """Get a single resume with all its screenings."""
    row = await pool.fetchrow(
        """
        SELECT id, file_name, file_url, file_size, file_type,
               raw_text, content_hash, extracted_data, config_id, created_at
        FROM resumes WHERE id = $1
        """,
        UUID(resume_id),
    )
    return dict(row) if row else None


async def list_resumes_for_job(
    pool: asyncpg.Pool, job_id: str
) -> list[dict]:
    """
    List all resumes screened for a job, sorted by score descending.
    Joins with screenings to include score data.
    """
    rows = await pool.fetch(
        """
        SELECT
            r.id, r.file_name, r.file_url, r.file_type,
            r.extracted_data, r.created_at,
            s.score, s.summary, s.strengths, s.gaps,
            s.confidence, s.created_at AS screened_at
        FROM resumes r
        JOIN screenings s ON s.resume_id = r.id
        WHERE s.job_id = $1
        ORDER BY s.score DESC
        """,
        UUID(job_id),
    )
    return [dict(row) for row in rows]


async def list_all_resumes(pool: asyncpg.Pool) -> list[dict]:
    """
    List ALL resumes across the entire system.
    Joins with jobs so we know what they applied for.
    """
    rows = await pool.fetch(
        """
        SELECT
            r.id, r.file_name, r.file_url, r.file_type,
            r.extracted_data, r.created_at,
            s.score, s.summary, s.strengths, s.gaps,
            s.confidence, s.created_at AS screened_at,
            j.id AS job_id, j.title AS job_title, j.company AS job_company
        FROM resumes r
        LEFT JOIN screenings s ON s.resume_id = r.id
        LEFT JOIN jobs j ON s.job_id = j.id
        ORDER BY r.created_at DESC
        """
    )
    return [dict(row) for row in rows]


async def update_extracted_data(
    pool: asyncpg.Pool,
    resume_id: str,
    extracted_data: dict,
) -> None:
    """Update the extracted_data for a resume (used during re-parsing)."""
    await pool.execute(
        """
        UPDATE resumes SET extracted_data = $1 WHERE id = $2
        """,
        json.dumps(extracted_data),
        UUID(resume_id),
    )
