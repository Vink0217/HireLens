"""
HireLens API — FastAPI entry point.

Run with: uv run uvicorn main:app --reload --port 8000
Docs at:  http://localhost:8000/docs
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from db.connection import init_pool, close_pool
from db.configs import seed_default_config
from services.storage import init_storage

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan — runs on startup and shutdown.

    Startup: connect DB pool, init storage, seed defaults.
    Shutdown: close DB pool gracefully.
    """
    # ── Startup ────────────────────────────────────────────
    logging.basicConfig(level=logging.INFO)
    logger.info("Starting HireLens API...")

    # Validate config (warn but don't crash — allows health checks)
    try:
        settings.validate()
    except ValueError as e:
        logger.warning("Config validation: %s", e)

    # Database
    if settings.DATABASE_URL:
        pool = await init_pool(settings.DATABASE_URL)
        await seed_default_config(pool)
        logger.info("Database connected and seeded.")
    else:
        logger.warning("DATABASE_URL not set — DB features disabled.")

    # Storage
    init_storage()

    yield  # ← App runs here

    # ── Shutdown ───────────────────────────────────────────
    await close_pool()
    logger.info("HireLens API shut down.")


app = FastAPI(
    title="HireLens API",
    description="AI-powered resume screening and ranking system",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ───────────────────────────────────────
from api.health import router as health_router
from api.jobs import router as jobs_router
from api.resumes import router as resumes_router
from api.configs import router as configs_router

app.include_router(health_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(resumes_router, prefix="/api")
app.include_router(configs_router, prefix="/api")
