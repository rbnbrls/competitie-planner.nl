import os

os.environ["TESTING"] = "1"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-minimum-64-characters-long-value-here"
os.environ["SUPER_ADMIN_EMAIL"] = "test@test.nl"
os.environ["ENCRYPTION_KEY"] = "test-encryption-key-for-testing-32chars"

import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import Base

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/competitieplanner_test"
)

# Tuned engine: pool_pre_ping avoids stale connections; pool_size large
# enough to handle concurrent fixture DB operations within a single test.
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=5,
    pool_pre_ping=True,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Per-test schema reset.
#
# We drop/create tables for every test to guarantee isolation.  This is
# straightforward and avoids all event-loop / scope mismatch issues that
# arise with session-scoped async fixtures in pytest-asyncio ≥1.x.
# The overhead is acceptable for a CI environment with a local PG instance.
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Drop & recreate schema, then provide a session for the test.

    Using a fresh schema gives perfect isolation without any nested-
    transaction trickery that can conflict with asyncpg.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test HTTP client.

    Each FastAPI request gets its own *fresh* session from the pool.
    This is the critical fix: sharing a single session across concurrent
    route handlers triggers asyncpg's "another operation is in progress"
    error.  By creating a new session per request we avoid that entirely
    while still operating against the same (freshly created) schema.
    """
    from app.db import get_db
    from app.main import app

    async def override_get_db():
        async with TestSessionLocal() as request_session:
            yield request_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Standard fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="function")
async def club(db_session: AsyncSession):
    """Create a test club."""
    from app.models import Club

    club = Club(
        id=uuid.uuid4(),
        naam="Test Club",
        slug="testclub",
        status="trial",
        max_banen=4,
    )
    db_session.add(club)
    await db_session.commit()
    await db_session.refresh(club)
    return club


@pytest_asyncio.fixture(scope="function")
async def admin_user(db_session: AsyncSession, club):
    """Create an admin user for the club."""
    from passlib.hash import bcrypt

    from app.models import User

    user = User(
        id=uuid.uuid4(),
        club_id=club.id,
        email="admin@testclub.nl",
        password_hash=bcrypt("password123"),
        full_name="Admin User",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def superadmin_user(db_session: AsyncSession):
    """Create a superadmin user."""
    from passlib.hash import bcrypt

    from app.models import User

    user = User(
        id=uuid.uuid4(),
        email="superadmin@test.nl",
        password_hash=bcrypt("password123"),
        full_name="Super Admin",
        role="admin",
        is_superadmin=True,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_auth_headers(client: AsyncClient, admin_user):
    """Get auth headers for admin user."""
    response = await client.post(
        "/api/v1/tenant/login",
        data={
            "username": "admin@testclub.nl",
            "password": "password123",
        },
        params={
            "slug": "testclub",
        },
    )
    if response.status_code != 200:
        return {"Authorization": "Bearer invalid"}
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def superadmin_auth_headers(client: AsyncClient, superadmin_user):
    """Get auth headers for superadmin user."""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "superadmin@test.nl",
            "password": "password123",
        },
    )
    if response.status_code != 200:
        return {"Authorization": "Bearer invalid"}
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
