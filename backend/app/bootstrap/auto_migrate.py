"""
Auto-migrate: run Alembic migrations on first startup if tables are missing.
"""

import asyncio

from alembic.command import upgrade
from alembic.config import Config
from sqlalchemy import inspect

from app.logging_config import get_logger

logger = get_logger()


def _get_sync_db_url(async_url: str) -> str:
    """Convert async postgresql+asyncpg URL to sync postgresql:// URL for Alembic."""
    return async_url.replace("postgresql+asyncpg://", "postgresql://")


def _run_migrations_sync(sync_url: str) -> None:
    """Run alembic upgrade head (sync, blocking)."""
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", sync_url)
    upgrade(alembic_cfg, "head")


async def auto_migrate() -> None:
    """Check if database needs migration and run it."""
    from app.config import settings
    from app.db import engine

    async with engine.connect() as conn:
        tables_exist = await conn.run_sync(
            lambda sync_conn: inspect(sync_conn).has_table("alembic_version")
        )

    if tables_exist:
        logger.info("auto_migrate", status="skipped", reason="tables already exist")
        return

    logger.info("auto_migrate", status="running", reason="no tables found, applying migrations")
    try:
        sync_url = _get_sync_db_url(settings.DATABASE_URL)
        await asyncio.to_thread(_run_migrations_sync, sync_url)
        logger.info("auto_migrate", status="completed")
    except Exception as exc:
        logger.error("auto_migrate", status="failed", error=str(exc))
        raise
