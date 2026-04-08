"""
Tests for auth endpoints: login, register-admin, token refresh
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


class TestLogin:
    """Tests for the login endpoint."""

    async def test_login_success(self, client: AsyncClient, superadmin_user):
        """Test successful login."""
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "superadmin@test.nl",
                "password": "password123",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient, superadmin_user):
        """Test login with wrong password."""
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "superadmin@test.nl",
                "password": "wrongpassword",
            },
        )
        assert response.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with nonexistent user."""
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@test.nl",
                "password": "password123",
            },
        )
        assert response.status_code == 401


class TestRegisterAdmin:
    """Tests for the register-admin endpoint."""

    async def test_register_admin_first(self, client: AsyncClient, db_session: AsyncSession):
        """Test registering first admin."""
        response = await client.post(
            "/api/v1/auth/register-admin",
            json={
                "email": "newadmin@test.nl",
                "password": "securepassword123",
                "full_name": "New Admin",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_register_admin_already_exists(self, client: AsyncClient, superadmin_user):
        """Test registering admin when one already exists."""
        response = await client.post(
            "/api/v1/auth/register-admin",
            json={
                "email": "another@test.nl",
                "password": "password123",
                "full_name": "Another Admin",
            },
        )
        assert response.status_code == 409

    async def test_register_admin_duplicate_email(self, client: AsyncClient, superadmin_user):
        """Test registering with duplicate email."""
        response = await client.post(
            "/api/v1/auth/register-admin",
            json={
                "email": "superadmin@test.nl",
                "password": "password123",
                "full_name": "Duplicate",
            },
        )
        assert response.status_code == 409


class TestRefreshToken:
    """Tests for the token refresh endpoint."""

    async def test_refresh_token_success(self, client: AsyncClient, superadmin_user):
        """Test successful token refresh."""
        login_response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "superadmin@test.nl",
                "password": "password123",
            },
        )
        refresh_token = login_response.json()["refresh_token"]

        response = await client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    async def test_refresh_token_invalid(self, client: AsyncClient):
        """Test refresh with invalid token."""
        response = await client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401


class TestAdminExists:
    """Tests for the admin-exists endpoint."""

    async def test_admin_not_exists(self, client: AsyncClient, db_session: AsyncSession):
        """Test admin not exists when no admin."""
        response = await client.get("/api/v1/auth/admin-exists")
        assert response.status_code == 200
        assert response.json()["exists"] is False

    async def test_admin_exists(self, client: AsyncClient, superadmin_user):
        """Test admin exists when admin is present."""
        response = await client.get("/api/v1/auth/admin-exists")
        assert response.status_code == 200
        assert response.json()["exists"] is True


class TestGetMe:
    """Tests for the /me endpoint."""

    async def test_get_me(self, client: AsyncClient, superadmin_user):
        """Test getting current user info."""
        login_response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": "superadmin@test.nl",
                "password": "password123",
            },
        )
        token = login_response.json()["access_token"]

        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "superadmin@test.nl"


class TestLogout:
    """Tests for the logout endpoint."""

    async def test_logout(self, client: AsyncClient):
        """Test logout."""
        response = await client.post("/api/v1/auth/logout")
        assert response.status_code == 200
