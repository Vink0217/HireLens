"""Job description CRUD endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_pool
from db.jobs import create_job, list_jobs, get_job, delete_job
from db.screenings import list_screenings_for_job

router = APIRouter(prefix="/jobs", tags=["jobs"])


# ── Request / Response Models ──────────────────────────────


class JobCreate(BaseModel):
    title: str
    description: str
    company: str | None = None


class JobResponse(BaseModel):
    id: str
    title: str
    company: str | None
    description: str
    created_at: str

    class Config:
        from_attributes = True


# ── Routes ─────────────────────────────────────────────────


@router.post("", response_model=None, status_code=201)
async def create_job_endpoint(body: JobCreate):
    """Create a new job description."""
    pool = get_pool()
    job = await create_job(
        pool,
        title=body.title,
        description=body.description,
        company=body.company,
    )
    return _serialize(job)


@router.get("")
async def list_jobs_endpoint():
    """List all jobs with resume count and top score."""
    pool = get_pool()
    jobs = await list_jobs(pool)
    return [_serialize(j) for j in jobs]


@router.get("/{job_id}")
async def get_job_endpoint(job_id: str):
    """Get a job with its screened candidates."""
    pool = get_pool()
    job = await get_job(pool, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    screenings = await list_screenings_for_job(pool, job_id)
    return {
        **_serialize(job),
        "candidates": [_serialize(s) for s in screenings],
    }


@router.delete("/{job_id}", status_code=204)
async def delete_job_endpoint(job_id: str):
    """Delete a job description."""
    pool = get_pool()
    deleted = await delete_job(pool, job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found")


# ── Helpers ────────────────────────────────────────────────


def _serialize(row: dict) -> dict:
    """Convert UUID/datetime values to strings for JSON serialization."""
    return {
        k: str(v) if hasattr(v, "hex") or hasattr(v, "isoformat") else v
        for k, v in row.items()
    }
