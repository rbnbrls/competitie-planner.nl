import uuid
from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, Response
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db import get_db
from app.exceptions import ResourceNotFoundError
from app.models import BaanToewijzing, Competitie, Speelronde, Team, Wedstrijd

router = APIRouter(tags=["calendar"])


def format_ical_datetime(dt: datetime) -> str:
    # iCal expects UTC time in YYYYMMDDTHHMMSSZ format
    return dt.strftime("%Y%m%dT%H%M%SZ")


def format_ical_date(d: date) -> str:
    return d.strftime("%Y%m%d")


def generate_ics(events: list[dict], calendar_name: str) -> str:
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Competitie Planner//NL",
        f"X-WR-CALNAME:{calendar_name}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

    now_str = format_ical_datetime(datetime.now(UTC))

    for event in events:
        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:{event['uid']}")
        lines.append(f"DTSTAMP:{now_str}")

        if event.get("all_day"):
            lines.append(f"DTSTART;VALUE=DATE:{format_ical_date(event['start'])}")
            # For all-day events, DTEND is the following day according to RFC 5545
            end_date = event["start"] + timedelta(days=1)
            lines.append(f"DTEND;VALUE=DATE:{format_ical_date(end_date)}")
        else:
            # Assume local time for DTSTART if no timezone info, but ideally we should provide UTC
            # For simplicity in this app, we'll treat the stored times as "local" but output as UTC-ish or floating
            # Better: output as local time without Z to let the calendar app handle it
            start_str = event["start"].strftime("%Y%m%dT%H%M%S")
            lines.append(f"DTSTART:{start_str}")
            if event.get("end"):
                end_str = event["end"].strftime("%Y%m%dT%H%M%S")
                lines.append(f"DTEND:{end_str}")
            else:
                # Default duration 2 hours
                end_dt = event["start"] + timedelta(hours=2)
                end_str = end_dt.strftime("%Y%m%dT%H%M%S")
                lines.append(f"DTEND:{end_str}")

        lines.append(f"SUMMARY:{event['summary']}")
        if event.get("description"):
            # Escape special characters
            desc = (
                str(event["description"])
                .replace("\\", "\\\\")
                .replace(",", "\\,")
                .replace(";", "\\;")
                .replace("\n", "\\n")
            )
            lines.append(f"DESCRIPTION:{desc}")
        if event.get("location"):
            loc = (
                str(event["location"])
                .replace("\\", "\\\\")
                .replace(",", "\\,")
                .replace(";", "\\;")
                .replace("\n", "\\n")
            )
            lines.append(f"LOCATION:{loc}")

        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)


@router.get("/calendar/competition/{competition_id}.ics", response_class=Response)
async def get_competition_calendar(
    competition_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    # Fetch competition
    result = await db.execute(
        select(Competitie)
        .options(joinedload(Competitie.club))
        .where(Competitie.id == competition_id)
    )
    competitie = result.scalar_one_or_none()
    if not competitie:
        raise ResourceNotFoundError("Competitie niet gevonden")

    # Fetch all published rounds
    result = await db.execute(
        select(Speelronde).where(
            and_(Speelronde.competitie_id == competition_id, Speelronde.status == "gepubliceerd")
        )
    )
    rondes = result.scalars().all()
    ronde_ids = [r.id for r in rondes]

    if not ronde_ids:
        ics_content = generate_ics([], f"Competitie: {competitie.naam}")
        return Response(content=ics_content, media_type="text/calendar")

    # Fetch court assignments for these rounds
    result = await db.execute(
        select(BaanToewijzing)
        .options(
            joinedload(BaanToewijzing.baan),
            joinedload(BaanToewijzing.team),
            joinedload(BaanToewijzing.ronde),
        )
        .where(BaanToewijzing.ronde_id.in_(ronde_ids))
    )
    toewijzingen = result.scalars().all()

    # Fetch matches for these rounds
    result = await db.execute(
        select(Wedstrijd)
        .options(
            joinedload(Wedstrijd.ronde),
            joinedload(Wedstrijd.thuisteam),
            joinedload(Wedstrijd.uitteam),
        )
        .where(Wedstrijd.ronde_id.in_(ronde_ids))
    )
    wedstrijden = result.scalars().all()

    # Map matches by (ronde_id, thuisteam_id) to link court assignments to opponents
    matches_map = {}
    for w in wedstrijden:
        matches_map[(w.ronde_id, w.thuisteam_id)] = w

    events = []
    for t in toewijzingen:
        ronde = t.ronde
        match = matches_map.get((t.ronde_id, t.team_id))

        start_date = ronde.datum
        start_time = t.tijdslot_start
        end_time = t.tijdslot_eind
        location = f"{competitie.club.naam} - Baan {t.baan.nummer}"
        if t.baan.naam:
            location += f" ({t.baan.naam})"

        opponent = match.uitteam.naam if match else "TBD"
        summary = f"{t.team.naam} vs {opponent}"
        description = f"Competitie: {competitie.naam}\nOrganisatie: {competitie.club.naam}"
        if t.notitie:
            description += f"\nPlan notitie: {t.notitie}"
        if match and match.notitie:
            description += f"\nMatch notitie: {match.notitie}"

        start_dt = datetime.combine(start_date, start_time)
        end_dt = datetime.combine(start_date, end_time) if end_time else None

        events.append(
            {
                "uid": f"toewijzing-{t.id}@competitie-planner.nl",
                "start": start_dt,
                "end": end_dt,
                "summary": summary,
                "description": description,
                "location": location,
                "all_day": False,
            }
        )

    ics_content = generate_ics(events, f"{competitie.club.naam} - {competitie.naam}")
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=competitie-{competition_id}.ics"},
    )


@router.get("/calendar/team/{team_token}.ics", response_class=Response)
async def get_team_calendar(
    team_token: str,
    db: AsyncSession = Depends(get_db),
):
    # Fetch team
    result = await db.execute(
        select(Team)
        .options(joinedload(Team.competitie), joinedload(Team.club))
        .where(Team.public_token == team_token)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise ResourceNotFoundError("Team niet gevonden")

    # Fetch all matches for this team (home and away)
    result = await db.execute(
        select(Wedstrijd)
        .options(
            joinedload(Wedstrijd.ronde),
            joinedload(Wedstrijd.thuisteam),
            joinedload(Wedstrijd.uitteam),
        )
        .where(
            and_(
                or_(Wedstrijd.thuisteam_id == team.id, Wedstrijd.uitteam_id == team.id),
                # Access Speelronde.status via a join/subquery to filter published ones
            )
        )
    )
    wedstrijden = result.scalars().all()
    # Filter for published rounds only since standard ORM join might be more complex
    # Also fetch court assignments for home matches
    result = await db.execute(
        select(BaanToewijzing)
        .options(joinedload(BaanToewijzing.baan), joinedload(BaanToewijzing.ronde))
        .where(BaanToewijzing.team_id == team.id)
    )
    toewijzingen = result.scalars().all()
    toewijzingen_map = {t.ronde_id: t for t in toewijzingen if t.ronde.status == "gepubliceerd"}

    events = []
    for w in wedstrijden:
        if w.ronde.status != "gepubliceerd":
            continue

        is_thuis = w.thuisteam_id == team.id
        start_date = w.speeldatum or w.ronde.datum
        start_time = w.speeltijd
        end_time = None
        location = "TBD"

        if is_thuis:
            location = f"{team.club.naam}"
            t = toewijzingen_map.get(w.ronde_id)
            if t:
                start_time = t.tijdslot_start
                end_time = t.tijdslot_eind
                location += f" - Baan {t.baan.nummer}"
                if t.baan.naam:
                    location += f" ({t.baan.naam})"
        else:
            location = f"Uitwedstrijd bij {w.thuisteam.naam}"

        summary = f"{'Thuis' if is_thuis else 'Uit'} vs {w.uitteam.naam if is_thuis else w.thuisteam.naam}"
        description = f"Competitie: {team.competitie.naam}\nTeam: {team.naam}\nStatus: {w.status}"
        if w.notitie:
            description += f"\nNotitie: {w.notitie}"

        if start_time:
            start_dt = datetime.combine(start_date, start_time)
            end_dt = datetime.combine(start_date, end_time) if end_time else None
            events.append(
                {
                    "uid": f"match-{w.id}@competitie-planner.nl",
                    "start": start_dt,
                    "end": end_dt,
                    "summary": summary,
                    "description": description,
                    "location": location,
                    "all_day": False,
                }
            )
        else:
            events.append(
                {
                    "uid": f"match-{w.id}@competitie-planner.nl",
                    "start": start_date,
                    "summary": summary,
                    "description": description,
                    "location": location,
                    "all_day": True,
                }
            )

    ics_content = generate_ics(events, f"Team: {team.naam}")
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=team-{team.naam}.ics"},
    )
