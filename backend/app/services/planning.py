import uuid
from datetime import date, time
from typing import Protocol

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Baan,
    BaanToewijzing,
    Club,
    Competitie,
    PlanningHistorie,
    Speelronde,
    ToewijzingSnapshot,
    Wedstrijd,
)
from app.logging_config import get_logger

logger = get_logger("planning")


class PlanningResult(Protocol):
    """Protocol for planning results to support both preview and apply."""

    toewijzingen: list[BaanToewijzing]
    conflicten: list[dict]


async def get_standaard_tijdslot_config(competitie_id: uuid.UUID, db: AsyncSession) -> dict:
    """
    Haalt de standaard tijdslot configuratie op voor een competitie.
    """
    logger.debug("fetching_tijdslot_config", competitie_id=str(competitie_id))
    result = await db.execute(select(Competitie).where(Competitie.id == competitie_id))
    competitie = result.scalar_one_or_none()
    if not competitie:
        logger.warning("competitie_not_found", competitie_id=str(competitie_id))
        raise ValueError(f"Competitie {competitie_id} not found")

    return {
        "standaard_starttijden": [t.isoformat() for t in (competitie.standaard_starttijden or [])],
        "eerste_datum": competitie.eerste_datum.isoformat() if competitie.eerste_datum else None,
        "hergebruik_configuratie": competitie.hergebruik_configuratie,
    }


async def detecteer_tijdslot_conflicten(
    baan_id: uuid.UUID,
    datum: date,
    tijdslot_start: time,
    tijdslot_eind: time | None = None,
    exclude_toewijzing_id: uuid.UUID | None = None,
    db: AsyncSession | None = None,
) -> list[dict]:
    """
    Detecteert conflicterende tijdslots op dezelfde baan op een specifieke datum.
    """
    if not db:
        return []

    # Join with Speelronde to filter by date
    query = (
        select(BaanToewijzing)
        .join(Speelronde)
        .where(
            BaanToewijzing.baan_id == baan_id,
            Speelronde.datum == datum,
        )
    )

    if exclude_toewijzing_id:
        query = query.where(BaanToewijzing.id != exclude_toewijzing_id)

    result = await db.execute(query)
    all_toewijzingen = list(result.scalars().all())

    conflicten = []

    # Simple overlap check
    new_start_min = tijdslot_start.hour * 60 + tijdslot_start.minute
    new_end_min = (
        (tijdslot_eind.hour * 60 + tijdslot_eind.minute) if tijdslot_eind else new_start_min + 60
    )

    for bestaande in all_toewijzingen:
        b_start_min = bestaande.tijdslot_start.hour * 60 + bestaande.tijdslot_start.minute
        b_end_min = (
            (bestaande.tijdslot_eind.hour * 60 + bestaande.tijdslot_eind.minute)
            if bestaande.tijdslot_eind
            else b_start_min + 60
        )

        # Check for overlap: max(start) < min(end)
        if max(new_start_min, b_start_min) < min(new_end_min, b_end_min):
            conflicten.append(
                {
                    "type": "overlap",
                    "baan_id": str(baan_id),
                    "bestaand_tijdslot": f"{bestaande.tijdslot_start.strftime('%H:%M')} - {(bestaande.tijdslot_eind.strftime('%H:%M') if bestaande.tijdslot_eind else '?')}",
                    "message": f"Overlap op baan {baan_id} met bestaand tijdslot {bestaande.tijdslot_start.isoformat()}",
                }
            )

    return conflicten


async def plan_competitie(
    competitie_id: uuid.UUID,
    db: AsyncSession,
    ronde_ids: list[uuid.UUID] | None = None,
    apply: bool = False,
) -> dict:
    """
    Slim planningsalgoritme dat de hele competitie (of specifieke rondes) plant.
    Houdt rekening met:
    - Max thuisteams per dag (club level)
    - Baan beschikbaarheid (over alle competities heen)
    - Geen zelfde baan twee keer achter elkaar voor een team
    - Eerlijke verdeling van goede banen
    """
    logger.info("starting_competitie_planning", competitie_id=str(competitie_id), apply=apply)

    # 1. Fetch competition, club and all rounds
    result = await db.execute(
        select(Competitie)
        .options(selectinload(Competitie.club))
        .where(Competitie.id == competitie_id)
    )
    competitie = result.scalar_one_or_none()
    if not competitie:
        logger.error("competitie_not_found_for_planning", competitie_id=str(competitie_id))
        raise ValueError("Competitie not found")

    club = competitie.club
    logger.debug("found_club_for_planning", club_id=str(club.id), club_name=club.naam)

    query = select(Speelronde).where(Speelronde.competitie_id == competitie_id)
    if ronde_ids:
        query = query.where(Speelronde.id.in_(ronde_ids))
    query = query.order_by(Speelronde.datum.asc())

    result = await db.execute(query)
    rondes = list(result.scalars().all())

    # 2. Fetch all active courts for the club
    result = await db.execute(
        select(Baan)
        .where(Baan.club_id == club.id, Baan.actief)
        .order_by(Baan.prioriteit_score.desc())
    )
    banen = list(result.scalars().all())

    # 3. Fetch existing history and current allocations for the dates involved
    dates = [r.datum for r in rondes]

    # Fetch all allocations on these dates to avoid conflicts with OTHER competitions
    result = await db.execute(
        select(BaanToewijzing)
        .join(Speelronde)
        .where(Speelronde.datum.in_(dates), Speelronde.club_id == club.id)
        .options(selectinload(BaanToewijzing.ronde))
    )
    existing_allocations = list(result.scalars().all())

    # Organize existing allocations by date and court
    # date -> court_id -> [list of (start, end)]
    occupied_slots: dict[date, dict[uuid.UUID, list[tuple[time, time]]]] = {}
    for alloc in existing_allocations:
        # If we are replanning this competition, don't count its own existing allocations
        if alloc.ronde.competitie_id == competitie_id:
            continue

        d = alloc.ronde.datum
        if d not in occupied_slots:
            occupied_slots[d] = {}
        if alloc.baan_id not in occupied_slots[d]:
            occupied_slots[d][alloc.baan_id] = []

        start = alloc.tijdslot_start
        end = alloc.tijdslot_eind or time((start.hour + 1) % 24, start.minute)
        occupied_slots[d][alloc.baan_id].append((start, end))

    # Fetch history
    result = await db.execute(
        select(PlanningHistorie).where(PlanningHistorie.competitie_id == competitie_id)
    )
    history_map: dict[tuple[uuid.UUID, uuid.UUID], float] = {}  # (team_id, baan_id) -> score
    for h in result.scalars().all():
        history_map[(h.team_id, h.baan_id)] = float(h.totaal_score)

    # 4. Prepare for planning
    new_toewijzingen = []
    logs = []

    # Track assignments during this planning session to respect "not twice in a row"
    last_court_per_team: dict[uuid.UUID, uuid.UUID] = {}

    # Also track current season scores for fairness within this batch
    current_season_scores: dict[uuid.UUID, float] = {}  # team_id -> total_score

    # 5. Plan round by round
    for ronde in rondes:
        # Find home teams for this round
        result = await db.execute(select(Wedstrijd).where(Wedstrijd.ronde_id == ronde.id))
        wedstrijden = list(result.scalars().all())
        thuisteam_ids = [w.thuisteam_id for w in wedstrijden]

        if not thuisteam_ids:
            continue

        # Check total home teams constraint for the club on this date
        # (This is a soft check here, we report it in logs if exceeded)
        # Count teams from other competitions
        other_teams_count = (
            await db.scalar(
                select(func.count(Wedstrijd.id))
                .join(Speelronde)
                .where(
                    Speelronde.datum == ronde.datum,
                    Speelronde.club_id == club.id,
                    Speelronde.competitie_id != competitie_id,
                )
            )
            or 0
        )
        total_planned_today = other_teams_count + len(thuisteam_ids)
        if total_planned_today > club.max_thuisteams_per_dag:
            logs.append(
                {
                    "ronde_id": str(ronde.id),
                    "datum": ronde.datum.isoformat(),
                    "severity": "warning",
                    "message": f"Maximum aantal thuisteams ({club.max_thuisteams_per_dag}) overschreden op deze dag (totaal {total_planned_today}).",
                }
            )

        # Sort teams to give priority to those with lower cumulative scores (fairness)
        thuisteam_ids.sort(key=lambda tid: current_season_scores.get(tid, 0))

        standaard_tijden = competitie.standaard_starttijden or [time(19, 0)]

        assigned_in_ronde = 0
        for idx, team_id in enumerate(thuisteam_ids):
            # Try to find a court
            # Heuristic: pick the best court (highest priority_score) that is:
            # 1. Not occupied
            # 2. Not the same as last round for this team
            # 3. Balances the scores

            best_baan = None
            best_tijd = None

            # Simple strategy: try times in order
            found = False
            for t_start in standaard_tijden:
                t_end = time((t_start.hour + 1) % 24, t_start.minute)

                # Check courts
                for baan in banen:
                    # Check if occupied on this date/time
                    is_occupied = False
                    if ronde.datum in occupied_slots and baan.id in occupied_slots[ronde.datum]:
                        for occ_start, occ_end in occupied_slots[ronde.datum][baan.id]:
                            if max(t_start, occ_start) < min(t_end, occ_end):
                                is_occupied = True
                                break

                    if is_occupied:
                        continue

                    # Check "not twice in arow"
                    if last_court_per_team.get(team_id) == baan.id:
                        # Continue to see if there's another court, but keep this as fallback if needed
                        # For now, let's just skip it if possible
                        if len(banen) > 1:
                            continue

                    # We found a candidate
                    best_baan = baan
                    best_tijd = t_start
                    found = True
                    break

                if found:
                    break

            if best_baan:
                toewijzing = BaanToewijzing(
                    id=uuid.uuid4(),
                    ronde_id=ronde.id,
                    team_id=team_id,
                    baan_id=best_baan.id,
                    tijdslot_start=best_tijd,
                    tijdslot_eind=time((best_tijd.hour + 1) % 24, best_tijd.minute),
                )
                new_toewijzingen.append(toewijzing)

                # Update tracking state
                last_court_per_team[team_id] = best_baan.id
                current_season_scores[team_id] = (
                    current_season_scores.get(team_id, 0) + best_baan.prioriteit_score
                )

                # Mark as occupied for subsequent teams in the same round
                if ronde.datum not in occupied_slots:
                    occupied_slots[ronde.datum] = {}
                if best_baan.id not in occupied_slots[ronde.datum]:
                    occupied_slots[ronde.datum][best_baan.id] = []
                occupied_slots[ronde.datum][best_baan.id].append(
                    (best_tijd, time((best_tijd.hour + 1) % 24, best_tijd.minute))
                )

                assigned_in_ronde += 1
            else:
                logs.append(
                    {
                        "ronde_id": str(ronde.id),
                        "datum": ronde.datum.isoformat(),
                        "severity": "error",
                        "message": f"Kon geen baan vinden voor team {team_id} op {ronde.datum}.",
                    }
                )

    # 6. Apply to DB if requested
    if apply:
        # Delete old assignments for these rounds
        for ronde in rondes:
            await db.execute(
                BaanToewijzing.__table__.delete().where(BaanToewijzing.ronde_id == ronde.id)
            )

        # Add new ones
        for t in new_toewijzingen:
            db.add(t)

        await db.commit()

    # 7. Return summary
    logger.info(
        "competitie_planning_completed",
        competitie_id=str(competitie_id),
        counts={
            "rondes": len(rondes),
            "toewijzingen": len(new_toewijzingen),
            "errors": len([log for log in logs if log["severity"] == "error"]),
            "warnings": len([log for log in logs if log["severity"] == "warning"]),
        },
    )

    return {
        "success": True,
        "toewijzingen": [
            {
                "id": str(t.id),
                "ronde_id": str(t.ronde_id),
                "team_id": str(t.team_id),
                "baan_id": str(t.baan_id),
                "tijdslot_start": t.tijdslot_start.isoformat(),
                "tijdslot_eind": t.tijdslot_eind.isoformat() if t.tijdslot_eind else None,
            }
            for t in new_toewijzingen
        ],
        "logs": logs,
        "counts": {
            "rondes": len(rondes),
            "toewijzingen": len(new_toewijzingen),
            "errors": len([log for log in logs if log["severity"] == "error"]),
            "warnings": len([log for log in logs if log["severity"] == "warning"]),
        },
    }


async def genereer_indeling(ronde_id: uuid.UUID, db: AsyncSession) -> list[BaanToewijzing]:
    """
    Wrapper om plan_competitie voor enkelvoudige ronde generatie.
    """
    result = await db.execute(select(Speelronde).where(Speelronde.id == ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde:
        raise ValueError(f"Speelronde {ronde_id} not found")

    await plan_competitie(ronde.competitie_id, db, ronde_ids=[ronde_id], apply=True)

    # Refetch objects to return them as requested by the original signature
    final_result = await db.execute(
        select(BaanToewijzing).where(BaanToewijzing.ronde_id == ronde_id)
    )
    return list(final_result.scalars().all())


async def update_planning_historie(ronde_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Wordt aangeroepen na het publiceren van een ronde.
    """
    result = await db.execute(
        select(Speelronde)
        .options(selectinload(Speelronde.competitie))
        .where(Speelronde.id == ronde_id)
    )
    ronde = result.scalar_one_or_none()
    if not ronde or not ronde.competitie:
        return

    result = await db.execute(select(BaanToewijzing).where(BaanToewijzing.ronde_id == ronde_id))
    toewijzingen = list(result.scalars().all())

    if not toewijzingen:
        return

    baan_ids = list({t.baan_id for t in toewijzingen})
    team_ids = list({t.team_id for t in toewijzingen})

    result = await db.execute(select(Baan).where(Baan.id.in_(baan_ids)))
    banen = {b.id: b for b in result.scalars().all()}

    # Batch fetch existing history
    result = await db.execute(
        select(PlanningHistorie).where(
            PlanningHistorie.competitie_id == ronde.competitie_id,
            PlanningHistorie.team_id.in_(team_ids),
            PlanningHistorie.baan_id.in_(baan_ids),
        )
    )
    bestaande_historie = {(h.team_id, h.baan_id): h for h in result.scalars().all()}

    for t in toewijzingen:
        baan = banen.get(t.baan_id)
        if not baan:
            continue

        historie = bestaande_historie.get((t.team_id, t.baan_id))

        if not historie:
            historie = PlanningHistorie(
                club_id=baan.club_id,
                competitie_id=ronde.competitie_id,
                team_id=t.team_id,
                baan_id=baan.id,
                aantal_keer=0,
                totaal_score=0,
            )
            db.add(historie)
            bestaande_historie[(t.team_id, t.baan_id)] = historie

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


async def bereken_banenvereisten(datum: date, club_id: uuid.UUID, db: AsyncSession) -> dict:
    """
    Bereken baanvereisten voor een specifieke datum en club.
    """
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise ValueError(f"Club {club_id} not found")

    result = await db.execute(select(Baan).where(Baan.club_id == club_id, Baan.actief))
    actieve_banen = list(result.scalars().all())
    count_banen = len(actieve_banen)

    result = await db.execute(
        select(Speelronde)
        .options(
            selectinload(Speelronde.competitie),
            selectinload(Speelronde.wedstrijden).selectinload(Wedstrijd.thuisteam),
        )
        .where(
            Speelronde.datum == datum,
            Speelronde.club_id == club_id,
        )
    )
    rondes = list(result.scalars().all())

    competities_overzicht = []
    total_banen_nodig = 0

    for ronde in rondes:
        if not ronde.competitie:
            continue

        thuisteams = set()
        for w in ronde.wedstrijden:
            if w.thuisteam_id:
                thuisteams.add(w.thuisteam_id)

        banen_nodig = len(thuisteams)
        total_banen_nodig += banen_nodig

        if banen_nodig > 0:
            # We assume one home team per competition per round for the overview
            # If there are multiple, we pick the first one's name as representative
            team_naam = "Meerdere teams"
            speelklasse = ""
            voorkeur_tijd = "19:00"

            if ronde.wedstrijden:
                first_thuisteam = next(
                    (w.thuisteam for w in ronde.wedstrijden if w.thuisteam), None
                )
                if first_thuisteam:
                    team_naam = first_thuisteam.naam
                    speelklasse = first_thuisteam.speelklasse or ""

            if ronde.competitie.standaard_starttijden:
                voorkeur_tijd = ronde.competitie.standaard_starttijden[0].strftime("%H:%M")

            competities_overzicht.append(
                {
                    "competitie_id": str(ronde.competitie.id),
                    "competitie_naam": ronde.competitie.naam,
                    "team_naam": team_naam,
                    "divisie": speelklasse,
                    "banen_nodig": banen_nodig,
                    "voorkeur_tijd": voorkeur_tijd,
                    "speeldag": ronde.competitie.speeldag,
                }
            )

    return {
        "datum": datum.isoformat(),
        "club_id": str(club_id),
        "club_naam": club.naam,
        "beschikbare_banen": count_banen,
        "max_thuisteams_per_dag": club.max_thuisteams_per_dag,
        "competities": competities_overzicht,
        "totaal_banen_nodig": total_banen_nodig,
        "conflict_warning": total_banen_nodig > count_banen,
        "beschikbaarheid": {},
    }


async def detecteer_conflicten(datum: date, club_id: uuid.UUID, db: AsyncSession) -> dict:
    """
    Detecteer conflicten tussen competities en beschikbare banen op een gegeven datum.
    """
    dagoverzicht = await bereken_banenvereisten(datum, club_id, db)
    club_max = dagoverzicht["max_thuisteams_per_dag"]
    total_thuisteams = len(dagoverzicht["competities"])

    conflicten = []
    if total_thuisteams > club_max:
        conflicten.append(
            {
                "type": "max_thuisteams",
                "severity": "error",
                "message": f"Aantal thuisteams ({total_thuisteams}) overschrijdt maximum ({club_max})",
                "suggestie": "Overweeg om uitwedstrijden te verplaatsen of speeltijd aan te passen",
            }
        )

    if dagoverzicht["conflict_warning"]:
        conflicten.append(
            {
                "type": "baan_tekort",
                "severity": "error",
                "message": f"Niet genoeg banen: {dagoverzicht['totaal_banen_nodig']} nodig, {dagoverzicht['beschikbare_banen']} beschikbaar",
                "suggestie": "Plan minder thuisteams of verdeel over meerdere tijdblokken",
            }
        )

    return {
        "datum": dagoverzicht["datum"],
        "club_id": dagoverzicht["club_id"],
        "has_conflicts": len(conflicten) > 0,
        "conflicten": conflicten,
        "total_banen_nodig": dagoverzicht["totaal_banen_nodig"],
        "beschikbare_banen": dagoverzicht["beschikbare_banen"],
    }


async def plan_banen(dagoverzicht: dict, db: AsyncSession) -> dict:
    """
    Voert het planning-algoritme uit om banen toe te wijzen over alle competities.
    Dit is een vereenvoudigde versie voor het dagoverzicht.
    """
    beschikbare_banen = dagoverzicht.get("beschikbare_banen", 0)
    competities = dagoverzicht.get("competities", [])

    # Sorteer op banen_nodig (desc) om 'moeilijke' competities eerst te doen
    gesorteerd = sorted(competities, key=lambda x: x.get("banen_nodig", 1), reverse=True)

    toewijzingen = []
    gebruikte_banen = 0

    for comp in gesorteerd:
        banen_nodig = comp.get("banen_nodig", 1)
        if gebruikte_banen + banen_nodig <= beschikbare_banen:
            toewijzingen.append(
                {
                    "competitie_id": comp.get("competitie_id"),
                    "team_naam": comp.get("team_naam"),
                    "toegewezen_banen": banen_nodig,
                    "tijdblok": comp.get("voorkeur_tijd", "19:00"),
                    "status": "toegewezen",
                }
            )
            gebruikte_banen += banen_nodig
        else:
            toewijzingen.append(
                {
                    "competitie_id": comp.get("competitie_id"),
                    "team_naam": comp.get("team_naam"),
                    "toegewezen_banen": 0,
                    "tijdblok": None,
                    "status": "conflict",
                }
            )

    return {
        "datum": dagoverzicht.get("datum"),
        "club_id": dagoverzicht.get("club_id"),
        "total_banen": beschikbare_banen,
        "used_banen": gebruikte_banen,
        "toewijzingen": toewijzingen,
        "unassigned": [c for c in toewijzingen if c["status"] == "conflict"],
    }


MAX_SNAPSHOTS_PER_RONDE = 5


async def save_snapshot(
    ronde_id: uuid.UUID,
    club_id: uuid.UUID,
    aanleiding: str,
    db: AsyncSession,
    user_id: uuid.UUID | None = None,
) -> ToewijzingSnapshot | None:
    """
    Slaat een snapshot op van de huidige toewijzingen voor een ronde.
    Gooit oudste weg als er al MAX_SNAPSHOTS_PER_RONDE zijn.
    Returnt None als er geen toewijzingen zijn om op te slaan.
    """
    result = await db.execute(select(BaanToewijzing).where(BaanToewijzing.ronde_id == ronde_id))
    toewijzingen = list(result.scalars().all())

    if not toewijzingen:
        return None

    snapshot_data = [
        {
            "team_id": str(t.team_id),
            "baan_id": str(t.baan_id),
            "tijdslot_start": t.tijdslot_start.isoformat() if t.tijdslot_start else None,
            "tijdslot_eind": t.tijdslot_eind.isoformat() if t.tijdslot_eind else None,
            "notitie": t.notitie,
        }
        for t in toewijzingen
    ]

    # Prune oldest if at limit
    existing = await db.execute(
        select(ToewijzingSnapshot)
        .where(ToewijzingSnapshot.ronde_id == ronde_id)
        .order_by(ToewijzingSnapshot.created_at.asc())
    )
    existing_snapshots = list(existing.scalars().all())
    while len(existing_snapshots) >= MAX_SNAPSHOTS_PER_RONDE:
        await db.delete(existing_snapshots.pop(0))

    snapshot = ToewijzingSnapshot(
        ronde_id=ronde_id,
        club_id=club_id,
        aangemaakt_door=user_id,
        aanleiding=aanleiding,
        snapshot_data=snapshot_data,
    )
    db.add(snapshot)
    await db.flush()
    return snapshot


async def get_snapshots(ronde_id: uuid.UUID, db: AsyncSession) -> list[ToewijzingSnapshot]:
    """Haalt alle snapshots voor een ronde op, nieuwste eerst."""
    result = await db.execute(
        select(ToewijzingSnapshot)
        .where(ToewijzingSnapshot.ronde_id == ronde_id)
        .order_by(ToewijzingSnapshot.created_at.desc())
    )
    return list(result.scalars().all())


async def herstel_snapshot(
    snapshot_id: uuid.UUID,
    ronde_id: uuid.UUID,
    db: AsyncSession,
) -> list[BaanToewijzing]:
    """
    Herstelt de toewijzingen voor een ronde vanuit een snapshot.
    Verwijdert eerst alle huidige toewijzingen en maakt nieuwe aan.
    """
    result = await db.execute(
        select(ToewijzingSnapshot).where(
            ToewijzingSnapshot.id == snapshot_id,
            ToewijzingSnapshot.ronde_id == ronde_id,
        )
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise ValueError(f"Snapshot {snapshot_id} niet gevonden voor ronde {ronde_id}")

    await db.execute(BaanToewijzing.__table__.delete().where(BaanToewijzing.ronde_id == ronde_id))

    from datetime import time as dt_time

    new_toewijzingen = []
    for entry in snapshot.snapshot_data:
        t_start = (
            dt_time.fromisoformat(entry["tijdslot_start"])
            if entry.get("tijdslot_start")
            else dt_time(19, 0)
        )
        t_eind = (
            dt_time.fromisoformat(entry["tijdslot_eind"]) if entry.get("tijdslot_eind") else None
        )
        toewijzing = BaanToewijzing(
            ronde_id=ronde_id,
            team_id=uuid.UUID(entry["team_id"]),
            baan_id=uuid.UUID(entry["baan_id"]),
            tijdslot_start=t_start,
            tijdslot_eind=t_eind,
            notitie=entry.get("notitie"),
        )
        db.add(toewijzing)
        new_toewijzingen.append(toewijzing)

    await db.commit()
    return new_toewijzingen


async def validate_club_max_thuisteams(club_id: uuid.UUID, datum: date, db: AsyncSession) -> bool:
    """
    Valideer of het aantal thuisteams op een datum niet de club-instelling overschrijdt.
    """
    dagoverzicht = await bereken_banenvereisten(datum, club_id, db)
    return len(dagoverzicht["competities"]) <= dagoverzicht["max_thuisteams_per_dag"]
