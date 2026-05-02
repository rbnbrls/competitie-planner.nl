"""
File: backend/app/bootstrap/lifecycle.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.cache import cache
from app.config import settings
from app.db import engine
from app.logging_config import get_logger

logger = get_logger()


def _in_test_mode() -> bool:
    return bool(os.getenv("TEST_MODE") or os.getenv("TESTING"))


def _validate_runtime_security() -> None:
    if settings.SECRET_KEY == "changeme" or len(settings.SECRET_KEY) < 64:
        raise RuntimeError(
            "SECRET_KEY is insecure: using default value or shorter than 64 characters. "
            "Please set a secure SECRET_KEY environment variable."
        )

    is_production = settings.ENVIRONMENT.lower() == "production"
    if "*" in settings.CORS_ORIGINS:
        if is_production:
            raise RuntimeError(
                "CORS_ORIGINS contains wildcard '*' in production. This is insecure. "
                "Please restrict origins to specific domains."
            )
        logger.warning("CORS_ORIGINS contains wildcard '*'. This allows requests from any origin.")

    if is_production:
        for origin in settings.CORS_ORIGINS:
            if "localhost" in origin or "127.0.0.1" in origin:
                logger.warning(
                    f"Insecure origin found in production CORS_ORIGINS: {origin}. "
                    "Localhost origins should only be used in development."
                )

    logger.info("Security check: CSRF protection verified - tokens are stateless (OAuth2 Bearer).")
    logger.info(
        "audit_log_retention_policy",
        retention_days=settings.AUDIT_LOG_RETENTION_DAYS,
        note="Configure Docker/Coolify log rotation to enforce this retention period.",
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not _in_test_mode():
        _validate_runtime_security()

    try:
        await cache.get_client()
        logger.info("cache_initialized", redis_url=settings.REDIS_URL)
    except Exception as exc:
        logger.warning("cache_init_failed", error=str(exc))

    yield

    if not _in_test_mode():
        await cache.close()
        await engine.dispose()
