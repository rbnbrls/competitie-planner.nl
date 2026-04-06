import uuid
from datetime import date, time, timedelta
from typing import Optional

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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


async def get_standaard_tijdslot_config(competitie_id: uuid.UUID, db: AsyncSession) -> dict:
    """
    Haalt de standaard tijdslot configuratie op voor een competitie.
    """
    result = await db.execute(select(Competitie).where(Competitie.id == competitie_id))
    competitie = result.scalar_one_or_none()
    if not competitie:
        raise ValueError(f"Competitie {competitie_id} not found")

    return {
        "standaard_starttijden": [t.isoformat() for t in (competitie.standaard_starttijden or [])],
        "eerste_datum": competitie.eerste_datum.isoformat() if competitie.eerste_datum else None,
        "hergebruik_configuratie": competitie.hergebruik_configuratie,
    }


async def pas_tijdslots_toe(ronde_id: uuid.UUID, db: AsyncSession) -> list[BaanToewijzing]:
    """
    Wijst automatisch tijdslots toe aan baantoewijzingen op basis van standaard tijden.
    """
    result = await db.execute(select(Speelronde).where(Speelronde.id == ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde:
        raise ValueError(f"Speelronde {ronde_id} not found")

    competitie = ronde.competitie
    if not competitie:
        raise ValueError("Competitie not found")

    standaard_tijden = competitie.standaard_starttijden or []
    if not standaard_tijden:
        standaard_tijden = [time(19, 0)]

    result = await db.execute(select(BaanToewijzing).where(BaanToewijzing.ronde_id == ronde_id))
    toewijzingen = list(result.scalars().all())

    for idx, toewijzing in enumerate(toewijzingen):
        tijd_index = idx % len(standaard_tijden)
        toewijzing.tijdslot_start = standaard_tijden[tijd_index]
        start_tijd = standaard_tijden[tijd_index]
        toewijzing.tijdslot_eind = time(start_tijd.hour + 1, start_tijd.minute)

    await db.commit()
    for t in toewijzingen:
        await db.refresh(t)

    return toewijzingen


async def detecteer_tijdslot_conflicten(
    baan_id: uuid.UUID,
    tijdslot_start: time,
    tijdslot_eind: time | None,
    ronde_id: uuid.UUID | None = None,
    db: AsyncSession = None,
) -> list[dict]:
    """
    Detecteert conflicterende tijdslots op dezelfde baan.
    Als ronde_id wordt meegegeven, wordt deze uitgesloten van controle.
    """
    if not db:
        return []

    result = await db.execute(
        select(BaanToewijzing).where(
            BaanToewijzing.baan_id == baan_id,
        )
    )
    all_toewijzingen = list(result.scalars().all())

    if ronde_id:
        all_toewijzingen = [t for t in all_toewijzingen if t.ronde_id != ronde_id]

    conflicten = []
    for bestaande in all_toewijzingen:
        if bestaande.tijdslot_eind is None:
            bestaande_eind = (bestaande.tijdslot_start.hour + 1, bestaande.tijdslot_start.minute)
        else:
            bestaande_eind = (bestaande.tijdslot_eind.hour, bestaande.tijdslot_eind.minute)

        new_eind = (
            (tijdslot_eind.hour, tijdslot_eind.minute)
            if tijdslot_eind
            else (tijdslot_start.hour + 1, tijdslot_start.minute)
        )

        if not (
            tijdslot_start >= bestaande.tijdslot_start
            and time(new_eind[0], new_eind[1]) <= time(bestaande_eind[0], bestaande_eind[1])
        ):
            if not (
                time(new_eind[0], new_eind[1]) <= bestaande.tijdslot_start
                or tijdslot_start >= time(bestaande_eind[0], bestaande_eind[1])
            ):
                conflicten.append(
                    {
                        "type": "overlap",
                        "bestaand_tijdslot": bestaande.tijdslot_start.isoformat(),
                        "message": f"Overlap met bestaand tijdslot {bestaande.tijdslot_start.isoformat()}",
                    }
                )

    return conflicten


async def vind_beschikbare_combinatie(
    baan_id: uuid.UUID,
    tijdslot_start: time,
    db: AsyncSession,
    exclude_ronde_id: uuid.UUID | None = None,
) -> dict:
    """
    Vindt de eerstvolgende beschikbare combinatie van baan en tijdslot.
    """
    result = await db.execute(select(Baan).where(Baan.id == baan_id))
    baan = result.scalar_one_or_none()
    if not baan:
        return {"beschikbaar": False, "message": "Baan niet gevonden"}

    result = await db.execute(
        select(BaanToewijzing).where(
            BaanToewijzing.baan_id == baan_id,
        )
    )
    existing = list(result.scalars().all())
    if exclude_ronde_id:
        existing = [e for e in existing if e.ronde_id != exclude_ronde_id]

    existing_times = [(e.tijdslot_start, e.tijdslot_eind) for e in existing]

    new_eind = time(tijdslot_start.hour + 1, tijdslot_start.minute)
    has_conflict = any(
        not (tijdslot_start >= e[0] and new_eind <= (e[1] or time(e[0].hour + 1, e[0].minute)))
        and not (new_eind <= e[0] or tijdslot_start >= (e[1] or time(e[0].hour + 1, e[0].minute)))
        for e in existing_times
    )

    if not has_conflict:
        return {
            "beschikbaar": True,
            "baan_id": str(baan_id),
            "tijdslot_start": tijdslot_start.isoformat(),
        }

    return {"beschikbaar": False, "message": "Geen directe beschikbaarheid"}


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
        standaard_tijden = competitie.standaard_starttijden or []
        if standaard_tijden:
            tijd_index = len(toegewezen_team_ids) % len(standaard_tijden)
            toewijzing.tijdslot_start = standaard_tijden[tijd_index]
            start_tijd = standaard_tijden[tijd_index]
            toewijzing.tijdslot_eind = time(start_tijd.hour + 1, start_tijd.minute)
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


async def bereken_banenvereisten(datum: date, club_id: uuid.UUID, db: AsyncSession) -> dict:
    """
    Bereken baanvereisten voor een specifieke datum en club.
    Retourneert een geaggregeerd overzicht van alle competities die thuiswedstrijden hebben.
    """
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise ValueError(f"Club {club_id} not found")

    result = await db.execute(select(Baan).where(Baan.club_id == club_id, Baan.actief == True))
    actieve_banen = list(result.scalars().all())
    beschikbare_banen = len(actieve_banen)

    result = await db.execute(
        select(Speelronde).where(
            Speelronde.datum == datum,
            Speelronde.club_id == club_id,
        )
    )
    rondes = list(result.scalars().all())

    competities_overzicht = []
    total_banen_nodig = 0
    training_gepland = False
    vrije_spelers = False

    weekdagen = {0: "ma", 1: "di", 2: "wo", 3: "do", 4: "vr", 5: "za", 6: "zo"}
    dag_van_week = weekdagen.get(datum.weekday(), "onbekend")

    for ronde in rondes:
        result = await db.execute(select(Competitie).where(Competitie.id == ronde.competitie_id))
        competitie = result.scalar_one_or_none()
        if not competitie:
            continue

        result = await db.execute(
            select(Wedstrijd).where(
                Wedstrijd.ronde_id == ronde.id,
            )
        )
        wedstrijden = list(result.scalars().all())

        thuisteams = set()
        for w in wedstrijden:
            if w.thuisteam_id:
                thuisteams.add(w.thuisteam_id)

        banen_nodig = len(thuisteams)
        total_banen_nodig += banen_nodig

        result = await db.execute(
            select(Team).where(
                Team.id.in_(list(thuisteams)) if thuisteams else False,
                Team.competitie_id == competitie.id,
            )
        )
        teams = list(result.scalars().all())

        voorkeur_tijd = "19:00"
        if competitie.speeldag == dag_van_week:
            voorkeur_tijd = "19:00"
        elif competitie.speeldag == "vr":
            voorkeur_tijd = "19:30"
        elif competitie.speeldag == "za":
            voorkeur_tijd = "13:00"

        if teams:
            competities_overzicht.append(
                {
                    "competitie_id": str(competitie.id),
                    "team_naam": teams[0].naam if teams else "Onbekend",
                    "competitie_naam": competitie.naam,
                    "divisie": "",
                    "banen_nodig": banen_nodig,
                    "voorkeur_tijd": voorkeur_tijd,
                    "speeldag": competitie.speeldag,
                }
            )

    beschikbaarheid = {}
    for tijdblok in ["18:00", "19:00", "20:00"]:
        beschikbaarheid[tijdblok] = beschikbare_banen

    conflict_warning = total_banen_nodig > beschikbare_banen

    return {
        "datum": datum.isoformat(),
        "club_id": str(club_id),
        "club_naam": club.naam,
        "beschikbare_banen": beschikbare_banen,
        "max_thuisteams_per_dag": club.max_thuisteams_per_dag,
        "competities": competities_overzicht,
        "training_gepland": training_gepland,
        "vrije_spelers": vrije_spelers,
        "conflict_warning": conflict_warning,
        "totaal_banen_nodig": total_banen_nodig,
        "beschikbaarheid": beschikbaarheid,
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
    Planning algoritme voor banen toewijzing over meerdere competities.
    First-fit decreasing heuristic met penalty-function.
    """
    competities = dagoverzicht.get("competities", [])
    beschikbare_banen = dagoverzicht.get("beschikbare_banen", 4)

    gesorteerd = sorted(competities, key=lambda c: c.get("banen_nodig", 0), reverse=True)

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


async def validate_club_max_thuisteams(club_id: uuid.UUID, datum: date, db: AsyncSession) -> bool:
    """
    Valideer of het aantal thuisteams op een datum niet de club-instelling overschrijdt.
    """
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        return False

    dagoverzicht = await bereken_banenvereisten(datum, club_id, db)
    total_thuisteams = len(dagoverzicht["competities"])

    return total_thuisteams <= club.max_thuisteams_per_dag
