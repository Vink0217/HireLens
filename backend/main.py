"""
HireLens API — FastAPI entry point.

Run with: uv run uvicorn main:app --reload --port 8000
Docs at:  http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="HireLens API",
    description="AI-powered resume screening and ranking system",
    version="0.1.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Health check endpoint for deployment verification."""
    return {"status": "ok", "service": "hirelens-backend"}
