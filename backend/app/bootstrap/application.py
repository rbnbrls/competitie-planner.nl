"""
Competitie-Planner API — Application Factory

Last updated: 2026-05-01
API version: v1
Author/maintainer: Competitie-Planner Team

Changelog:
- 2026-05-01: Added structured response for competitie not found (v1)
- 2026-05-01: Fixed timezone-aware datetime handling (v1)
- 2026-05-01: Added file size validation fix for logo upload (v1)
- 2026-05-01: Fixed balanced match validation in wedstrijden (v1)
- 2026-04-30: Split main.py into modular router files (v1)
- 2026-04-30: Added display routes and improved login validation (v1)
- 2026-04-29: Added local database reset for testing (v1)
"""

from fastapi import FastAPI

from app.config import settings
from app.limiter import limiter
from app.routers import (
    auth,
    calendar,
    competities,
    dagoverzicht,
    display,
    onboarding,
    payments,
    planning,
    superadmin,
    teams,
    tenant,
    tenant_dashboard,
    tenant_settings,
    wedstrijden,
)

from .exceptions import register_exception_handlers
from .health import router as health_router
from .lifecycle import lifespan
from .middleware import configure_middleware


def _register_routers(app: FastAPI) -> None:
    app.include_router(auth, prefix="/api/v1")
    app.include_router(calendar, prefix="/api/v1")
    app.include_router(superadmin, prefix="/api/v1")
    app.include_router(tenant, prefix="/api/v1")
    app.include_router(tenant_dashboard, prefix="/api/v1")
    app.include_router(tenant_settings, prefix="/api/v1")
    app.include_router(planning, prefix="/api/v1")
    app.include_router(display, prefix="/api/v1")
    app.include_router(competities, prefix="/api/v1")
    app.include_router(teams, prefix="/api/v1")
    app.include_router(onboarding, prefix="/api/v1")
    app.include_router(payments, prefix="/api/v1")
    app.include_router(wedstrijden, prefix="/api/v1")
    app.include_router(dagoverzicht)
    app.include_router(health_router)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Competitie-Planner API",
        description="Backend API for competitive tennis planning. Manages competitions, teams, court scheduling, match results, and club subscriptions.",
        version=settings.VERSION,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    app.state.limiter = limiter

    register_exception_handlers(app)
    configure_middleware(app)
    _register_routers(app)
    return app
