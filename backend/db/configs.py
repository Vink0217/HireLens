"""
Database operations for extraction_configs table.
Manages named extraction field configurations.
"""

from __future__ import annotations

import json
from uuid import UUID

import asyncpg

# Default extraction fields — seeded on first run
DEFAULT_FIELDS = [
    {"key": "name", "label": "Full Name", "required": True, "type": "string"},
    {"key": "email", "label": "Email Address", "required": True, "type": "string"},
    {"key": "phone", "label": "Phone Number", "required": False, "type": "string"},
    {"key": "years_of_experience", "label": "Years of Experience", "type": "integer", "required": True},
    {"key": "primary_skills", "label": "Primary Skills", "type": "array", "required": True},
    {"key": "last_job_title", "label": "Last Job Title", "required": True, "type": "string"},
    {"key": "last_company", "label": "Last Company", "required": False, "type": "string"},
    {"key": "education", "label": "Highest Education", "required": False, "type": "string"},
    {"key": "location", "label": "Current Location", "required": False, "type": "string"},
]


async def seed_default_config(pool: asyncpg.Pool) -> None:
    """Insert the default extraction config if none exists."""
    existing = await pool.fetchval(
        "SELECT COUNT(*) FROM extraction_configs WHERE is_default = true"
    )
    if existing == 0:
        await pool.execute(
            """
            INSERT INTO extraction_configs (name, fields, is_default)
            VALUES ($1, $2, true)
            """,
            "Default Config",
            json.dumps(DEFAULT_FIELDS),
        )


async def create_config(
    pool: asyncpg.Pool,
    name: str,
    fields: list[dict],
    is_default: bool = False,
) -> dict:
    """Create a new extraction config."""
    # If setting as default, unset any existing default first
    if is_default:
        await pool.execute(
            "UPDATE extraction_configs SET is_default = false WHERE is_default = true"
        )

    row = await pool.fetchrow(
        """
        INSERT INTO extraction_configs (name, fields, is_default)
        VALUES ($1, $2, $3)
        RETURNING id, name, fields, is_default, created_at, updated_at
        """,
        name,
        json.dumps(fields),
        is_default,
    )
    return dict(row)


async def list_configs(pool: asyncpg.Pool) -> list[dict]:
    """List all extraction configs, default first."""
    rows = await pool.fetch(
        """
        SELECT id, name, fields, is_default, created_at, updated_at
        FROM extraction_configs
        ORDER BY is_default DESC, created_at DESC
        """
    )
    return [dict(row) for row in rows]


async def get_config(pool: asyncpg.Pool, config_id: str) -> dict | None:
    """Get a single config by ID."""
    row = await pool.fetchrow(
        """
        SELECT id, name, fields, is_default, created_at, updated_at
        FROM extraction_configs WHERE id = $1
        """,
        UUID(config_id),
    )
    return dict(row) if row else None


async def get_default_config(pool: asyncpg.Pool) -> dict | None:
    """Get the default extraction config."""
    row = await pool.fetchrow(
        """
        SELECT id, name, fields, is_default, created_at, updated_at
        FROM extraction_configs WHERE is_default = true
        LIMIT 1
        """
    )
    return dict(row) if row else None


async def update_config(
    pool: asyncpg.Pool,
    config_id: str,
    name: str,
    fields: list[dict],
) -> dict | None:
    """Update config name and fields."""
    row = await pool.fetchrow(
        """
        UPDATE extraction_configs
        SET name = $1, fields = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, name, fields, is_default, created_at, updated_at
        """,
        name,
        json.dumps(fields),
        UUID(config_id),
    )
    return dict(row) if row else None
