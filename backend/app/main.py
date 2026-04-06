import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import engine
from app.routers import (
    auth,
    competities,
    display,
    onboarding,
    payments,
    planning,
    superadmin,
    teams,
    tenant,
    tenant_settings,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.getenv("TEST_MODE") and not os.getenv("TESTING"):
        if settings.SECRET_KEY == "changeme" or len(settings.SECRET_KEY) < 64:
            raise RuntimeError(
                "SECRET_KEY is insecure: using default value or shorter than 64 characters. "
                "Please set a secure SECRET_KEY environment variable."
            )
        if "*" in settings.CORS_ORIGINS:
            logger.warning(
                "CORS_ORIGINS contains wildcard '*'. This allows requests from any origin. "
                "Consider restricting to specific domains in production."
            )
    yield
    await engine.dispose()


app = FastAPI(
    title="Competitie-Planner API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(superadmin.router, prefix="/api/v1")
app.include_router(tenant.router, prefix="/api/v1")
app.include_router(tenant_settings.router, prefix="/api/v1")
app.include_router(planning.router, prefix="/api/v1")
app.include_router(display.router, prefix="/api/v1")
app.include_router(competities.router, prefix="/api/v1")
app.include_router(teams.router, prefix="/api/v1")
app.include_router(onboarding.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "Competitie-Planner API", "version": "0.1.0"}
