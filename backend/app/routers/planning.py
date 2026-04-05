from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Baan, BaanToewijzing, Competitie, Speelronde, Team
from app.routers.tenant import get_current_tenant_user
from app.services.planning import (
    genereer_indeling,
    get_historie_heatmap,
    update_planning_historie,
)
from app.services.auth import get_password_hash

router = APIRouter(prefix="/tenant", tags=["planning"])


class BaanToewijzingResponse(BaseModel):
    id: str
    team_id: str
    baan_id: str
    tijdslot_start: str | None
    tijdslot_eind: str | None
    notitie: str | None


class SpeelrondeDetailResponse(BaseModel):
    id: str
    competitie_id: str
    club_id: str
    datum: str
    week_nummer: int | None
    is_inhaalronde: bool
    status: str
    toewijzingen: list[BaanToewijzingResponse]


class UpdateToewijzingRequest(BaseModel):
    team_id: str | None = None
    baan_id: str | None = None
    tijdslot_start: str | None = None
    tijdslot_eind: str | None = None
    notitie: str | None = None


class HistorieTeamRow(BaseModel):
    team_id: str
    team_naam: str
    data: dict[str, int]


class HistorieResponse(BaseModel):
    teams: list[HistorieTeamRow]
    banen: list[dict]


@router.post("/rondes/{ronde_id}/genereer")
async def generate_indeling(
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

    if ronde.status == "gepubliceerd":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot regenerate for published ronde",
        )

    toewijzingen = await genereer_indeling(ronde_uuid, db)

    return {
        "toewijzingen": [
            {
                "id": str(t.id),
                "team_id": str(t.team_id),
                "baan_id": str(t.baan_id),
                "tijdslot_start": t.tijdslot_start.isoformat() if t.tijdslot_start else None,
                "tijdslot_eind": t.tijdslot_eind.isoformat() if t.tijdslot_eind else None,
                "notitie": t.notitie,
            }
            for t in toewijzingen
        ]
    }


@router.get("/rondes/{ronde_id}")
async def get_ronde_detail(
    ronde_id: str,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> SpeelrondeDetailResponse:
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

    result = await db.execute(select(BaanToewijzing).where(BaanToewijzing.ronde_id == ronde_uuid))
    toewijzingen = list(result.scalars().all())

    return SpeelrondeDetailResponse(
        id=str(ronde.id),
        competitie_id=str(ronde.competitie_id),
        club_id=str(ronde.club_id),
        datum=ronde.datum.isoformat(),
        week_nummer=ronde.week_nummer,
        is_inhaalronde=ronde.is_inhaalronde,
        status=ronde.status,
        toewijzingen=[
            BaanToewijzingResponse(
                id=str(t.id),
                team_id=str(t.team_id),
                baan_id=str(t.baan_id),
                tijdslot_start=t.tijdslot_start.isoformat() if t.tijdslot_start else None,
                tijdslot_eind=t.tijdslot_eind.isoformat() if t.tijdslot_eind else None,
                notitie=t.notitie,
            )
            for t in toewijzingen
        ],
    )


@router.patch("/toewijzingen/{toewijzing_id}")
async def update_toewijzing(
    toewijzing_id: str,
    data: UpdateToewijzingRequest,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        toewijzing_uuid = UUID(toewijzing_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid toewijzing ID",
        )

    result = await db.execute(select(BaanToewijzing).where(BaanToewijzing.id == toewijzing_uuid))
    toewijzing = result.scalar_one_or_none()
    if not toewijzing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Toewijzing not found",
        )

    result = await db.execute(select(Speelronde).where(Speelronde.id == toewijzing.ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde or ronde.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if data.team_id is not None:
        try:
            team_uuid = UUID(data.team_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid team ID",
            )
        result = await db.execute(select(Team).where(Team.id == team_uuid))
        team = result.scalar_one_or_none()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found",
            )
        toewijzing.team_id = team_uuid

    if data.baan_id is not None:
        try:
            baan_uuid = UUID(data.baan_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid baan ID",
            )
        result = await db.execute(select(Baan).where(Baan.id == baan_uuid))
        baan = result.scalar_one_or_none()
        if not baan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Baan not found",
            )
        toewijzing.baan_id = baan_uuid

    if data.tijdslot_start is not None:
        toewijzing.tijdslot_start = datetime.strptime(data.tijdslot_start, "%H:%M").time()
    if data.tijdslot_eind is not None:
        toewijzing.tijdslot_eind = datetime.strptime(data.tijdslot_eind, "%H:%M").time()
    if data.notitie is not None:
        toewijzing.notitie = data.notitie

    await db.commit()
    await db.refresh(toewijzing)

    return {
        "id": str(toewijzing.id),
        "team_id": str(toewijzing.team_id),
        "baan_id": str(toewijzing.baan_id),
        "tijdslot_start": toewijzing.tijdslot_start.isoformat()
        if toewijzing.tijdslot_start
        else None,
        "tijdslot_eind": toewijzing.tijdslot_eind.isoformat() if toewijzing.tijdslot_eind else None,
        "notitie": toewijzing.notitie,
    }


@router.post("/rondes/{ronde_id}/publish")
async def publish_ronde(
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

    if ronde.status == "gepubliceerd":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ronde is already published",
        )

    import secrets

    ronde.status = "gepubliceerd"
    ronde.published_at = datetime.utcnow()
    ronde.published_by = user.id
    ronde.public_token = secrets.token_urlsafe(32)

    await update_planning_historie(ronde_uuid, db)

    return {
        "id": str(ronde.id),
        "status": ronde.status,
        "public_token": ronde.public_token,
    }


@router.get("/competities/{competitie_id}/historie")
async def get_competitie_historie(
    competitie_id: str,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> HistorieResponse:
    user, club = current
    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(select(Competitie).where(Competitie.id == competitie_uuid))
    competitie = result.scalar_one_or_none()
    if not competitie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )

    if competitie.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    result = await db.execute(select(Baan).where(Baan.club_id == club.id, Baan.actief == True))
    banen = list(result.scalars().all())

    heatmap = await get_historie_heatmap(competitie_uuid, db)

    result = await db.execute(
        select(Team).where(Team.competitie_id == competitie_uuid, Team.actief == True)
    )
    teams = list(result.scalars().all())

    return HistorieResponse(
        teams=[
            HistorieTeamRow(
                team_id=str(t.id),
                team_naam=t.naam,
                data={str(b.id): heatmap.get(t.id, {}).get(b.id, 0) for b in banen},
            )
            for t in teams
        ],
        banen=[
            {
                "id": str(b.id),
                "nummer": b.nummer,
                "naam": b.naam,
                "prioriteit_score": b.prioriteit_score,
            }
            for b in banen
        ],
    )


@router.get("/competities/{competitie_id}/teams")
async def list_teams_for_planning(
    competitie_id: str,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    user, club = current
    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(select(Competitie).where(Competitie.id == competitie_uuid))
    competitie = result.scalar_one_or_none()
    if not competitie or competitie.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    result = await db.execute(
        select(Team).where(Team.competitie_id == competitie_uuid, Team.actief == True)
    )
    teams = list(result.scalars().all())

    return [
        {
            "id": str(t.id),
            "naam": t.naam,
            "captain_naam": t.captain_naam,
            "speelklasse": t.speelklasse,
        }
        for t in teams
    ]


@router.get("/banen")
async def list_banen_for_planning(
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    user, club = current

    result = await db.execute(select(Baan).where(Baan.club_id == club.id, Baan.actief == True))
    banen = list(result.scalars().all())

    return [
        {
            "id": str(b.id),
            "nummer": b.nummer,
            "naam": b.naam,
            "prioriteit_score": b.prioriteit_score,
            "overdekt": b.overdekt,
            "verlichting_type": b.verlichting_type,
            "notitie": b.notitie,
        }
        for b in banen
    ]
