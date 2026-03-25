"""
Database operations for jobs table.
"""

from __future__ import annotations

import json
from uuid import UUID

import asyncpg


async def create_job(
    pool: asyncpg.Pool,
    title: str,
    description: str,
    company: str | None = None,
) -> dict:
    """Create a new job description and return it."""
    row = await pool.fetchrow(
        """
        INSERT INTO jobs (title, company, description)
        VALUES ($1, $2, $3)
        RETURNING id, title, company, description, created_at
        """,
        title,
        company,
        description,
    )
    return dict(row)


async def list_jobs(pool: asyncpg.Pool) -> list[dict]:
    """
    List all jobs, ordered newest first.
    Includes resume_count and top_score for each job.
    """
    rows = await pool.fetch(
        """
        SELECT
            j.id, j.title, j.company, j.description, j.created_at,
            COUNT(DISTINCT s.resume_id) AS resume_count,
            COALESCE(MAX(s.score), 0)   AS top_score
        FROM jobs j
        LEFT JOIN screenings s ON s.job_id = j.id
        GROUP BY j.id
        ORDER BY j.created_at DESC
        """
    )
    return [dict(row) for row in rows]


async def get_job(pool: asyncpg.Pool, job_id: str) -> dict | None:
    """Get a single job by ID. Returns None if not found."""
    row = await pool.fetchrow(
        """
        SELECT id, title, company, description, created_at
        FROM jobs WHERE id = $1
        """,
        UUID(job_id),
    )
    return dict(row) if row else None


async def delete_job(pool: asyncpg.Pool, job_id: str) -> bool:
    """Delete a job by ID. Returns True if deleted."""
    result = await pool.execute(
        "DELETE FROM jobs WHERE id = $1",
        UUID(job_id),
    )
    return result == "DELETE 1"
