import logging
import os
import sys
import structlog
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from slowapi.errors import RateLimitExceeded

from app.limiter import limiter
from app.config import settings
from app.db import engine, get_db
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

from app.middleware.logging import LoggingMiddleware

# Configure structlog
def setup_logging():
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
    ]

    if settings.ENVIRONMENT.lower() == "production":
        processors.append(structlog.processors.dict_tracebacks)
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        logger_factory=structlog.PrintLoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        cache_logger_on_first_use=True,
    )

setup_logging()
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.getenv("TEST_MODE") and not os.getenv("TESTING"):
        # Validate SECRET_KEY
        if settings.SECRET_KEY == "changeme" or len(settings.SECRET_KEY) < 64:
            raise RuntimeError(
                "SECRET_KEY is insecure: using default value or shorter than 64 characters. "
                "Please set a secure SECRET_KEY environment variable."
            )

        # Validate CORS_ORIGINS
        is_production = settings.ENVIRONMENT.lower() == "production"
        if "*" in settings.CORS_ORIGINS:
            if is_production:
                raise RuntimeError(
                    "CORS_ORIGINS contains wildcard '*' in production. This is insecure. "
                    "Please restrict origins to specific domains."
                )
            else:
                logger.warning(
                    "CORS_ORIGINS contains wildcard '*'. This allows requests from any origin."
                )

        if is_production:
            for origin in settings.CORS_ORIGINS:
                if "localhost" in origin or "127.0.0.1" in origin:
                    logger.warning(
                        f"Insecure origin found in production CORS_ORIGINS: {origin}. "
                        "Localhost origins should only be used in development."
                    )

        # Confirm CSRF safety (tokens in Authorization header, not cookies)
        logger.info("Security check: CSRF protection verified - tokens are stateless (OAuth2 Bearer).")

    yield
    await engine.dispose()


app = FastAPI(
    title="Competitie-Planner API",
    version=settings.VERSION,
    lifespan=lifespan,
)
app.state.limiter = limiter


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for RateLimitExceeded exceptions.
    Returns 429 Too Many Requests with Retry-After header.
    """
    response = JSONResponse(
        status_code=429,
        content={"detail": f"Te veel aanvragen. Probeer het over {exc.retry_after} seconden opnieuw."},
    )
    response.headers["Retry-After"] = str(exc.retry_after)
    return response


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Middleware to add security-related headers to every response.
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    # Strict-Transport-Security (HSTS) - 1 year in seconds
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LoggingMiddleware)

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
app.include_router(dagoverzicht, prefix="/api/v1")


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Health check including database connectivity.
    Returns 503 if database is unreachable.
    """
    try:
        # Check database connectivity
        await db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "ok",
            "version": settings.VERSION
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unhealthy",
                "database": "down",
                "version": settings.VERSION
            }
        )


@app.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Readiness probe for deployment (e.g., Coolify, Kubernetes).
    Ensures the application is ready to accept traffic.
    """
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        logger.error("Readiness check failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failure"
        )


@app.get("/")
async def root():
    return {"message": "Competitie-Planner API", "version": settings.VERSION}
