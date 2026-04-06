from uuid import UUID
from datetime import time, date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from app.schemas import CompetitieCreate, CompetitieUpdate, CompetitieResponse, PaginatedResponse

from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Club, Competitie, Team, Baan, Speelronde
from app.services.tenant_auth import get_current_tenant_user, get_current_tenant_admin
from app.services import planning as planning_service

router = APIRouter(prefix="/tenant/competities", tags=["competities"])

CURRENT_TENANT_DEP = Depends(get_current_tenant_user)
CURRENT_ADMIN_DEP = Depends(get_current_tenant_admin)


@router.get("")
async def list_competities(
    actief_only: bool = True,
    page: int = 1,
    size: int = 20,
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    
    if page < 1: page = 1
    if size < 1: size = 20
    if size > 100: size = 100
    
    offset = (page - 1) * size

    base_query = select(Competitie).where(Competitie.club_id == club.id)
    if actief_only:
        base_query = base_query.where(Competitie.actief == True)

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get page results
    result = await db.execute(
        base_query.order_by(Competitie.start_datum.desc())
        .offset(offset)
        .limit(size)
    )
    competities = result.scalars().all()
    
    pages = (total + size - 1) // size

    return {
        "items": [
            {
                "id": str(c.id),
                "naam": c.naam,
                "speeldag": c.speeldag,
                "start_datum": c.start_datum.isoformat(),
                "eind_datum": c.eind_datum.isoformat(),
                "actief": c.actief,
                "email_notifications_enabled": c.email_notifications_enabled,
                "standaard_starttijden": [t.isoformat() for t in (c.standaard_starttijden or [])],
                "eerste_datum": c.eerste_datum.isoformat() if c.eerste_datum else None,
                "hergebruik_configuratie": c.hergebruik_configuratie,
            }
            for c in competities
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }


@router.get("/{competitie_id}")
async def get_competitie(
    competitie_id: str,
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(
        select(Competitie).where(
            Competitie.id == competitie_uuid,
            Competitie.club_id == club.id,
        )
    )
    competitie = result.scalar_one_or_none()
    if not competitie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )

    return {
        "id": str(competitie.id),
        "naam": competitie.naam,
        "speeldag": competitie.speeldag,
        "start_datum": competitie.start_datum.isoformat(),
        "eind_datum": competitie.eind_datum.isoformat(),
        "feestdagen": [d.isoformat() for d in (competitie.feestdagen or [])],
        "inhaal_datums": [d.isoformat() for d in (competitie.inhaal_datums or [])],
        "actief": competitie.actief,
        "email_notifications_enabled": competitie.email_notifications_enabled,
        "standaard_starttijden": [t.isoformat() for t in (competitie.standaard_starttijden or [])],
        "eerste_datum": competitie.eerste_datum.isoformat() if competitie.eerste_datum else None,
        "hergebruik_configuratie": competitie.hergebruik_configuratie,
    }


@router.get("/{competitie_id}/rondes")
async def list_rondes(
    competitie_id: str,
    lazy: bool = False,
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    query = select(Speelronde).where(
        Speelronde.competitie_id == competitie_uuid,
        Speelronde.club_id == club.id,
    )

    if lazy:
        from datetime import date as date_lib
        today = date_lib.today()
        # Toon alleen rondes van vandaag en later
        query = query.where(Speelronde.datum >= today)

    result = await db.execute(query.order_by(Speelronde.datum))
    rondes = result.scalars().all()

    return {
        "rondes": [
            {
                "id": str(r.id),
                "competitie_id": str(r.competitie_id),
                "datum": r.datum.isoformat(),
                "week_nummer": r.week_nummer,
                "is_inhaalronde": r.is_inhaalronde,
                "status": r.status,
                "gepubliceerd_op": r.gepubliceerd_op.isoformat() if r.gepubliceerd_op else None,
                "public_token": r.public_token,
            }
            for r in rondes
        ]
    }


class CompetitieSettingsUpdate(BaseModel):
    email_notifications_enabled: bool | None = None


@router.patch("/{competitie_id}")
async def update_competitie(
    competitie_id: str,
    data: CompetitieUpdate,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(
        select(Competitie).where(
            Competitie.id == competitie_uuid,
            Competitie.club_id == club.id,
        )
    )
    competitie = result.scalar_one_or_none()
    if not competitie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )

    from app.services.mollie import MollieService

    mollie_service = MollieService(db)
    is_paid = await mollie_service.is_competitie_paid(club.id, competitie.naam)
    if not is_paid:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Betaling nodig voor competitie '{competitie.naam}'. Ga naar het Payments tabblad om te betalen.",
        )

    if data.naam is not None:
        competitie.naam = data.naam
    if data.speeldag is not None:
        competitie.speeldag = data.speeldag
    if data.start_datum is not None:
        competitie.start_datum = data.start_datum
    if data.eind_datum is not None:
        competitie.eind_datum = data.eind_datum
    if data.feestdagen is not None:
        competitie.feestdagen = data.feestdagen
    if data.inhaal_datums is not None:
        competitie.inhaal_datums = data.inhaal_datums
    if data.actief is not None:
        competitie.actief = data.actief

    await db.commit()
    await db.refresh(competitie)

    return {
        "id": str(competitie.id),
        "naam": competitie.naam,
        "email_notifications_enabled": competitie.email_notifications_enabled,
    }


@router.patch("/{competitie_id}/settings")
async def update_competitie_settings(
    competitie_id: str,
    data: CompetitieSettingsUpdate,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(
        select(Competitie).where(
            Competitie.id == competitie_uuid,
            Competitie.club_id == club.id,
        )
    )
    competitie = result.scalar_one_or_none()
    if not competitie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )

    from app.services.mollie import MollieService

    mollie_service = MollieService(db)
    is_paid = await mollie_service.is_competitie_paid(club.id, competitie.naam)
    if not is_paid:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Betaling nodig voor competitie '{competitie.naam}'. Ga naar het Payments tabblad om te betalen.",
        )

    if data.email_notifications_enabled is not None:
        competitie.email_notifications_enabled = data.email_notifications_enabled

    await db.commit()
    await db.refresh(competitie)

    return {
        "id": str(competitie.id),
        "email_notifications_enabled": competitie.email_notifications_enabled,
    }


@router.delete("/{competitie_id}")
async def delete_competitie(
    competitie_id: str,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(
        select(Competitie).where(
            Competitie.id == competitie_uuid,
            Competitie.club_id == club.id,
        )
    )
    competitie = result.scalar_one_or_none()
    if not competitie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )

    from app.services.mollie import MollieService

    mollie_service = MollieService(db)
    is_paid = await mollie_service.is_competitie_paid(club.id, competitie.naam)
    if not is_paid:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Betaling nodig voor competitie '{competitie.naam}'. Ga naar het Payments tabblad om te betalen.",
        )

    competitie.actief = False
    await db.commit()

    return {"message": "Competitie deactivated successfully"}


class TijdslotConfig(BaseModel):
    standaard_starttijden: list[str] | None = None
    eerste_datum: str | None = None
    hergebruik_configuratie: bool | None = None


@router.get("/{competitie_id}/tijdslot-config")
async def get_tijdslot_config(
    competitie_id: str,
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(
        select(Competitie).where(
            Competitie.id == competitie_uuid,
            Competitie.club_id == club.id,
        )
    )
    competitie = result.scalar_one_or_none()
    if not competitie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )

    return await planning_service.get_standaard_tijdslot_config(competitie_uuid, db)


@router.put("/{competitie_id}/tijdslot-config")
async def update_tijdslot_config(
    competitie_id: str,
    data: TijdslotConfig,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(
        select(Competitie).where(
            Competitie.id == competitie_uuid,
            Competitie.club_id == club.id,
        )
    )
    competitie = result.scalar_one_or_none()
    if not competitie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )

    if data.standaard_starttijden is not None:
        parsed_times = []
        for t in data.standaard_starttijden:
            parts = t.split(":")
            if len(parts) >= 2:
                parsed_times.append(time(int(parts[0]), int(parts[1])))
        competitie.standaard_starttijden = parsed_times

    if data.eerste_datum is not None:
        from datetime import date as date_lib

        parts = data.eerste_datum.split("-")
        if len(parts) == 3:
            competitie.eerste_datum = date_lib(int(parts[0]), int(parts[1]), int(parts[2]))

    if data.hergebruik_configuratie is not None:
        competitie.hergebruik_configuratie = data.hergebruik_configuratie

    await db.commit()
    await db.refresh(competitie)

    return await planning_service.get_standaard_tijdslot_config(competitie_uuid, db)


class DuplicateCompetitieRequest(BaseModel):
    new_naam: str
    nieuwe_start_datum: str
    nieuwe_eind_datum: str
    copy_teams: bool = True


@router.post("/{competitie_id}/duplicate")
async def duplicate_competitie(
    competitie_id: str,
    data: DuplicateCompetitieRequest,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(
        select(Competitie).where(
            Competitie.id == competitie_uuid,
            Competitie.club_id == club.id,
        )
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )

    parts_start = data.nieuwe_start_datum.split("-")
    parts_end = data.nieuwe_eind_datum.split("-")
    if len(parts_start) != 3 or len(parts_end) != 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD",
        )

    new_start = date(int(parts_start[0]), int(parts_start[1]), int(parts_start[2]))
    new_end = date(int(parts_end[0]), int(parts_end[1]), int(parts_end[2]))

    new_competitie = Competitie(
        club_id=club.id,
        naam=data.new_naam,
        speeldag=original.speeldag,
        start_datum=new_start,
        eind_datum=new_end,
        feestdagen=original.feestdagen,
        inhaal_datums=original.inhaal_datums,
        standaard_starttijden=original.standaard_starttijden,
        hergebruik_configuratie=original.hergebruik_configuratie,
    )
    db.add(new_competitie)
    await db.commit()
    await db.refresh(new_competitie)

    new_teams_count = 0
    if data.copy_teams:
        result = await db.execute(
            select(Team).where(
                Team.competitie_id == competitie_uuid,
            )
        )
        original_teams = list(result.scalars().all())

        for team in original_teams:
            new_team = Team(
                club_id=club.id,
                competitie_id=new_competitie.id,
                naam=team.naam,
                captain_naam=team.captain_naam,
                captain_email=team.captain_email,
                speelklasse=team.speelklasse,
                knltb_team_id=team.knltb_team_id,
                actief=team.actief,
            )
            db.add(new_team)
            new_teams_count += 1

        await db.commit()

    return {
        "id": str(new_competitie.id),
        "naam": new_competitie.naam,
        "start_datum": new_competitie.start_datum.isoformat(),
        "eind_datum": new_competitie.eind_datum.isoformat(),
        "teams_copied": new_teams_count,
    }
