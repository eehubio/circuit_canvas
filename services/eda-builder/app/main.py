from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.jobs import router as jobs_router
from app.api.uploads import router as uploads_router
from app.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Circuit Canvas EDA Asset Builder",
        version="0.1.0",
        description="Phase 2 modular monolith skeleton for EDA Asset Builder jobs.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(uploads_router, prefix=settings.api_prefix)
    app.include_router(jobs_router, prefix=settings.api_prefix)
    return app


app = create_app()
