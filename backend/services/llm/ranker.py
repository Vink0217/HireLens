"""
Multi-role ranker — scores one resume against multiple JDs in parallel.

Good-to-Have #1 from the assignment spec.
"""

import asyncio
import logging

from services.llm.scorer import score_resume
from db import get_pool
from db.jobs import get_job
from db.resumes import get_resume

logger = logging.getLogger(__name__)


async def rank_against_jobs(
    resume_id: str, job_ids: list[str]
) -> list[dict]:
    """
    Score a single resume against multiple job descriptions in parallel.

    Uses asyncio.gather() for concurrency — does NOT run JDs sequentially.

    Args:
        resume_id: UUID of the resume to score.
        job_ids: List of job UUIDs to score against.

    Returns:
        List of scoring results, one per JD, sorted by score descending.
        Each item: {job_id, job_title, score, summary, strengths, gaps}
    """
    pool = get_pool()

    # Load the resume
    resume = await get_resume(pool, resume_id)
    if not resume:
        raise ValueError(f"Resume {resume_id} not found")

    # Load all JDs
    jobs = []
    for jid in job_ids:
        job = await get_job(pool, jid)
        if job:
            jobs.append(job)
        else:
            logger.warning("Job %s not found, skipping", jid)

    if not jobs:
        raise ValueError("No valid job IDs provided")

    # Score in parallel
    async def _score_one(job: dict) -> dict:
        max_attempts = 3
        try:
            last_error = None
            for attempt in range(1, max_attempts + 1):
                try:
                    result = await score_resume(
                        resume_text=resume["raw_text"],
                        jd_text=job["description"],
                        extracted=resume.get("extracted_data") or {},
                    )
                    break
                except Exception as e:
                    last_error = e
                    message = str(e)
                    is_retryable = "503" in message or "UNAVAILABLE" in message
                    if not is_retryable or attempt == max_attempts:
                        raise

                    # Short exponential-ish backoff for temporary model saturation.
                    await asyncio.sleep(attempt * 1.2)

            if not isinstance(result, dict):
                raise RuntimeError(f"Unexpected scoring result: {last_error}")

            return {
                "job_id": str(job["id"]),
                "job_title": job["title"],
                **result,
            }
        except Exception as e:
            logger.error("Scoring failed for job %s: %s", job["id"], e)
            return {
                "job_id": str(job["id"]),
                "job_title": job["title"],
                "score": 0,
                "summary": f"Scoring failed: {e}",
                "strengths": [],
                "gaps": [],
                "confidence": "low",
                "confidence_reason": "Scoring encountered an error.",
            }

    results = await asyncio.gather(*[_score_one(job) for job in jobs])

    # Sort by score descending
    return sorted(results, key=lambda r: r["score"], reverse=True)
