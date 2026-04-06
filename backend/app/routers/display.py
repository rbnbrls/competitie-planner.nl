from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Baan, BaanToewijzing, Club, Speelronde, Team, Wedstrijd, Beschikbaarheid
from app.schemas import (
    CaptainPortalResponse,
    CaptainWedstrijdResponse,
    DisplayClubInfo,
    BeschikbaarheidResponse,
    BeschikbaarheidCreate,
    ResultSubmission,
)

router = APIRouter(tags=["display"])


class DisplayToewijzing(BaseModel):
    baan_nummer: int
    baan_naam: str | None
    team_naam: str
    tijdslot_start: str
    tijdslot_eind: str | None = None
    notitie: str | None = None


class DisplayRonde(BaseModel):
    id: str
    competitie_naam: str
    club_naam: str
    datum: str
    week_nummer: int | None
    is_inhaalronde: bool
    toewijzingen: list[DisplayToewijzing]


class DisplayResponse(BaseModel):
    club: DisplayClubInfo
    ronde: DisplayRonde | None


@router.get("/display/{slug}/{token}")
async def get_display_by_token(
    slug: str,
    token: str,
    db: AsyncSession = Depends(get_db),
) -> DisplayResponse:
    result = await db.execute(select(Club).where(Club.slug == slug))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found",
        )

    result = await db.execute(
        select(Speelronde)
        .options(joinedload(Speelronde.competitie))
        .where(
            and_(
                Speelronde.club_id == club.id,
                Speelronde.public_token == token,
                Speelronde.status == "gepubliceerd",
            )
        )
    )
    ronde = result.scalar_one_or_none()
    if not ronde:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ronde not found",
        )

    result = await db.execute(
        select(BaanToewijzing)
        .options(joinedload(BaanToewijzing.baan), joinedload(BaanToewijzing.team))
        .where(BaanToewijzing.ronde_id == ronde.id)
    )
    toewijzingen = list(result.scalars().all())

    toewijzingen_with_details = []
    for t in toewijzingen:
        toewijzingen_with_details.append(
            DisplayToewijzing(
                baan_nummer=t.baan.nummer,
                baan_naam=t.baan.naam,
                team_naam=t.team.naam,
                tijdslot_start=t.tijdslot_start.isoformat() if t.tijdslot_start else "19:00:00",
                tijdslot_eind=t.tijdslot_eind.isoformat() if t.tijdslot_eind else None,
                notitie=t.notitie,
            )
        )

    toewijzingen_with_details.sort(key=lambda x: (x.baan_nummer, x.baan_naam or ""))

    return DisplayResponse(
        club=DisplayClubInfo(
            naam=club.naam,
            slug=club.slug,
            primary_color=club.primary_color,
            secondary_color=club.secondary_color,
            accent_color=club.accent_color,
            logo_url=club.logo_url,
        ),
        ronde=DisplayRonde(
            id=str(ronde.id),
            competitie_naam=ronde.competitie.naam,
            club_naam=club.naam,
            datum=ronde.datum.isoformat(),
            week_nummer=ronde.week_nummer,
            is_inhaalronde=ronde.is_inhaalronde,
            toewijzingen=toewijzingen_with_details,
        ),
    )


@router.get("/display/{slug}/actueel")
async def get_display_current(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> DisplayResponse:
    result = await db.execute(select(Club).where(Club.slug == slug))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found",
        )

    today = datetime.now().date()

    result = await db.execute(
        select(Speelronde)
        .options(joinedload(Speelronde.competitie))
        .where(
            and_(
                Speelronde.club_id == club.id,
                Speelronde.status == "gepubliceerd",
                Speelronde.datum >= today,
            )
        )
        .order_by(Speelronde.datum)
        .limit(1)
    )
    ronde = result.scalar_one_or_none()

    if not ronde:
        result = await db.execute(
            select(Speelronde)
            .options(joinedload(Speelronde.competitie))
            .where(
                and_(
                    Speelronde.club_id == club.id,
                    Speelronde.status == "gepubliceerd",
                )
            )
            .order_by(Speelronde.datum.desc())
            .limit(1)
        )
        ronde = result.scalar_one_or_none()

    if not ronde:
        return DisplayResponse(
            club=DisplayClubInfo(
                naam=club.naam,
                slug=club.slug,
                primary_color=club.primary_color,
                secondary_color=club.secondary_color,
                accent_color=club.accent_color,
                logo_url=club.logo_url,
            ),
            ronde=None,
        )

    result = await db.execute(
        select(BaanToewijzing)
        .options(joinedload(BaanToewijzing.baan), joinedload(BaanToewijzing.team))
        .where(BaanToewijzing.ronde_id == ronde.id)
    )
    toewijzingen = list(result.scalars().all())

    toewijzingen_with_details = []
    for t in toewijzingen:
        toewijzingen_with_details.append(
            DisplayToewijzing(
                baan_nummer=t.baan.nummer,
                baan_naam=t.baan.naam,
                team_naam=t.team.naam,
                tijdslot_start=t.tijdslot_start.isoformat() if t.tijdslot_start else "19:00:00",
                tijdslot_eind=t.tijdslot_eind.isoformat() if t.tijdslot_eind else None,
                notitie=t.notitie,
            )
        )

    toewijzingen_with_details.sort(key=lambda x: (x.baan_nummer, x.baan_naam or ""))

    return DisplayResponse(
        club=DisplayClubInfo(
            naam=club.naam,
            slug=club.slug,
            primary_color=club.primary_color,
            secondary_color=club.secondary_color,
            accent_color=club.accent_color,
            logo_url=club.logo_url,
        ),
        ronde=DisplayRonde(
            id=str(ronde.id),
            competitie_naam=ronde.competitie.naam,
            club_naam=club.naam,
            datum=ronde.datum.isoformat(),
            week_nummer=ronde.week_nummer,
            is_inhaalronde=ronde.is_inhaalronde,
            toewijzingen=toewijzingen_with_details,
        ),
    )


class CalendarRonde(BaseModel):
    id: str
    datum: str
    competitie_naam: str
    is_inhaalronde: bool
    public_token: str | None


class ClubCalendarResponse(BaseModel):
    club: DisplayClubInfo
    rondes: list[CalendarRonde]


@router.get("/display/{slug}/kalender")
async def get_club_calendar(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> ClubCalendarResponse:
    result = await db.execute(select(Club).where(Club.slug == slug))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    result = await db.execute(
        select(Speelronde)
        .options(joinedload(Speelronde.competitie))
        .where(and_(Speelronde.club_id == club.id, Speelronde.status == "gepubliceerd"))
        .order_by(Speelronde.datum)
    )
    rondes = result.scalars().all()

    return ClubCalendarResponse(
        club=DisplayClubInfo(
            naam=club.naam,
            slug=club.slug,
            primary_color=club.primary_color,
            secondary_color=club.secondary_color,
            accent_color=club.accent_color,
            logo_url=club.logo_url,
        ),
        rondes=[
            CalendarRonde(
                id=str(r.id),
                datum=r.datum.isoformat(),
                competitie_naam=r.competitie.naam,
                is_inhaalronde=r.is_inhaalronde,
                public_token=r.public_token,
            )
            for r in rondes
        ],
    )


@router.get("/captain/{token}", response_model=CaptainPortalResponse)
async def get_captain_portal(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> CaptainPortalResponse:
    # 1. Vind het team via de token
    result = await db.execute(
        select(Team)
        .options(joinedload(Team.competitie), joinedload(Team.club))
        .where(Team.public_token == token)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team niet gevonden met deze link.",
        )

    # 2. Haal alle wedstrijden op van dit team
    result = await db.execute(
        select(Wedstrijd)
        .options(joinedload(Wedstrijd.ronde), joinedload(Wedstrijd.thuisteam), joinedload(Wedstrijd.uitteam), joinedload(Wedstrijd.baan))
        .where(or_(Wedstrijd.thuisteam_id == team.id, Wedstrijd.uitteam_id == team.id))
    )
    wedstrijden = result.scalars().all()

    # 3. Haal beschikbaarheden op
    result = await db.execute(
        select(Beschikbaarheid).where(Beschikbaarheid.team_id == team.id)
    )
    beschikbaarheden = result.scalars().all()

    # Formatteer wedstrijden
    alle_wedstrijden = []
    volgende_wedstrijd = None
    today = datetime.now().date()

    for w in wedstrijden:
        is_thuis = w.thuisteam_id == team.id
        tegenstander = w.uitteam.naam if is_thuis else w.thuisteam.naam
        
        w_resp = CaptainWedstrijdResponse(
            id=w.id,
            datum=w.speeldatum or w.ronde.datum,
            tijd=w.speeltijd,
            is_thuis=is_thuis,
            tegenstander=tegenstander,
            baan_nummer=w.baan.nummer if w.baan else None,
            baan_naam=w.baan.naam if w.baan else None,
            status=w.status,
            uitslag_thuisteam=w.uitslag_thuisteam,
            uitslag_uitteam=w.uitslag_uitteam,
        )
        alle_wedstrijden.append(w_resp)
        
        if not volgende_wedstrijd and (w.speeldatum or w.ronde.datum) >= today:
            volgende_wedstrijd = w_resp

    # Sorteer wedstrijden op datum
    alle_wedstrijden.sort(key=lambda x: (x.datum, x.tijd or datetime.min.time()))

    return CaptainPortalResponse(
        team_naam=team.naam,
        competitie_naam=team.competitie.naam,
        club=DisplayClubInfo(
            naam=team.club.naam,
            slug=team.club.slug,
            primary_color=team.club.primary_color,
            secondary_color=team.club.secondary_color,
            accent_color=team.club.accent_color,
            logo_url=team.club.logo_url,
        ),
        volgende_wedstrijd=volgende_wedstrijd,
        alle_wedstrijden=alle_wedstrijden,
        beschikbaarheden=[BeschikbaarheidResponse.model_validate(b) for b in beschikbaarheden],
    )


@router.post("/captain/{token}/beschikbaarheid", response_model=BeschikbaarheidResponse)
async def submit_beschikbaarheid(
    token: str,
    data: BeschikbaarheidCreate,
    db: AsyncSession = Depends(get_db),
) -> BeschikbaarheidResponse:
    result = await db.execute(select(Team).where(Team.public_token == token))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team niet gevonden")

    # Check of de ronde bestaat
    result = await db.execute(select(Speelronde).where(Speelronde.id == data.ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde:
        raise HTTPException(status_code=404, detail="Ronde niet gevonden")

    # Upsert beschikbaarheid
    result = await db.execute(
        select(Beschikbaarheid).where(
            and_(Beschikbaarheid.team_id == team.id, Beschikbaarheid.ronde_id == data.ronde_id)
        )
    )
    beschikbaarheid = result.scalar_one_or_none()

    if beschikbaarheid:
        beschikbaarheid.is_beschikbaar = data.is_beschikbaar
        beschikbaarheid.notitie = data.notitie
    else:
        beschikbaarheid = Beschikbaarheid(
            team_id=team.id,
            ronde_id=data.ronde_id,
            is_beschikbaar=data.is_beschikbaar,
            notitie=data.notitie,
        )
        db.add(beschikbaarheid)

    await db.commit()
    await db.refresh(beschikbaarheid)
    return BeschikbaarheidResponse.model_validate(beschikbaarheid)


@router.post("/captain/{token}/uitslag")
async def submit_uitslag(
    token: str,
    data: ResultSubmission,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Team).where(Team.public_token == token))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team niet gevonden")

    result = await db.execute(
        select(Wedstrijd).where(
            and_(
                Wedstrijd.id == data.wedstrijd_id,
                or_(Wedstrijd.thuisteam_id == team.id, Wedstrijd.uitteam_id == team.id)
            )
        )
    )
    wedstrijd = result.scalar_one_or_none()
    if not wedstrijd:
        raise HTTPException(status_code=404, detail="Wedstrijd niet gevonden of geen toegang")

    wedstrijd.uitslag_thuisteam = data.uitslag_thuisteam
    wedstrijd.uitslag_uitteam = data.uitslag_uitteam
    if data.notitie:
        wedstrijd.notitie = (wedstrijd.notitie or "") + f"\n[Captain]: {data.notitie}"
    
    wedstrijd.status = "voltooid"
    
    await db.commit()
    return {"status": "success"}
