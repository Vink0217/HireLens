"""Extraction config CRUD endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from db import get_pool
from db.configs import (
    create_config,
    list_configs,
    get_config,
    update_config,
)

router = APIRouter(prefix="/configs", tags=["configs"])


# In-memory tracking for rescan progress per config.
# Note: status resets on backend restart.
_rescan_status: dict[str, dict] = {}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Request / Response Models ──────────────────────────────


class ConfigCreate(BaseModel):
    name: str
    fields: list[dict]
    is_default: bool = False


class ConfigUpdate(BaseModel):
    name: str
    fields: list[dict]


# ── Routes ─────────────────────────────────────────────────


@router.post("", status_code=201)
async def create_config_endpoint(body: ConfigCreate):
    """Create a new extraction config."""
    pool = get_pool()
    config = await create_config(
        pool,
        name=body.name,
        fields=body.fields,
        is_default=body.is_default,
    )
    return _serialize(config)


@router.get("")
async def list_configs_endpoint():
    """List all extraction configs (default first)."""
    pool = get_pool()
    configs = await list_configs(pool)
    return [_serialize(c) for c in configs]


@router.get("/{config_id}")
async def get_config_endpoint(config_id: str):
    """Get a single extraction config."""
    pool = get_pool()
    config = await get_config(pool, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return _serialize(config)


@router.put("/{config_id}")
async def update_config_endpoint(config_id: str, body: ConfigUpdate):
    """Update an extraction config's name and fields."""
    pool = get_pool()
    config = await update_config(pool, config_id, body.name, body.fields)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return _serialize(config)


@router.post("/{config_id}/rescan")
async def rescan_resumes(config_id: str, background_tasks: BackgroundTasks):
    """
    Trigger a batch re-extraction and re-scoring for resumes using this config.

    Runs as a FastAPI background task so the request returns immediately.
    """
    pool = get_pool()
    config = await get_config(pool, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    from services.tasks.reparse import batch_reparse

    _rescan_status[config_id] = {
        "config_id": config_id,
        "status": "queued",
        "message": "Re-extraction and re-scoring queued",
        "total": 0,
        "processed": 0,
        "success": 0,
        "failed": 0,
        "started_at": _utc_now_iso(),
        "completed_at": None,
    }

    def _update_progress(update: dict) -> None:
        current = _rescan_status.get(config_id, {"config_id": config_id})
        current.update(update)
        _rescan_status[config_id] = current

    background_tasks.add_task(batch_reparse, pool, config_id, _update_progress)

    return {
        "message": "Re-extraction and re-scoring started in background",
        "config_id": config_id,
    }


@router.get("/{config_id}/rescan-status")
async def get_rescan_status(config_id: str):
    """Return latest known reparse status for a config."""
    status = _rescan_status.get(config_id)
    if not status:
        return {
            "config_id": config_id,
            "status": "idle",
            "message": "No rescan has been triggered yet",
            "total": 0,
            "processed": 0,
            "success": 0,
            "failed": 0,
            "started_at": None,
            "completed_at": None,
        }
    return status


# ── Helpers ────────────────────────────────────────────────


def _serialize(row: dict) -> dict:
    """Convert UUID/datetime values to strings for JSON serialization."""
    return {
        k: str(v) if hasattr(v, "hex") or hasattr(v, "isoformat") else v
        for k, v in row.items()
    }
