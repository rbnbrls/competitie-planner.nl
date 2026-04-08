import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

SLOW_QUERY_THRESHOLD_MS = 500


def log_slow_query(statement: str, duration_ms: float) -> None:
    if duration_ms >= SLOW_QUERY_THRESHOLD_MS:
        logger.warning(f"Slow query detected ({duration_ms:.2f}ms): {statement[:200]}")


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    pool_pre_ping=True,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        yield session
