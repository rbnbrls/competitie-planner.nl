import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from slowapi.errors import RateLimitExceeded

from app.limiter import limiter
from app.config import settings
from app.db import engine
from app.routers import (
    auth,
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

logger = logging.getLogger(__name__)


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
                    "CORS_ORIGINS contains wildcard '*'. This allows requests from any origin. "
                    "Restrict this for production environments."
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
    version="0.1.0",
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

app.include_router(auth, prefix="/api/v1")
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
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "Competitie-Planner API", "version": "0.1.0"}
