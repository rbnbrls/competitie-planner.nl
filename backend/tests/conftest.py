"""
File: backend/tests/conftest.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import os
import uuid
from collections.abc import AsyncGenerator

# Force override settings for tests BEFORE importing anything from app
# Use TEST_DATABASE_URL when provided; otherwise keep existing DATABASE_URL.
# This prevents hardcoded credentials from breaking local test runs.
if os.environ.get("TEST_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]

os.environ["SECRET_KEY"] = "test-secret-key-for-testing-minimum-64-characters-long-value-here"
os.environ["ENVIRONMENT"] = "test"
os.environ["SUPER_ADMIN_EMAIL"] = "test@test.nl"
os.environ["ENCRYPTION_KEY"] = "test-encryption-key-for-testing-32chars"
os.environ["TESTING"] = "1"

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app import models  # noqa: F401
from app.config import settings
from app.db import Base

TEST_DATABASE_URL = settings.DATABASE_URL

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    poolclass=NullPool,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a perfectly isolated session for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session
        await session.close()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
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


@pytest_asyncio.fixture(scope="function")
async def club(db_session: AsyncSession):
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
    from app.models import User
    from app.services.auth import get_password_hash

    user = User(
        id=uuid.uuid4(),
        club_id=club.id,
        email="admin@testclub.nl",
        password_hash=get_password_hash("password123"),
        full_name="Admin User",
        role="vereniging_admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def superadmin_user(db_session: AsyncSession):
    from app.models import User
    from app.services.auth import get_password_hash

    user = User(
        id=uuid.uuid4(),
        email="superadmin@test.nl",
        password_hash=get_password_hash("password123"),
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
    response = await client.post(
        "/api/v1/tenant/login",
        data={"username": "admin@testclub.nl", "password": "password123"},
        params={"slug": "testclub"},
    )
    if response.status_code != 200:
        return {"Authorization": "Bearer invalid"}
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def superadmin_auth_headers(client: AsyncClient, superadmin_user):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "superadmin@test.nl", "password": "password123"},
    )
    if response.status_code != 200:
        return {"Authorization": "Bearer invalid"}
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
