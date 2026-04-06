"""
Tests for competities and teams CRUD endpoints
"""

import uuid
from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Baan, Club, Competitie, Team


class TestCompetitiesList:
    """Tests for listing competities."""

    async def test_list_competities_empty(
        self,
        client: AsyncClient,
        admin_auth_headers,
    ):
        """Test listing competities when none exist."""
        response = await client.get(
            "/api/v1/tenant/competities",
            headers=admin_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "competities" in data
        assert data["competities"] == []

    async def test_list_competities_with_data(
        self,
        client: AsyncClient,
        admin_auth_headers,
        db_session: AsyncSession,
        club,
    ):
        """Test listing competities with data."""
        competitie = Competitie(
            club_id=club.id,
            naam="Test Competition",
            speeldag="maandag",
            start_datum=date(2024, 1, 1),
            eind_datum=date(2024, 12, 31),
        )
        db_session.add(competitie)
        await db_session.commit()

        response = await client.get(
            "/api/v1/tenant/competities",
            headers=admin_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["competities"]) == 1


class TestCompetitiesCreate:
    """Tests for creating competities."""

    async def test_create_competitie(
        self,
        client: AsyncClient,
        admin_auth_headers,
    ):
        """Test creating a competition."""
        response = await client.post(
            "/api/v1/tenant/competities",
            json={
                "naam": "Winter Competition 2024",
                "speeldag": "maandag",
                "start_datum": "2024-01-01",
                "eind_datum": "2024-12-31",
            },
            headers=admin_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["naam"] == "Winter Competition 2024"


class TestCompetitiesGet:
    """Tests for getting a single competition."""

    async def test_get_competitie(
        self,
        client: AsyncClient,
        admin_auth_headers,
        db_session: AsyncSession,
        club,
    ):
        """Test getting a competition by ID."""
        competitie = Competitie(
            club_id=club.id,
            naam="Test Competition",
            speeldag="vrijdag",
            start_datum=date(2024, 1, 1),
            eind_datum=date(2024, 12, 31),
        )
        db_session.add(competitie)
        await db_session.commit()
        await db_session.refresh(competitie)

        response = await client.get(
            f"/api/v1/tenant/competities/{competitie.id}",
            headers=admin_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["naam"] == "Test Competition"

    async def test_get_competitie_not_found(
        self,
        client: AsyncClient,
        admin_auth_headers,
    ):
        """Test getting nonexistent competition."""
        fake_id = uuid.uuid4()
        response = await client.get(
            f"/api/v1/tenant/competities/{fake_id}",
            headers=admin_auth_headers,
        )
        assert response.status_code == 404


class TestTeamsCRUD:
    """Tests for team CRUD operations."""

    async def test_create_team(
        self,
        client: AsyncClient,
        admin_auth_headers,
        db_session: AsyncSession,
        club,
    ):
        """Test creating a team."""
        competitie = Competitie(
            club_id=club.id,
            naam="Test Comp",
            speeldag="maandag",
            start_datum=date(2024, 1, 1),
            eind_datum=date(2024, 12, 31),
        )
        db_session.add(competitie)
        await db_session.commit()
        await db_session.refresh(competitie)

        response = await client.post(
            f"/api/v1/tenant/competities/{competitie.id}/teams",
            json={
                "naam": "Team A",
                "captain_naam": "Jan Jansen",
                "captain_email": "jan@example.nl",
            },
            headers=admin_auth_headers,
        )
        assert response.status_code == 200

    async def test_list_teams(
        self,
        client: AsyncClient,
        admin_auth_headers,
        db_session: AsyncSession,
        club,
    ):
        """Test listing teams."""
        competitie = Competitie(
            club_id=club.id,
            naam="Test Comp",
            speeldag="maandag",
            start_datum=date(2024, 1, 1),
            eind_datum=date(2024, 12, 31),
        )
        db_session.add(competitie)
        await db_session.commit()

        team = Team(
            club_id=club.id,
            competitie_id=competitie.id,
            naam="Team A",
            actief=True,
        )
        db_session.add(team)
        await db_session.commit()

        response = await client.get(
            f"/api/v1/tenant/competities/{competitie.id}/teams",
            headers=admin_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "teams" in data
        assert len(data["teams"]) == 1


class TestBaanenCRUD:
    """Tests for baan (court) CRUD operations."""

    async def test_create_baan(
        self,
        client: AsyncClient,
        admin_auth_headers,
    ):
        """Test creating a baan (court)."""
        response = await client.post(
            "/api/v1/tenant/banen",
            json={
                "nummer": 1,
                "naam": "Baan 1",
                "verlichting_type": "led",
                "overdekt": True,
            },
            headers=admin_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["nummer"] == 1

    async def test_list_banen(
        self,
        client: AsyncClient,
        admin_auth_headers,
        db_session: AsyncSession,
        club,
    ):
        """Test listing banen (courts)."""
        baan = Baan(
            club_id=club.id,
            nummer=1,
            naam="Test Court",
            actief=True,
        )
        db_session.add(baan)
        await db_session.commit()

        response = await client.get(
            "/api/v1/tenant/banen",
            headers=admin_auth_headers,
        )
        assert response.status_code == 200

    async def test_update_baan(
        self,
        client: AsyncClient,
        admin_auth_headers,
        db_session: AsyncSession,
        club,
    ):
        """Test updating a baan (court)."""
        baan = Baan(
            club_id=club.id,
            nummer=1,
            naam="Old Name",
            actief=True,
        )
        db_session.add(baan)
        await db_session.commit()
        await db_session.refresh(baan)

        response = await client.patch(
            f"/api/v1/tenant/banen/{baan.id}",
            json={"naam": "New Name"},
            headers=admin_auth_headers,
        )
        assert response.status_code == 200
