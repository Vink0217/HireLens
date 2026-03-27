"""
Database operations for screenings table.
One screening = one (resume × job) scoring result.
"""

from __future__ import annotations

import json
from uuid import UUID

import asyncpg


async def save_screening(
    pool: asyncpg.Pool,
    *,
    resume_id: str,
    job_id: str,
    score: int,
    summary: str,
    strengths: list[str],
    gaps: list[str],
    confidence: str,
    confidence_reason: str,
    raw_llm_response: dict | None = None,
) -> dict:
    """Save a screening result. Unique on (resume_id, job_id)."""
    row = await pool.fetchrow(
        """
        INSERT INTO screenings (
            resume_id, job_id, score, summary,
            strengths, gaps, confidence, confidence_reason,
            raw_llm_response
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, resume_id, job_id, score, summary,
                  strengths, gaps, confidence, confidence_reason,
                  created_at
        """,
        UUID(resume_id),
        UUID(job_id),
        score,
        summary,
        strengths,
        gaps,
        confidence,
        confidence_reason,
        json.dumps(raw_llm_response) if raw_llm_response else None,
    )
    return dict(row)


async def update_screening(
    pool: asyncpg.Pool,
    *,
    resume_id: str,
    job_id: str,
    score: int,
    summary: str,
    strengths: list[str],
    gaps: list[str],
    confidence: str,
    confidence_reason: str,
    raw_llm_response: dict | None = None,
) -> dict:
    """Update an existing screening result for a specific resume × job pair."""
    row = await pool.fetchrow(
        """
        UPDATE screenings
        SET
            score = $3,
            summary = $4,
            strengths = $5,
            gaps = $6,
            confidence = $7,
            confidence_reason = $8,
            raw_llm_response = $9,
            created_at = NOW()
        WHERE resume_id = $1 AND job_id = $2
        RETURNING id, resume_id, job_id, score, summary,
                  strengths, gaps, confidence, confidence_reason,
                  created_at
        """,
        UUID(resume_id),
        UUID(job_id),
        score,
        summary,
        strengths,
        gaps,
        confidence,
        confidence_reason,
        json.dumps(raw_llm_response) if raw_llm_response else None,
    )
    return dict(row) if row else None


async def get_screening(
    pool: asyncpg.Pool, resume_id: str, job_id: str
) -> dict | None:
    """Get a screening result for a specific resume × job pair."""
    row = await pool.fetchrow(
        """
        SELECT id, resume_id, job_id, score, summary,
               strengths, gaps, confidence, confidence_reason,
               raw_llm_response, created_at
        FROM screenings
        WHERE resume_id = $1 AND job_id = $2
        """,
        UUID(resume_id),
        UUID(job_id),
    )
    return dict(row) if row else None


async def list_screenings_for_job(
    pool: asyncpg.Pool, job_id: str
) -> list[dict]:
    """
    List all screenings for a job, sorted by score descending.
    Joins with resumes to include candidate info.
    """
    rows = await pool.fetch(
        """
        SELECT
            s.id, s.resume_id, s.score, s.summary,
            s.strengths, s.gaps, s.confidence,
            s.confidence_reason, s.created_at,
            r.file_name, r.extracted_data
        FROM screenings s
        JOIN resumes r ON r.id = s.resume_id
        WHERE s.job_id = $1
        ORDER BY s.score DESC
        """,
        UUID(job_id),
    )
    return [dict(row) for row in rows]
