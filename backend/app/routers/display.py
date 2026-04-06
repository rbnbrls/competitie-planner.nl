from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Baan, BaanToewijzing, Club, Speelronde, Team

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


class DisplayClubInfo(BaseModel):
    naam: str
    slug: str
    primary_color: str
    secondary_color: str
    accent_color: str
    logo_url: str | None


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
