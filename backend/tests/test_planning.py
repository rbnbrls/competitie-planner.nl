"""
Tests for the planning algorithm (services/planning.py)
"""

import uuid
from datetime import date
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Baan, BaanToewijzing, Club, Competitie, PlanningHistorie, Speelronde, Team
from app.services.planning import genereer_indeling, get_historie_heatmap


@pytest_asyncio.fixture
async def club_with_competitie(db_session: AsyncSession) -> tuple[Club, Competitie]:
    club = Club(
        id=uuid.uuid4(),
        naam="Planning Test Club",
        slug="plantest",
        status="trial",
    )
    db_session.add(club)
    await db_session.commit()

    competitie = Competitie(
        id=uuid.uuid4(),
        club_id=club.id,
        naam="Test Competition",
        speeldag="maandag",
        start_datum=date(2024, 1, 1),
        eind_datum=date(2024, 12, 31),
    )
    db_session.add(competitie)
    await db_session.commit()
    await db_session.refresh(competitie)

    return club, competitie


@pytest_asyncio.fixture
async def banen(db_session: AsyncSession, club_with_competitie) -> list[Baan]:
    club, _ = club_with_competitie
    banen = []
    for i in range(1, 5):
        baan = Baan(
            club_id=club.id,
            nummer=i,
            naam=f"Baan {i}",
            prioriteit_score=10 - (i - 1) * 2,
            actief=True,
        )
        db_session.add(baan)
        banen.append(baan)
    await db_session.commit()
    return banen


@pytest_asyncio.fixture
async def teams(db_session: AsyncSession, club_with_competitie) -> list[Team]:
    _, competitie = club_with_competitie
    teams = []
    for i in range(1, 5):
        team = Team(
            club_id=competitie.club_id,
            competitie_id=competitie.id,
            naam=f"Team {i}",
            actief=True,
        )
        db_session.add(team)
        teams.append(team)
    await db_session.commit()
    return teams


@pytest_asyncio.fixture
async def speelronde(db_session: AsyncSession, club_with_competitie) -> Speelronde:
    _, competitie = club_with_competitie
    ronde = Speelronde(
        id=uuid.uuid4(),
        competitie_id=competitie.id,
        club_id=competitie.club_id,
        datum=date(2024, 1, 15),
        status="concept",
    )
    db_session.add(ronde)
    await db_session.commit()
    await db_session.refresh(ronde)
    return ronde


class TestGenereerIndeling:
    """Tests for the genereer_indeling function."""

    async def test_genereer_indeling_basic(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
        teams,
        speelronde,
    ):
        """Test basic indeling generation with multiple teams and courts."""
        toewijzingen = await genereer_indeling(speelronde.id, db_session)

        assert len(toewijzingen) == min(len(banen), len(teams))
        for toewijzing in toewijzingen:
            assert toewijzing.ronde_id == speelronde.id
            assert toewijzing.team_id is not None
            assert toewijzing.baan_id is not None

    async def test_genereer_indeling_replaces_existing(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
        teams,
        speelronde,
    ):
        """Test that generating indeling replaces existing toewijzingen."""
        eerst = await genereer_indeling(speelronde.id, db_session)
        assert len(eerst) == 4

        tweede = await genereer_indeling(speelronde.id, db_session)
        assert len(tweede) == 4

    async def test_genereer_indeling_nonexistent_ronde(
        self,
        db_session: AsyncSession,
    ):
        """Test that nonexistent ronde raises ValueError."""
        fake_id = uuid.uuid4()
        with pytest.raises(ValueError, match="not found"):
            await genereer_indeling(fake_id, db_session)

    async def test_genereer_indeling_without_teams(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
        speelronde,
    ):
        """Test indeling with no active teams."""
        from sqlalchemy import select

        _, competitie = club_with_competitie
        result = await db_session.execute(
            select(Team).where(
                Team.competitie_id == competitie.id,
                Team.actief == True,
            )
        )
        teams = list(result.scalars().all())
        for team in teams:
            team.actief = False
        await db_session.commit()

        toewijzingen = await genereer_indeling(speelronde.id, db_session)
        assert len(toewijzingen) == 0


class TestHistorieHeatmap:
    """Tests for planning history heatmap."""

    async def test_get_empty_heatmap(
        self,
        db_session: AsyncSession,
        club_with_competitie,
    ):
        """Test getting heatmap when there's no history."""
        _, competitie = club_with_competitie
        heatmap = await get_historie_heatmap(competitie.id, db_session)
        assert heatmap == {}

    async def test_get_heatmap_with_history(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
        teams,
    ):
        """Test getting heatmap with existing history."""
        _, competitie = club_with_competitie
        team = teams[0]
        baan = banen[0]

        historie = PlanningHistorie(
            club_id=competitie.club_id,
            competitie_id=competitie.id,
            team_id=team.id,
            baan_id=baan.id,
            aantal_keer=3,
            totaal_score=30.0,
        )
        db_session.add(historie)
        await db_session.commit()

        heatmap = await get_historie_heatmap(competitie.id, db_session)
        assert team.id in heatmap
        assert baan.id in heatmap[team.id]
        assert heatmap[team.id][baan.id] == 3
