"""
Database connection pool — asyncpg-based connection to Neon PostgreSQL.

Usage:
    from db.connection import init_pool, get_pool, close_pool

    # In FastAPI lifespan:
    pool = await init_pool(settings.DATABASE_URL)
    # ... app runs ...
    await close_pool()
"""

import logging

import asyncpg

logger = logging.getLogger(__name__)

# Module-level pool singleton
_pool: asyncpg.Pool | None = None


async def init_pool(database_url: str) -> asyncpg.Pool:
    """
    Create and return a connection pool.

    Args:
        database_url: PostgreSQL connection string
                      e.g. "postgresql://user:pass@host/dbname?sslmode=require"

    Returns:
        asyncpg.Pool ready for queries.
    """
    global _pool
    logger.info("Initializing database connection pool...")
    _pool = await asyncpg.create_pool(
        database_url,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )
    logger.info("Database pool created (min=2, max=10)")
    return _pool


def get_pool() -> asyncpg.Pool:
    """
    Get the active connection pool.

    Raises:
        RuntimeError: If init_pool() hasn't been called yet.
    """
    if _pool is None:
        raise RuntimeError(
            "Database pool not initialized. Call init_pool() first."
        )
    return _pool


async def close_pool():
    """Gracefully close the connection pool."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("Database pool closed.")
