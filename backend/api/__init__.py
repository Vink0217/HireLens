"""API package — all FastAPI routers."""

from api.health import router as health_router
from api.jobs import router as jobs_router
from api.resumes import router as resumes_router
from api.configs import router as configs_router

__all__ = ["health_router", "jobs_router", "resumes_router", "configs_router"]
