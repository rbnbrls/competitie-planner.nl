from datetime import date, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db import get_db
from app.models import (
    Baan,
    BaanToewijzing,
    Club,
    Competitie,
    Speelronde,
    Team,
    User,
    Wedstrijd,
)
from app.services.tenant_auth import get_current_tenant_user
router = APIRouter(
    prefix="/tenant/dashboard",
    tags=["tenant-dashboard"]
)
class DashboardRonde(BaseModel):
    id: str
    competitie_id: str
    competitie_naam: str
    datum: str
    status: str
    is_inhaalronde: bool
    teams_zonder_baan: int
    totaal_teams: int
    week_nummer: int | None
class DashboardActie(BaseModel):
    id: str
    type: str
    titel: str
    beschrijving: str
    prioriteit: str
    ronde_id: str | None
    competitie_id: str | None
    url: str
class DashboardCompetitieVoortgang(BaseModel):
    id: str
    naam: str
    speeldag: str
    totaal_rondes: int
    gepubliceerde_rondes: int
    percentage: int
    start_datum: str
    eind_datum: str
class DashboardWaarschuwing(BaseModel):
    type: str
    titel: str
    bericht: str
    prioriteit: str
    url: str | None
class DashboardResponse(BaseModel):
    club: dict
    gebruiker: dict
    komende_rondes: list[DashboardRonde]
    acties: list[DashboardActie]
    competities_voortgang: list[DashboardCompetitieVoortgang]
    waarschuwingen: list[DashboardWaarschuwing]
    statistieken: dict
DUTCH_HOLIDAYS = {
    "2024-01-01": "Nieuwjaarsdag",
    "2024-02-14": "Valentijnsdag",
    "2024-03-29": "Goede Vrijdag",
    "2024-03-31": "Pasen",
    "2024-04-01": "Pasen",
    "2024-04-27": "Koningsdag",
    "2024-05-04": "Bevrijdingsdag",
    "2024-05-09": "Hemelvaart",
    "2024-05-19": "Pinksteren",
    "2024-05-20": "Pinksteren",
    "2024-12-25": "Kerstmis",
    "2024-12-26": "Tweede Kerstdag",
    "2025-01-01": "Nieuwjaarsdag",
    "2025-04-18": "Goede Vrijdag",
    "2025-04-20": "Pasen",
    "2025-04-21": "Pasen",
    "2025-04-27": "Koningsdag",
    "2025-05-04": "Bevrijdingsdag",
    "2025-05-29": "Hemelvaart",
    "2025-06-08": "Pinksteren",
    "2025-06-09": "Pinksteren",
    "2025-12-25": "Kerstmis",
    "2025-12-26": "Tweede Kerstdag",
    "2026-01-01": "Nieuwjaarsdag",
    "2026-01-06": "Driekoningen",
    "2026-04-03": "Goede Vrijdag",
    "2026-04-05": "Pasen",
    "2026-04-06": "Pasen",
    "2026-04-27": "Koningsdag",
    "2026-05-04": "Bevrijdingsdag",
    "2026-05-14": "Hemelvaart",
    "2026-05-24": "Pinksteren",
    "2026-05-25": "Pinksteren",
    "2026-12-25": "Kerstmis",
    "2026-12-26": "Tweede Kerstdag",
}
def get_dutch_holidays_in_range(start: date, end: date) -> list[date]:
    holidays = []
    current = start
    while current <= end:
        key = current.isoformat()
        if key in DUTCH_HOLIDAYS:
            holidays.append(current)
        current += timedelta(days=1)
    return holidays
@router.get("")
async def get_dashboard(
    current: tuple[User, Club] = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    user, club = current
    vandaag = date.today()
    komende_vijf_weken = vandaag + timedelta(days=35)
    result = await db.execute(
        select(Speelronde)
        .options(selectinload(Speelronde.competitie))
        .where(
            Speelronde.club_id == club.id,
            Speelronde.datum >= vandaag,
            Speelronde.datum <= komende_vijf_weken,
        )
        .order_by(Speelronde.datum.asc())
        .limit(5)
    )
    speelrondes = result.scalars().all()
    komende_rondes: list[DashboardRonde] = []
    ronde_ids = [r.id for r in speelrondes]
    toewijzingen_per_ronde: dict = {}
    teams_per_ronde: dict = {}
    if ronde_ids:
        result = await db.execute(
            select(BaanToewijzing).where(BaanToewijzing.ronde_id.in_(ronde_ids))
        )
        for t in result.scalars().all():
            if t.ronde_id not in toewijzingen_per_ronde:
                toewijzingen_per_ronde[t.ronde_id] = set()
            toewijzingen_per_ronde[t.ronde_id].add(t.team_id)
        result = await db.execute(select(Wedstrijd).where(Wedstrijd.ronde_id.in_(ronde_ids)))
        for w in result.scalars().all():
            if w.ronde_id not in teams_per_ronde:
                teams_per_ronde[w.ronde_id] = set()
            teams_per_ronde[w.ronde_id].add(w.thuisteam_id)
            teams_per_ronde[w.ronde_id].add(w.uitteam_id)
    for ronde in speelrondes:
        teams_in_ronde = teams_per_ronde.get(ronde.id, set())
        teams_met_baan = toewijzingen_per_ronde.get(ronde.id, set())
        teams_zonder_baan = len(teams_in_ronde) - len(teams_met_baan)
        komende_rondes.append(
            DashboardRonde(
                id=str(ronde.id),
                competitie_id=str(ronde.competitie_id),
                competitie_naam=ronde.competitie.naam,
                datum=ronde.datum.isoformat(),
                status=ronde.status,
                is_inhaalronde=ronde.is_inhaalronde,
                teams_zonder_baan=max(0, teams_zonder_baan),
                totaal_teams=len(teams_in_ronde),
                week_nummer=ronde.week_nummer,
            )
        )
    result = await db.execute(
        select(Competitie)
        .options(selectinload(Competitie.speelrondes))
        .where(
            Competitie.club_id == club.id,
            Competitie.actief,
        )
    )
    competities = result.scalars().all()
    competities_voortgang: list[DashboardCompetitieVoortgang] = []
    acties: list[DashboardActie] = []
    for comp in competities:
        totaal = len(comp.speelrondes)
        gepub = sum(1 for r in comp.speelrondes if r.status == "gepubliceerd")
        pct = int(gepub / totaal * 100) if totaal > 0 else 0
        competities_voortgang.append(
            DashboardCompetitieVoortgang(
                id=str(comp.id),
                naam=comp.naam,
                speeldag=comp.speeldag,
                totaal_rondes=totaal,
                gepubliceerde_rondes=gepub,
                percentage=pct,
                start_datum=comp.start_datum.isoformat(),
                eind_datum=comp.eind_datum.isoformat(),
            )
        )
        for ronde in comp.speelrondes:
            if ronde.status == "concept" and ronde.datum >= vandaag:
                teams_in = teams_per_ronde.get(ronde.id, set())
                teams_met = toewijzingen_per_ronde.get(ronde.id, set())
                if len(teams_in) > 0 and len(teams_in) == len(teams_met):
                    acties.append(
                        DashboardActie(
                            id=f"publish-{ronde.id}",
                            type="publish_ronde",
                            titel="Speelronde publiceren",
                            beschrijving=f"Speelronde van {ronde.datum.isoformat()} is klaar om te publiceren",
                            prioriteit="hoog"
                            if ronde.datum <= vandaag + timedelta(days=3)
                            else "medium",
                            ronde_id=str(ronde.id),
                            competitie_id=str(comp.id),
                            url=f"/competities/{comp.id}/rondes/{ronde.id}",
                        )
                    )
                teams_zonder = len(teams_in) - len(teams_met)
                if teams_zonder > 0:
                    acties.append(
                        DashboardActie(
                            id=f"toewijzing-{ronde.id}",
                            type="baan_toewijzing",
                            titel="Baantoewijzing invullen",
                            beschrijving=f"{teams_zonder} team(s) hebben nog geen baan toegewezen",
                            prioriteit="hoog"
                            if ronde.datum <= vandaag + timedelta(days=3)
                            else "medium",
                            ronde_id=str(ronde.id),
                            competitie_id=str(comp.id),
                            url=f"/competities/{comp.id}/planning/{ronde.id}",
                        )
                    )
    result = await db.execute(
        select(Team).where(
            Team.club_id == club.id,
            Team.actief,
            Team.captain_email.is_(None),
        )
    )
    teams_zonder_captain = result.scalars().all()
    for team in teams_zonder_captain:
        result = await db.execute(select(Competitie).where(Competitie.id == team.competitie_id))
        comp = result.scalar_one_or_none()
        if comp:
            acties.append(
                DashboardActie(
                    id=f"captain-{team.id}",
                    type="team_captain",
                    titel="Captain toevoegen aan team",
                    beschrijving=f"Team '{team.naam}' heeft geen captain email",
                    prioriteit="laag",
                    competitie_id=str(team.competitie_id),
                    url=f"/competities/{team.competitie_id}/teams/{team.id}",
                )
            )
    acties.sort(key=lambda a: {"hoog": 0, "medium": 1, "laag": 2}.get(a.prioriteit, 3))
    result = await db.execute(select(Competitie).where(Competitie.club_id == club.id))
    alle_competities = result.scalars().all()
    waarschuwingen: list[DashboardWaarschuwing] = []
    if club.status == "trial" and club.trial_ends_at:
        if club.trial_ends_at.date() <= vandaag + timedelta(days=14):
            dagen = (club.trial_ends_at.date() - vandaag).days
            if dagen <= 0:
                waarschuwingen.append(
                    DashboardWaarschuwing(
                        type="trial_verlopen",
                        titel="Proefperiode verlopen",
                        bericht="Uw proefperiode is verlopen. Neem contact op voor een abonnement.",
                        prioriteit="hoog",
                        url="/settings/betalen",
                    )
                )
            else:
                waarschuwingen.append(
                    DashboardWaarschuwing(
                        type="trial_bijna_verlopen",
                        titel="Proefperiode bijna verlopen",
                        bericht=f"Nog {dagen} dagen proefperiode overstaan. Verleng nu!",
                        prioriteit="medium",
                        url="/settings/betalen",
                    )
                )
    komende_week = vandaag + timedelta(days=7)
    holidays_week = get_dutch_holidays_in_range(vandaag, komende_week)
    for h in holidays_week:
        waarschuwingen.append(
            DashboardWaarschuwing(
                type="feestdag",
                titel=f"Feestdag: {DUTCH_HOLIDAYS[h.isoformat()]}",
                bericht=f"Let op: {h.isoformat()} is een feestdag. Controleer of er competitieschema's aangepast moeten worden.",
                prioriteit="info",
                url=None,
            )
        )
    if len(teams_zonder_captain) > 0:
        waarschuwingen.append(
            DashboardWaarschuwing(
                type="onvolledige_teams",
                titel="Teams zonder captain",
                bericht=f"{len(teams_zonder_captain)} team(s) hebben geen captain. Dit kan communicatieproblemen veroorzaken.",
                prioriteit="medium",
                url=None,
            )
        )
    result = await db.execute(
        select(func.count(Baan.id)).where(Baan.club_id == club.id, Baan.actief)
    )
    totaal_banen = result.scalar() or 0
    result = await db.execute(
        select(func.count(Team.id)).where(Team.club_id == club.id, Team.actief)
    )
    totaal_teams = result.scalar() or 0
    result = await db.execute(
        select(func.count(User.id)).where(User.club_id == club.id, User.is_active)
    )
    totaal_gebruikers = result.scalar() or 0
    statistieken = {
        "totaal_banen": totaal_banen,
        "totaal_teams": totaal_teams,
        "totaal_gebruikers": totaal_gebruikers,
        "aantal_competities": len(alle_competities),
        "open_acties": len(acties),
    }
    return DashboardResponse(
        club={
            "id": str(club.id),
            "naam": club.naam,
            "slug": club.slug,
            "status": club.status,
            "trial_ends_at": club.trial_ends_at.isoformat() if club.trial_ends_at else None,
        },
        gebruiker={
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
        },
        komende_rondes=komende_rondes,
        acties=acties,
        competities_voortgang=competities_voortgang,
        waarschuwingen=waarschuwingen,
        statistieken=statistieken,
    )
