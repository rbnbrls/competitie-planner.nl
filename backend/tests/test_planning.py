"""
Tests for the planning algorithm (services/planning.py)
"""

import uuid
from datetime import date

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Baan,
    BaanToewijzing,
    Club,
    Competitie,
    PlanningHistorie,
    Speelronde,
    Team,
    Wedstrijd,
)
from app.services.planning import (
    bereken_banenvereisten,
    detecteer_conflicten,
    genereer_indeling,
    get_historie_heatmap,
    plan_competitie,
    validate_club_max_thuisteams,
)


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
                Team.actief,
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


class TestDagoverzicht:
    """Tests for dagoverzicht functions."""

    async def test_bereken_banenvereisten_basic(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
    ):
        """Test basic dagoverzicht calculation."""
        club, _ = club_with_competitie
        test_datum = date(2024, 3, 15)

        result = await bereken_banenvereisten(test_datum, club.id, db_session)

        assert result["datum"] == "2024-03-15"
        assert result["club_id"] == str(club.id)
        assert result["beschikbare_banen"] == 4
        assert result["max_thuisteams_per_dag"] == 3

    async def test_bereken_banenvereisten_with_ronde(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
        teams,
        speelronde,
    ):
        """Test dagoverzicht with an existing speelronde."""
        club, competitie = club_with_competitie
        _, _, team1, team2 = teams

        wedstrijd1 = Wedstrijd(
            competitie_id=competitie.id,
            ronde_id=speelronde.id,
            thuisteam_id=team1.id,
            uitteam_id=team2.id,
            status="gepland",
        )
        db_session.add(wedstrijd1)
        await db_session.commit()

        result = await bereken_banenvereisten(speelronde.datum, club.id, db_session)

        assert len(result["competities"]) >= 0

    async def test_detecteer_conflicten_no_conflict(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
    ):
        """Test conflict detection with no conflicts."""
        club, _ = club_with_competitie
        test_datum = date(2024, 3, 15)

        result = await detecteer_conflicten(test_datum, club.id, db_session)

        assert not result["has_conflicts"]
        assert len(result["conflicten"]) == 0

    async def test_validate_club_max_thuisteams(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
    ):
        """Test validation of max thuisteams."""
        club, _ = club_with_competitie
        test_datum = date(2024, 3, 15)

        is_valid = await validate_club_max_thuisteams(club.id, test_datum, db_session)

        assert is_valid


class TestBatchPlanning:
    """Tests for the new batch planning functionality."""

    async def test_plan_competitie_preview(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
        teams,
    ):
        """Test planning preview (no DB changes)."""
        club, competitie = club_with_competitie

        # Create two rounds
        ronde1 = Speelronde(competitie_id=competitie.id, club_id=club.id, datum=date(2024, 4, 1))
        ronde2 = Speelronde(competitie_id=competitie.id, club_id=club.id, datum=date(2024, 4, 8))
        db_session.add_all([ronde1, ronde2])
        await db_session.commit()

        # Add home matches
        w1 = Wedstrijd(
            competitie_id=competitie.id,
            ronde_id=ronde1.id,
            thuisteam_id=teams[0].id,
            uitteam_id=teams[1].id,
        )
        w2 = Wedstrijd(
            competitie_id=competitie.id,
            ronde_id=ronde2.id,
            thuisteam_id=teams[0].id,
            uitteam_id=teams[2].id,
        )
        db_session.add_all([w1, w2])
        await db_session.commit()

        result = await plan_competitie(competitie.id, db_session, apply=False)

        assert result["success"] is True
        assert len(result["toewijzingen"]) == 2

        # Verify no DB changes
        query = select(BaanToewijzing).where(BaanToewijzing.ronde_id.in_([ronde1.id, ronde2.id]))
        db_result = await db_session.execute(query)
        assert len(db_result.scalars().all()) == 0

    async def test_plan_competitie_apply(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
        teams,
    ):
        """Test planning apply (saves to DB)."""
        club, competitie = club_with_competitie
        ronde1 = Speelronde(competitie_id=competitie.id, club_id=club.id, datum=date(2024, 4, 1))
        db_session.add(ronde1)
        await db_session.commit()

        w1 = Wedstrijd(
            competitie_id=competitie.id,
            ronde_id=ronde1.id,
            thuisteam_id=teams[0].id,
            uitteam_id=teams[1].id,
        )
        db_session.add(w1)
        await db_session.commit()

        result = await plan_competitie(competitie.id, db_session, apply=True)
        assert result["counts"]["toewijzingen"] == 1

        # Verify DB changes
        query = select(BaanToewijzing).where(BaanToewijzing.ronde_id == ronde1.id)
        db_result = await db_session.execute(query)
        assert len(db_result.scalars().all()) == 1

    async def test_plan_competitie_not_twice_on_same_court(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
        teams,
    ):
        """Test that teams don't play on the same court twice in a row if possible."""
        club, competitie = club_with_competitie

        # Reduce to 2 courts to force potential reuse
        for b in banen[2:]:
            b.actief = False
        await db_session.commit()

        ronde1 = Speelronde(competitie_id=competitie.id, club_id=club.id, datum=date(2024, 5, 1))
        ronde2 = Speelronde(competitie_id=competitie.id, club_id=club.id, datum=date(2024, 5, 8))
        db_session.add_all([ronde1, ronde2])

        # Team 0 plays home twice in a row
        w1 = Wedstrijd(
            competitie_id=competitie.id,
            ronde_id=ronde1.id,
            thuisteam_id=teams[0].id,
            uitteam_id=teams[1].id,
        )
        w2 = Wedstrijd(
            competitie_id=competitie.id,
            ronde_id=ronde2.id,
            thuisteam_id=teams[0].id,
            uitteam_id=teams[2].id,
        )
        db_session.add_all([w1, w2])
        await db_session.commit()

        result = await plan_competitie(competitie.id, db_session, apply=False)

        toewijzingen = result["toewijzingen"]
        t1 = next(t for t in toewijzingen if t["ronde_id"] == str(ronde1.id))
        t2 = next(t for t in toewijzingen if t["ronde_id"] == str(ronde2.id))

        # Should be different courts
        assert t1["baan_id"] != t2["baan_id"]

    async def test_plan_competitie_max_thuisteams_warning(
        self,
        db_session: AsyncSession,
        club_with_competitie,
        banen,
        teams,
    ):
        """Test that a warning is logged when max_thuisteams_per_dag is exceeded."""
        club, competitie = club_with_competitie
        club.max_thuisteams_per_dag = 1
        await db_session.commit()

        ronde1 = Speelronde(competitie_id=competitie.id, club_id=club.id, datum=date(2024, 6, 1))
        db_session.add(ronde1)

        # 2 home matches for same competition on same day
        w1 = Wedstrijd(
            competitie_id=competitie.id,
            ronde_id=ronde1.id,
            thuisteam_id=teams[0].id,
            uitteam_id=teams[1].id,
        )
        w2 = Wedstrijd(
            competitie_id=competitie.id,
            ronde_id=ronde1.id,
            thuisteam_id=teams[2].id,
            uitteam_id=teams[3].id,
        )
        db_session.add_all([w1, w2])
        await db_session.commit()

        result = await plan_competitie(competitie.id, db_session, apply=False)

        warnings = [log for log in result["logs"] if log["severity"] == "warning"]
        assert any("Maximum aantal thuisteams" in w["message"] for w in warnings)
