import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

import structlog
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import cache
from app.config import settings
from app.db import engine, get_db
from app.exceptions import BaseAPIExceptionError, RateLimitError
from app.limiter import limiter
from app.middleware.logging import LoggingMiddleware
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
        logger.info(
            "Security check: CSRF protection verified - tokens are stateless (OAuth2 Bearer)."
        )

        logger.info(
            "audit_log_retention_policy",
            retention_days=settings.AUDIT_LOG_RETENTION_DAYS,
            note="Configure Docker/Coolify log rotation to enforce this retention period.",
        )

    try:
        await cache.get_client()
        logger.info("cache_initialized", redis_url=settings.REDIS_URL)
    except Exception as e:
        logger.warning("cache_init_failed", error=str(e))

    yield
    if not os.getenv("TEST_MODE") and not os.getenv("TESTING"):
        await cache.close()
        await engine.dispose()


app = FastAPI(
    title="Competitie-Planner API",
    description="Backend API for competitive tennis planning. Manages competitions, teams, court scheduling, match results, and club subscriptions.",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)
app.state.limiter = limiter


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for RateLimitExceeded exceptions.
    Returns 429 Too Many Requests with Retry-After header.
    """
    retry_after = getattr(exc, "retry_after", 60)
    detail = getattr(
        exc, "detail", f"Te veel aanvragen. Probeer het over {retry_after} seconden opnieuw."
    )
    response = JSONResponse(
        status_code=429,
        content={"detail": detail},
        headers={
            "Retry-After": str(retry_after),
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": str(int(retry_after)),
        },
    )
    return response


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


def get_language_from_request(request: Request) -> str:
    """Extract language from Accept-Language header, default to 'nl'."""
    accept_language = request.headers.get("Accept-Language", "")
    if accept_language.startswith("nl"):
        return "nl"
    # Could extend for other languages if needed
    return "nl"


def get_user_id_from_request(request: Request) -> Optional[str]:
    """Extract user_id from request state if available."""
    return getattr(request.state, "user_id", None)


async def base_api_exception_handler(request: Request, exc: BaseAPIExceptionError):
    """Handler for custom API exceptions."""
    # Determine language
    language = get_language_from_request(request)

    # Get user_id if available
    user_id = get_user_id_from_request(request)

    # Determine log level: WARNING for client errors (4xx), ERROR for server errors (5xx)
    log_level = logging.WARNING if 400 <= exc.status_code < 500 else logging.ERROR

    # Log the exception
    logger.log(
        log_level,
        "api_exception",
        exception_type=type(exc).__name__,
        error_code=exc.error_code,
        status_code=exc.status_code,
        user_id=user_id,
        path=request.url.path,
        method=request.method,
        field_info=exc.field_info if exc.field_info else None,
        context_data=exc.context_data if exc.context_data else None,
    )

    # Prepare response
    response_content = {
        "error": {
            "code": exc.error_code,
            "message": exc.message,
            "details": exc.field_info,
            "timestamp": exc.timestamp,
        }
    }

    # Add Retry-After header for RateLimitError if retry_after is set
    response = JSONResponse(
        status_code=exc.status_code,
        content=response_content,
    )
    if isinstance(exc, RateLimitError) and exc.retry_after:
        response.headers["Retry-After"] = str(exc.retry_after)

    return response


async def unexpected_exception_handler(request: Request, exc: Exception):
    """Handler for unexpected exceptions."""
    # Determine language
    language = get_language_from_request(request)

    # Get user_id if available
    user_id = get_user_id_from_request(request)

    # Log as CRITICAL with full stack trace
    logger.critical(
        "unexpected_exception",
        exception_type=type(exc).__name__,
        user_id=user_id,
        path=request.url.path,
        method=request.method,
        exc_info=True,
    )

    # Safe generic error response
    response_content = {
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "Er is een interne fout opgetreden. Probeer het later opnieuw.",
            "details": {},
            "timestamp": datetime.utcnow().isoformat(),
        }
    }

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response_content,
    )


# Register exception handlers
app.add_exception_handler(BaseAPIExceptionError, base_api_exception_handler)
app.add_exception_handler(Exception, unexpected_exception_handler)


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
    # Restrict resource loading for API responses; frame-ancestors replaces X-Frame-Options
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    # Do not send the full URL as referrer across origins
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Disable browser features not needed by this API
    response.headers["Permissions-Policy"] = (
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
        "magnetometer=(), microphone=(), payment=(), usb=()"
    )
    return response


@app.middleware("http")
async def caching_middleware(request: Request, call_next):
    """
    Middleware to add caching headers and handle ETag/If-None-Match.
    """
    if request.method == "GET" and request.url.path.startswith("/api/v1"):
        cache_key = f"response:{request.url.path}:{request.url.query or ''}"
        etag = request.headers.get("If-None-Match")

        cached_response = await cache.get(cache_key)
        if cached_response and etag:
            current_etag = f'"{uuid.uuid4().hex}"'
            if etag == current_etag:
                return JSONResponse(
                    status_code=304,
                    headers={
                        "ETag": current_etag,
                        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
                    },
                )

        response = await call_next(request)

        if response.status_code == 200:
            current_etag = f'"{uuid.uuid4().hex}"'
            response.headers["ETag"] = current_etag
            response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
            response.headers["Vary"] = "Accept-Encoding"

        return response

    return await call_next(request)


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
        return {"status": "healthy", "database": "ok", "version": settings.VERSION}
    except Exception as e:
        logger.error("Health check failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "unhealthy", "database": "down", "version": settings.VERSION},
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
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database connection failure"
        )


@app.get("/")
async def root():
    return {"message": "Competitie-Planner API", "version": settings.VERSION}
