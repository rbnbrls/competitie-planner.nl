import os

import psutil
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import cache
from app.config import settings
from app.db import get_db
from app.logging_config import get_logger

logger = get_logger()
router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "ok", "version": settings.VERSION}
    except Exception as exc:
        logger.error("Health check failed", error=str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "unhealthy", "database": "down", "version": settings.VERSION},
        )


@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as exc:
        logger.error("Readiness check failed", error=str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database connection failure"
        )


@router.get("/")
async def root():
    return {"message": "Competitie-Planner API", "version": settings.VERSION}


async def check_database(db: AsyncSession) -> dict:
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "type": "postgresql"}
    except Exception as exc:
        logger.error("Database health check failed", error=str(exc))
        return {"status": "error", "type": "postgresql", "error": str(exc)}


async def check_redis() -> dict:
    try:
        client = await cache.get_client()
        await client.ping()
        return {"status": "ok", "type": "redis"}
    except Exception as exc:
        logger.warning("Redis health check failed", error=str(exc))
        return {"status": "error", "type": "redis", "error": str(exc)}


async def check_email_service() -> dict:
    try:
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = os.getenv("SMTP_PORT")
        resend_api_key = os.getenv("RESEND_API_KEY")

        if not smtp_host and not resend_api_key:
            return {"status": "skipped", "type": "email", "reason": "No email service configured"}

        if resend_api_key:
            return {"status": "ok", "type": "email", "provider": "resend"}
        if smtp_host:
            return {
                "status": "ok",
                "type": "email",
                "provider": "smtp",
                "host": smtp_host,
                "port": smtp_port or "587",
            }

        return {"status": "skipped", "type": "email", "reason": "No email service configured"}
    except Exception as exc:
        logger.warning("Email service check failed", error=str(exc))
        return {"status": "error", "type": "email", "error": str(exc)}


def get_system_metrics() -> dict:
    try:
        process = psutil.Process()
        memory_info = process.memory_info()
        return {
            "memory": {
                "rss_mb": round(memory_info.rss / 1024 / 1024, 2),
                "vms_mb": round(memory_info.vms / 1024 / 1024, 2),
            },
            "cpu": {"percent": process.cpu_percent(interval=0.1)},
        }
    except Exception as exc:
        logger.warning("Failed to get system metrics", error=str(exc))
        return {"memory": None, "cpu": None}


@router.get("/health/details")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    checks = {
        "database": await check_database(db),
        "redis": await check_redis(),
        "email": await check_email_service(),
    }
    metrics = get_system_metrics()

    overall_status = "healthy"
    if checks["database"]["status"] == "error":
        overall_status = "unhealthy"
    elif checks["redis"]["status"] == "error":
        overall_status = "degraded"
    elif checks["email"]["status"] == "error":
        overall_status = "degraded"

    response = {
        "status": overall_status,
        "version": settings.VERSION,
        "checks": checks,
        "metrics": metrics,
    }

    if overall_status != "healthy":
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=response)

    return response
