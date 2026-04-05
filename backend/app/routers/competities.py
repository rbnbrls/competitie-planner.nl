from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Club, Competitie, Team
from app.schemas import CompetitieCreate, CompetitieUpdate, CompetitieResponse
from app.services.tenant_auth import get_current_tenant_user, get_current_tenant_admin

router = APIRouter(prefix="/tenant/competities", tags=["competities"])

CURRENT_TENANT_DEP = Depends(get_current_tenant_user)
CURRENT_ADMIN_DEP = Depends(get_current_tenant_admin)


@router.get("")
async def list_competities(
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    result = await db.execute(
        select(Competitie)
        .where(Competitie.club_id == club.id)
        .order_by(Competitie.start_datum.desc())
    )
    competities = result.scalars().all()
    return {
        "competities": [
            {
                "id": str(c.id),
                "naam": c.naam,
                "speeldag": c.speeldag,
                "start_datum": c.start_datum.isoformat(),
                "eind_datum": c.eind_datum.isoformat(),
                "actief": c.actief,
                "email_notifications_enabled": c.email_notifications_enabled,
            }
            for c in competities
        ]
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
        "feestdagen": competitie.feestdagen,
        "inhaal_datums": competitie.inhaal_datums,
        "actief": competitie.actief,
        "email_notifications_enabled": competitie.email_notifications_enabled,
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

    competitie.actief = False
    await db.commit()

    return {"message": "Competitie deactivated successfully"}
