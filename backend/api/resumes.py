"""
Resume upload, parsing, screening, and retrieval endpoints.

This is the CORE pipeline of HireLens:
  Upload → Parse → Dedup → Store → Extract → Score → Return
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from uuid import UUID
import mimetypes
import math
import re
from pathlib import Path
from urllib.request import urlopen

from core.config import settings
from db import get_pool
from db.resumes import (
    save_resume,
    check_duplicate,
    get_resume,
    get_resume,
    list_resumes_for_job,
    list_all_resumes,
    generate_content_hash,
)
from db.configs import get_default_config, get_config
from db.screenings import save_screening, get_screening
from parsers import parse_pdf, parse_docx
from services.llm.extractor import extract_fields
from services.llm.scorer import score_resume
from services.llm.ranker import rank_against_jobs
from services.llm.embedder import chunk_resume, embed_text
from services.storage import upload_file

router = APIRouter(prefix="/resumes", tags=["resumes"])


# ── Request / Response Models ──────────────────────────────


class MultiRoleRequest(BaseModel):
    resume_id: str
    job_ids: list[str]


# ── Core Pipeline ──────────────────────────────────────────


@router.post("/upload", status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    job_id: str = Form(...),
    config_id: str | None = Form(None),
):
    """
    Upload a resume and run the full screening pipeline.

    Steps:
    1. Validate file size and type
    2. Parse text (PDF or DOCX)
    3. Check for duplicates
    4. Upload to storage (Cloudinary / local)
    5. Extract structured fields via Gemini
    6. Score against job description
    7. Save everything to DB
    """
    # ── Step 1: Validate ───────────────────────────────────
    file_bytes = await file.read()
    file_size = len(file_bytes)

    if file_size > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE_MB}MB",
        )

    file_name = file.filename or "unknown"
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""

    if ext not in ("pdf", "docx"):
        raise HTTPException(
            status_code=400,
            detail="Only .pdf and .docx files are supported",
        )

    # ── Step 2: Parse ──────────────────────────────────────
    try:
        if ext == "pdf":
            raw_text = parse_pdf(file_bytes)
        else:
            raw_text = parse_docx(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {e}")

    # ── Step 3: Duplicate check ────────────────────────────
    pool = get_pool()
    content_hash = generate_content_hash(raw_text, job_id)
    existing = await check_duplicate(pool, content_hash)

    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "This resume has already been screened for this job",
                "existing_resume_id": str(existing["id"]),
                "file_name": existing["file_name"],
                "score": existing.get("score"),
            },
        )

    # ── Step 4: Upload to storage ──────────────────────────
    file_url = await upload_file(file_bytes, file_name)

    # ── Step 5: Extract fields ─────────────────────────────
    config = None
    if config_id:
        config = await get_config(pool, config_id)
    if not config:
        config = await get_default_config(pool)

    if not config:
        raise HTTPException(
            status_code=500,
            detail="No extraction config found. Please create one first.",
        )

    import json
    fields = config["fields"]
    if isinstance(fields, str):
        fields = json.loads(fields)

    extracted_data = await extract_fields(raw_text, fields)

    import asyncpg
    
    # ── Step 6: Save resume ────────────────────────────────
    try:
        resume = await save_resume(
            pool,
            file_name=file_name,
            file_url=file_url,
            file_size=file_size,
            file_type=ext,
            raw_text=raw_text,
            content_hash=content_hash,
            extracted_data=extracted_data,
            config_id=str(config["id"]) if config else None,
        )
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(
            status_code=409, detail="Duplicate resume upload detected during concurrent DB transaction."
        )

    # ── Step 7: Score against JD ───────────────────────────
    from db.jobs import get_job

    job = await get_job(pool, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    scoring_result = await score_resume(
        resume_text=raw_text,
        jd_text=job["description"],
        extracted=extracted_data,
    )

    # ── Step 8: Save screening ─────────────────────────────
    screening = await save_screening(
        pool,
        resume_id=str(resume["id"]),
        job_id=job_id,
        score=scoring_result["score"],
        summary=scoring_result["summary"],
        strengths=scoring_result["strengths"],
        gaps=scoring_result["gaps"],
        confidence=scoring_result["confidence"],
        confidence_reason=scoring_result["confidence_reason"],
        raw_llm_response=scoring_result,
    )

    return {
        "resume": _serialize(resume),
        "screening": _serialize(screening),
        "extracted_data": extracted_data,
    }


# ── Query Endpoints ────────────────────────────────────────


@router.get("")
async def list_resumes(job_id: str | None = None):
    """List all resumes, optionally filtered by job_id."""
    pool = get_pool()
    if job_id:
        resumes = await list_resumes_for_job(pool, job_id)
    else:
        resumes = await list_all_resumes(pool)
    return [_serialize(r) for r in resumes]


@router.get("/{resume_id}")
async def get_resume_endpoint(resume_id: str):
    """Get full resume details."""
    pool = get_pool()
    resume = await get_resume(pool, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return _serialize(resume)


@router.get("/{resume_id}/download")
async def download_resume_endpoint(resume_id: str):
    """Download resume with a proper filename and content type."""
    pool = get_pool()
    resume = await get_resume(pool, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    file_url = resume.get("file_url")
    if not file_url:
        raise HTTPException(status_code=404, detail="Resume file URL not found")

    file_name = resume.get("file_name") or f"resume-{resume_id}"
    ext = (resume.get("file_type") or "").lower()
    if ext and not file_name.lower().endswith(f".{ext}"):
        file_name = f"{file_name}.{ext}"

    content_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"

    try:
        if str(file_url).startswith("http"):
            with urlopen(str(file_url)) as response:
                content = response.read()
        else:
            local_path = Path(str(file_url))
            if not local_path.exists():
                raise FileNotFoundError(str(local_path))
            content = local_path.read_bytes()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch resume file: {e}")

    headers = {
        "Content-Disposition": f'attachment; filename="{file_name}"',
        "Cache-Control": "no-store",
    }
    return StreamingResponse(iter([content]), media_type=content_type, headers=headers)


@router.get("/{resume_id}/rag-evidence")
async def rag_evidence_endpoint(resume_id: str, job_id: str, top_k: int = 5):
    """Return top resume chunks most relevant to the selected job description."""
    pool = get_pool()
    resume = await get_resume(pool, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    from db.jobs import get_job

    job = await get_job(pool, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    raw_text = resume.get("raw_text") or ""
    if not raw_text.strip():
        return {"resume_id": resume_id, "job_id": job_id, "chunks": []}

    chunks = chunk_resume(raw_text, resume_id)
    if not chunks:
        return {"resume_id": resume_id, "job_id": job_id, "chunks": []}

    # Keep runtime practical for on-demand UI by embedding only a limited set of chunks.
    limited_chunks = chunks[:20]
    jd_text = job.get("description") or ""

    if not jd_text.strip():
        return {"resume_id": resume_id, "job_id": job_id, "chunks": []}

    try:
        jd_embedding = await embed_text(jd_text)
        ranked: list[dict] = []

        for item in limited_chunks:
            chunk_text = (item.get("chunk_text") or "").strip()
            if not chunk_text:
                continue

            chunk_embedding = await embed_text(chunk_text)
            similarity = _cosine_similarity(jd_embedding, chunk_embedding)
            ranked.append(
                {
                    "chunk_type": item.get("chunk_type", "other"),
                    "chunk_text": chunk_text,
                    "similarity": round(similarity, 4),
                }
            )

        ranked.sort(key=lambda row: row["similarity"], reverse=True)
        return {"resume_id": resume_id, "job_id": job_id, "chunks": ranked[:max(1, min(top_k, 10))]}

    except Exception:
        # Fallback lexical ranking if embedding service is unavailable.
        job_terms = set(_tokenize(jd_text))
        ranked: list[dict] = []

        for item in limited_chunks:
            chunk_text = (item.get("chunk_text") or "").strip()
            if not chunk_text:
                continue
            terms = set(_tokenize(chunk_text))
            overlap = len(job_terms & terms)
            similarity = overlap / max(1, len(job_terms))
            ranked.append(
                {
                    "chunk_type": item.get("chunk_type", "other"),
                    "chunk_text": chunk_text,
                    "similarity": round(similarity, 4),
                }
            )

        ranked.sort(key=lambda row: row["similarity"], reverse=True)
        return {"resume_id": resume_id, "job_id": job_id, "chunks": ranked[:max(1, min(top_k, 10))]}


@router.post("/multi-role")
async def multi_role_screening(body: MultiRoleRequest):
    """Score a single resume against multiple job descriptions."""
    results = await rank_against_jobs(body.resume_id, body.job_ids)
    return results


@router.delete("/{resume_id}")
async def delete_resume_endpoint(resume_id: str):
    """Delete a resume and all its screenings via CASCADE."""
    pool = get_pool()
    
    # Validate UUID format
    try:
        uuid_val = UUID(resume_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Resume ID format")
    
    row = await pool.fetchrow("SELECT id FROM resumes WHERE id = $1", uuid_val)
    if not row:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    await pool.execute("DELETE FROM resumes WHERE id = $1", uuid_val)
    return {"message": "Resume deleted successfully"}


# ── Helpers ────────────────────────────────────────────────


def _serialize(row: dict) -> dict:
    """Convert UUID/datetime values to strings for JSON serialization."""
    return {
        k: str(v) if hasattr(v, "hex") or hasattr(v, "isoformat") else v
        for k, v in row.items()
    }


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    size = min(len(a), len(b))
    if size == 0:
        return 0.0

    dot = 0.0
    mag_a = 0.0
    mag_b = 0.0
    for i in range(size):
        av = float(a[i])
        bv = float(b[i])
        dot += av * bv
        mag_a += av * av
        mag_b += bv * bv

    denom = math.sqrt(mag_a) * math.sqrt(mag_b)
    if denom == 0:
        return 0.0
    return dot / denom


def _tokenize(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-zA-Z]{3,}", text.lower()) if t]
