"""
Batch re-parse task — re-extracts data when extraction config changes.

Triggered as a FastAPI BackgroundTask from the /configs/{id}/rescan endpoint.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Callable

import asyncpg

from db.resumes import update_extracted_data
from db.configs import get_config
from db.screenings import update_screening
from services.llm.extractor import extract_fields
from services.llm.scorer import score_resume

logger = logging.getLogger(__name__)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def batch_reparse(
    pool: asyncpg.Pool,
    config_id: str,
    progress_callback: Callable[[dict], None] | None = None,
) -> list[dict]:
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
        if progress_callback:
            progress_callback(
                {
                    "status": "failed",
                    "message": "Config not found for rescan",
                    "completed_at": _utc_now_iso(),
                }
            )
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
    processed = 0
    success = 0
    failed = 0

    if progress_callback:
        progress_callback(
            {
                "status": "running",
                "message": "Re-extraction in progress",
                "total": len(rows),
                "processed": 0,
                "success": 0,
                "failed": 0,
                "started_at": _utc_now_iso(),
                "completed_at": None,
            }
        )

    for row in rows:
        resume_id = str(row["id"])
        try:
            extracted = await extract_fields(row["raw_text"], fields)
            await update_extracted_data(pool, resume_id, extracted)

            # Re-score every existing screening tied to this resume so visible
            # ranking cards and summaries stay in sync with refreshed extraction.
            screening_rows = await pool.fetch(
                """
                SELECT s.job_id, j.description AS jd_text
                FROM screenings s
                JOIN jobs j ON j.id = s.job_id
                WHERE s.resume_id = $1
                """,
                row["id"],
            )

            for screening_row in screening_rows:
                job_id = str(screening_row["job_id"])
                jd_text = screening_row["jd_text"] or ""
                scoring_result = await score_resume(
                    resume_text=row["raw_text"],
                    jd_text=jd_text,
                    extracted=extracted,
                )
                await update_screening(
                    pool,
                    resume_id=resume_id,
                    job_id=job_id,
                    score=scoring_result["score"],
                    summary=scoring_result["summary"],
                    strengths=scoring_result["strengths"],
                    gaps=scoring_result["gaps"],
                    confidence=scoring_result["confidence"],
                    confidence_reason=scoring_result["confidence_reason"],
                    raw_llm_response=scoring_result,
                )

            results.append({"resume_id": resume_id, "status": "ok"})
            logger.info("Re-parsed and re-scored resume %s", resume_id)
            success += 1
        except Exception as e:
            results.append({"resume_id": resume_id, "status": f"error: {e}"})
            logger.error("Failed to re-parse resume %s: %s", resume_id, e)
            failed += 1

        processed += 1
        if progress_callback:
            progress_callback(
                {
                    "status": "running",
                    "message": "Re-extraction in progress",
                    "total": len(rows),
                    "processed": processed,
                    "success": success,
                    "failed": failed,
                    "completed_at": None,
                }
            )

    logger.info("Batch reparse complete: %d/%d succeeded",
                sum(1 for r in results if r["status"] == "ok"), len(results))

    if progress_callback:
        progress_callback(
            {
                "status": "completed",
                "message": "Re-extraction complete",
                "total": len(rows),
                "processed": processed,
                "success": success,
                "failed": failed,
                "completed_at": _utc_now_iso(),
            }
        )

    return results
