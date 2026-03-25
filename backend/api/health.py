"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Health check for deployment verification."""
    return {"status": "ok", "service": "hirelens-backend"}
