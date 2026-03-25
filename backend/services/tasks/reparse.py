"""
Batch re-parse task — re-extracts data when extraction config changes.

Triggered as a FastAPI BackgroundTask from the /configs/{id}/rescan endpoint.
"""

import json
import logging

import asyncpg

from db.resumes import update_extracted_data
from db.configs import get_config
from services.llm.extractor import extract_fields

logger = logging.getLogger(__name__)


async def batch_reparse(pool: asyncpg.Pool, config_id: str) -> list[dict]:
    """
    Re-extract data for all resumes linked to a given config.

    Args:
        pool: Database connection pool.
        config_id: UUID of the extraction config to use.

    Returns:
        List of {resume_id, status} results.
    """
    config = await get_config(pool, config_id)
    if not config:
        logger.error("Config %s not found for reparse", config_id)
        return []

    fields = config["fields"]
    if isinstance(fields, str):
        fields = json.loads(fields)

    # Fetch all resumes using this config
    rows = await pool.fetch(
        "SELECT id, raw_text FROM resumes WHERE config_id = $1",
        config["id"],
    )

    logger.info("Re-parsing %d resumes with config '%s'", len(rows), config["name"])
    results = []

    for row in rows:
        resume_id = str(row["id"])
        try:
            extracted = await extract_fields(row["raw_text"], fields)
            await update_extracted_data(pool, resume_id, extracted)
            results.append({"resume_id": resume_id, "status": "ok"})
            logger.info("Re-parsed resume %s", resume_id)
        except Exception as e:
            results.append({"resume_id": resume_id, "status": f"error: {e}"})
            logger.error("Failed to re-parse resume %s: %s", resume_id, e)

    logger.info("Batch reparse complete: %d/%d succeeded",
                sum(1 for r in results if r["status"] == "ok"), len(results))
    return results
