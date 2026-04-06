import uuid
from datetime import date
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Baan,
    BaanToewijzing,
    Competitie,
    PlanningHistorie,
    Speelronde,
    Team,
    Wedstrijd,
)


async def genereer_indeling(ronde_id: uuid.UUID, db: AsyncSession) -> list[BaanToewijzing]:
    """
    Genereert een banenindeling voor een speelronde.
    Returnt een lijst van BaanToewijzing objecten (nog niet opgeslagen).
    ALLEEN thuisteams krijgen een baan toegewezen.
    """
    result = await db.execute(select(Speelronde).where(Speelronde.id == ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde:
        raise ValueError(f"Speelronde {ronde_id} not found")

    competitie = ronde.competitie
    if not competitie:
        raise ValueError("Competitie not found")

    result = await db.execute(
        select(Baan)
        .where(
            Baan.club_id == competitie.club_id,
            Baan.actief == True,
        )
        .order_by(Baan.prioriteit_score.desc())
    )
    banen = list(result.scalars().all())

    result = await db.execute(select(Wedstrijd).where(Wedstrijd.ronde_id == ronde_id))
    wedstrijden = list(result.scalars().all())
    thuisteam_ids = {w.thuisteam_id for w in wedstrijden}

    result = await db.execute(
        select(Team).where(
            Team.competitie_id == competitie.id,
            Team.actief == True,
            Team.id.in_(list(thuisteam_ids)) if thuisteam_ids else False,
        )
    )
    teams = list(result.scalars().all())

    scores: dict[tuple[uuid.UUID, uuid.UUID], float] = {}
    result = await db.execute(
        select(PlanningHistorie).where(PlanningHistorie.competitie_id == competitie.id)
    )
    for h in result.scalars().all():
        scores[(h.team_id, h.baan_id)] = h.totaal_score

    result = await db.execute(select(BaanToewijzing).where(BaanToewijzing.ronde_id == ronde_id))
    existing_toewijzingen = list(result.scalars().all())
    for t in existing_toewijzingen:
        await db.delete(t)
    await db.commit()

    toewijzingen = []
    toegewezen_team_ids: set[uuid.UUID] = set()

    for baan in banen:
        if not teams:
            break

        beschikbare_teams = [t for t in teams if t.id not in toegewezen_team_ids]
        if not beschikbare_teams:
            break

        gekozen_team = min(
            beschikbare_teams,
            key=lambda t: scores.get((t.id, baan.id), 0),
        )

        toewijzing = BaanToewijzing(
            ronde_id=ronde.id,
            team_id=gekozen_team.id,
            baan_id=baan.id,
        )
        db.add(toewijzing)
        toewijzingen.append(toewijzing)
        toegewezen_team_ids.add(gekozen_team.id)

    await db.commit()

    for t in toewijzingen:
        await db.refresh(t)

    return toewijzingen


async def update_planning_historie(ronde_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Wordt aangeroepen na het publiceren van een ronde.
    """
    result = await db.execute(select(Speelronde).where(Speelronde.id == ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde:
        return

    competitie = ronde.competitie
    if not competitie:
        return

    result = await db.execute(select(BaanToewijzing).where(BaanToewijzing.ronde_id == ronde_id))
    toewijzingen = list(result.scalars().all())

    for t in toewijzingen:
        result = await db.execute(select(Baan).where(Baan.id == t.baan_id))
        baan = result.scalar_one_or_none()
        if not baan:
            continue

        result = await db.execute(
            select(PlanningHistorie).where(
                PlanningHistorie.competitie_id == competitie.id,
                PlanningHistorie.team_id == t.team_id,
                PlanningHistorie.baan_id == t.baan_id,
            )
        )
        historie = result.scalar_one_or_none()

        if not historie:
            historie = PlanningHistorie(
                club_id=baan.club_id,
                competitie_id=competitie.id,
                team_id=t.team_id,
                baan_id=baan.id,
                aantal_keer=0,
                totaal_score=0,
            )
            db.add(historie)

        historie.aantal_keer += 1
        historie.totaal_score += baan.prioriteit_score

    await db.commit()


async def get_historie_heatmap(competitie_id: uuid.UUID, db: AsyncSession) -> dict:
    """
    Returns a heatmap: {team_id: {baan_id: aantal_keer}}
    """
    result = await db.execute(
        select(PlanningHistorie).where(PlanningHistorie.competitie_id == competitie_id)
    )
    historie = list(result.scalars().all())

    heatmap: dict[uuid.UUID, dict[uuid.UUID, int]] = {}
    for h in historie:
        if h.team_id not in heatmap:
            heatmap[h.team_id] = {}
        heatmap[h.team_id][h.baan_id] = h.aantal_keer

    return heatmap
