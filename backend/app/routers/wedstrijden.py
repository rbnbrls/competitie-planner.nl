from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Speelronde, Team, Wedstrijd
from app.schemas import WedstrijdCreate, WedstrijdUpdate
from app.services.tenant_auth import get_current_tenant_user

router = APIRouter(prefix="/tenant/wedstrijden", tags=["wedstrijden"])


@router.get("/{ronde_id}")
async def list_wedstrijden(
    ronde_id: str,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    try:
        ronde_uuid = UUID(ronde_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ronde ID",
        )

    result = await db.execute(select(Speelronde).where(Speelronde.id == ronde_uuid))
    ronde = result.scalar_one_or_none()
    if not ronde:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speelronde not found",
        )

    if ronde.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    result = await db.execute(
        select(Wedstrijd)
        .where(Wedstrijd.ronde_id == ronde_uuid)
        .options(
            Wedstrijd.thuisteam,
            Wedstrijd.uitteam,
        )
    )
    wedstrijden = result.scalars().all()

    return {
        "wedstrijden": [
            {
                "id": str(w.id),
                "ronde_id": str(w.ronde_id),
                "thuisteam_id": str(w.thuisteam_id),
                "uitteam_id": str(w.uitteam_id),
                "status": w.status,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "updated_at": w.updated_at.isoformat() if w.updated_at else None,
                "thuisteam": (
                    {
                        "id": str(w.thuisteam.id),
                        "naam": w.thuisteam.naam,
                        "captain_naam": w.thuisteam.captain_naam,
                        "speelklasse": w.thuisteam.speelklasse,
                    }
                    if w.thuisteam
                    else None
                ),
                "uitteam": (
                    {
                        "id": str(w.uitteam.id),
                        "naam": w.uitteam.naam,
                        "captain_naam": w.uitteam.captain_naam,
                        "speelklasse": w.uitteam.speelklasse,
                    }
                    if w.uitteam
                    else None
                ),
            }
            for w in wedstrijden
        ]
    }


@router.post("")
async def create_wedstrijd(
    data: WedstrijdCreate,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    result = await db.execute(select(Speelronde).where(Speelronde.id == data.ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speelronde not found",
        )

    if ronde.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    result = await db.execute(select(Team).where(Team.id == data.thuisteam_id))
    thuisteam = result.scalar_one_or_none()
    if not thuisteam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thuisteam not found",
        )

    result = await db.execute(select(Team).where(Team.id == data.uitteam_id))
    uitteam = result.scalar_one_or_none()
    if not uitteam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uitteam not found",
        )

    result = await db.execute(
        select(Wedstrijd).where(
            Wedstrijd.ronde_id == data.ronde_id,
            Wedstrijd.thuisteam_id == data.thuisteam_id,
            Wedstrijd.uitteam_id == data.uitteam_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wedstrijd already exists for this combination",
        )

    wedstrijd = Wedstrijd(
        ronde_id=data.ronde_id,
        thuisteam_id=data.thuisteam_id,
        uitteam_id=data.uitteam_id,
        status=data.status,
    )
    db.add(wedstrijd)
    await db.commit()
    await db.refresh(wedstrijd)

    return {
        "id": str(wedstrijd.id),
        "ronde_id": str(wedstrijd.ronde_id),
        "thuisteam_id": str(wedstrijd.thuisteam_id),
        "uitteam_id": str(wedstrijd.uitteam_id),
        "status": wedstrijd.status,
    }


@router.patch("/{wedstrijd_id}")
async def update_wedstrijd(
    wedstrijd_id: str,
    data: WedstrijdUpdate,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    try:
        wedstrijd_uuid = UUID(wedstrijd_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid wedstrijd ID",
        )

    result = await db.execute(select(Wedstrijd).where(Wedstrijd.id == wedstrijd_uuid))
    wedstrijd = result.scalar_one_or_none()
    if not wedstrijd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedstrijd not found",
        )

    result = await db.execute(select(Speelronde).where(Speelronde.id == wedstrijd.ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde or ronde.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if data.thuisteam_id is not None:
        result = await db.execute(select(Team).where(Team.id == data.thuisteam_id))
        team = result.scalar_one_or_none()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found",
            )
        wedstrijd.thuisteam_id = data.thuisteam_id

    if data.uitteam_id is not None:
        result = await db.execute(select(Team).where(Team.id == data.uitteam_id))
        team = result.scalar_one_or_none()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found",
            )
        wedstrijd.uitteam_id = data.uitteam_id

    if data.status is not None:
        wedstrijd.status = data.status

    await db.commit()
    await db.refresh(wedstrijd)

    return {
        "id": str(wedstrijd.id),
        "ronde_id": str(wedstrijd.ronde_id),
        "thuisteam_id": str(wedstrijd.thuisteam_id),
        "uitteam_id": str(wedstrijd.uitteam_id),
        "status": wedstrijd.status,
    }


@router.delete("/{wedstrijd_id}")
async def delete_wedstrijd(
    wedstrijd_id: str,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    try:
        wedstrijd_uuid = UUID(wedstrijd_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid wedstrijd ID",
        )

    result = await db.execute(select(Wedstrijd).where(Wedstrijd.id == wedstrijd_uuid))
    wedstrijd = result.scalar_one_or_none()
    if not wedstrijd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedstrijd not found",
        )

    result = await db.execute(select(Speelronde).where(Speelronde.id == wedstrijd.ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde or ronde.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    await db.delete(wedstrijd)
    await db.commit()

    return {"message": "Wedstrijd deleted successfully"}
