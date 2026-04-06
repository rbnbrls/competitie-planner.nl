import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from httpx import ASGITransport, AsyncClient

from app.db import Base
from app.main import app


TEST_DATABASE_URL = "postgresql+asyncpg://user:pass@localhost:5432/competitieplanner_test"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="function")
async def db_session():
    """Create fresh database for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession):
    """Create test client with database override."""
    from app.db import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def club(db_session):
    """Create a test club."""
    from app.models import Club

    club = Club(
        naam="Test Club",
        slug="testclub",
        status="trial",
    )
    db_session.add(club)
    await db_session.commit()
    await db_session.refresh(club)
    return club


@pytest.fixture(scope="function")
async def admin_user(db_session, club):
    """Create an admin user for the club."""
    from app.models import User
    from passlib.hash import bcrypt

    user = User(
        club_id=club.id,
        email="admin@testclub.nl",
        password_hash=bcrypt("password123"),
        full_name="Admin User",
        role="admin",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
async def superadmin_user(db_session: AsyncSession):
    """Create a superadmin user."""
    from app.models import User
    from passlib.hash import bcrypt

    user = User(
        email="superadmin@test.nl",
        password_hash=bcrypt("password123"),
        full_name="Super Admin",
        role="admin",
        is_superadmin=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def admin_auth_headers(client: AsyncClient, admin_user):
    """Get auth headers for admin user."""
    response = await client.post(
        "/api/v1/tenant/login",
        params={
            "username": "admin@testclub.nl",
            "password": "password123",
            "slug": "testclub",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def superadmin_auth_headers(client: AsyncClient, superadmin_user):
    """Get auth headers for superadmin user."""
    response = await client.post(
        "/api/v1/auth/login",
        params={
            "username": "superadmin@test.nl",
            "password": "password123",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
