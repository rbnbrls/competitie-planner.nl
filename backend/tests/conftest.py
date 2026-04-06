import os

os.environ["TESTING"] = "1"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-minimum-64-characters-long-value-here"
os.environ["SUPER_ADMIN_EMAIL"] = "test@test.nl"
os.environ["ENCRYPTION_KEY"] = "test-encryption-key-for-testing-32chars"

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import Base

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://user:pass@localhost:5432/competitieplanner_test"
)

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
)


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create fresh database for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with database override."""
    from app.main import app
    from app.db import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


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
    from app.models import User
    from passlib.hash import bcrypt

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
    from app.models import User
    from passlib.hash import bcrypt

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
