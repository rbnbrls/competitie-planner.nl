"""
File: backend/app/routers/teams.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import csv
import io
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Team
from app.schemas import TeamCreate, TeamUpdate
from app.services.tenant_auth import get_current_tenant_admin, get_current_tenant_user

router = APIRouter(prefix="/tenant/teams", tags=["teams"])
CURRENT_TENANT_DEP = Depends(get_current_tenant_user)
CURRENT_ADMIN_DEP = Depends(get_current_tenant_admin)


class BulkActivateRequest(BaseModel):
    team_ids: list[str]
    activate: bool


@router.get("")
async def list_teams(
    competitie_id: str | None = None,
    search: str | None = None,
    page: int = 1,
    size: int = 20,
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from sqlalchemy import or_

    user, club = current
    if page < 1:
        page = 1
    if size < 1:
        size = 20
    if size > 100:
        size = 100
    offset = (page - 1) * size
    base_query = select(Team).where(Team.club_id == club.id)
    if competitie_id:
        try:
            competitie_uuid = UUID(competitie_id)
            base_query = base_query.where(Team.competitie_id == competitie_uuid)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid competitie ID",
            )
    if search:
        base_query = base_query.where(
            or_(Team.naam.ilike(f"%{search}%"), Team.captain_naam.ilike(f"%{search}%"))
        )
    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    # Get page results
    result = await db.execute(base_query.order_by(Team.naam).offset(offset).limit(size))
    teams = result.scalars().all()
    pages = (total + size - 1) // size
    return {
        "items": [
            {
                "id": str(t.id),
                "competitie_id": str(t.competitie_id),
                "naam": t.naam,
                "captain_naam": t.captain_naam,
                "captain_email": t.captain_email,
                "speelklasse": t.speelklasse,
                "knltb_team_id": t.knltb_team_id,
                "actief": t.actief,
            }
            for t in teams
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


@router.get("/{team_id}")
async def get_team(
    team_id: str,
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        team_uuid = UUID(team_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid team ID",
        )
    result = await db.execute(
        select(Team).where(
            Team.id == team_uuid,
            Team.club_id == club.id,
        )
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    return {
        "id": str(team.id),
        "competitie_id": str(team.competitie_id),
        "naam": team.naam,
        "captain_naam": team.captain_naam,
        "captain_email": team.captain_email,
        "speelklasse": team.speelklasse,
        "knltb_team_id": team.knltb_team_id,
        "actief": team.actief,
    }


@router.post("")
async def create_team(
    data: TeamCreate,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        data.club_id = club.id
    except Exception:
        pass
    existing = await db.execute(
        select(Team).where(
            Team.club_id == club.id,
            Team.competitie_id == data.competitie_id,
            Team.naam == data.naam,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Team name already exists within this competitie",
        )
    team = Team(
        club_id=club.id,
        competitie_id=data.competitie_id,
        naam=data.naam,
        captain_naam=data.captain_naam,
        captain_email=data.captain_email,
        speelklasse=data.speelklasse,
        knltb_team_id=data.knltb_team_id,
    )
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return {
        "id": str(team.id),
        "naam": team.naam,
    }


@router.patch("/{team_id}")
async def update_team(
    team_id: str,
    data: TeamUpdate,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        team_uuid = UUID(team_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid team ID",
        )
    result = await db.execute(
        select(Team).where(
            Team.id == team_uuid,
            Team.club_id == club.id,
        )
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    if data.naam is not None:
        if data.naam != team.naam:
            existing = await db.execute(
                select(Team).where(
                    Team.club_id == club.id,
                    Team.competitie_id == team.competitie_id,
                    Team.naam == data.naam,
                    Team.id != team.id,
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Team name already exists within this competitie",
                )
        team.naam = data.naam
    if data.captain_naam is not None:
        team.captain_naam = data.captain_naam
    if data.captain_email is not None:
        team.captain_email = data.captain_email
    if data.speelklasse is not None:
        team.speelklasse = data.speelklasse
    if data.knltb_team_id is not None:
        team.knltb_team_id = data.knltb_team_id
    if data.actief is not None:
        team.actief = data.actief
    await db.commit()
    await db.refresh(team)
    return {
        "id": str(team.id),
        "naam": team.naam,
    }


@router.delete("/{team_id}")
async def delete_team(
    team_id: str,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        team_uuid = UUID(team_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid team ID",
        )
    result = await db.execute(
        select(Team).where(
            Team.id == team_uuid,
            Team.club_id == club.id,
        )
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    team.actief = False
    await db.commit()
    return {"message": "Team deactivated successfully"}


@router.post("/bulk-activate")
async def bulk_activate_teams(
    data: BulkActivateRequest,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    results = []
    errors = []
    for team_id in data.team_ids:
        try:
            team_uuid = UUID(team_id)
        except ValueError:
            errors.append({"team_id": team_id, "error": "Invalid ID"})
            continue
        result = await db.execute(
            select(Team).where(
                Team.id == team_uuid,
                Team.club_id == club.id,
            )
        )
        team = result.scalar_one_or_none()
        if not team:
            errors.append({"team_id": team_id, "error": "Not found"})
            continue
        team.actief = data.activate
        results.append({"team_id": str(team.id), "naam": team.naam, "actief": team.actief})
    await db.commit()
    return {
        "success": len(results),
        "errors": errors,
        "results": results,
    }


class CSVImportRequest(BaseModel):
    competitie_id: str
    column_mapping: dict[str, str]


@router.post("/import/csv")
async def import_teams_csv(
    competitie_id: str,
    file: UploadFile = File(...),
    column_mapping: str = "{}",
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
    import json

    mapping = json.loads(column_mapping)
    csv_naam = mapping.get("naam", "Teamnaam")
    csv_captain = mapping.get("captain_naam", "Capitano")
    csv_email = mapping.get("captain_email", "Email")
    csv_klasse = mapping.get("speelklasse", "Klasse")
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    preview = []
    existing_count = 0
    for row in rows:
        team_naam = row.get(csv_naam, "").strip()
        if not team_naam:
            continue
        captain_naam = row.get(csv_captain, "").strip()
        captain_email = row.get(csv_email, "").strip()
        speelklasse = row.get(csv_klasse, "").strip()
        result = await db.execute(
            select(Team).where(
                Team.club_id == club.id,
                Team.competitie_id == competitie_uuid,
                Team.naam == team_naam,
            )
        )
        existing = result.scalar_one_or_none()
        status_type = "new"
        if existing:
            status_type = "existing"
            existing_count += 1
        preview.append(
            {
                "naam": team_naam,
                "captain_naam": captain_naam,
                "captain_email": captain_email,
                "speelklasse": speelklasse,
                "status": status_type,
            }
        )
    return {
        "preview": preview,
        "total_rows": len(preview),
        "new_teams": len([p for p in preview if p["status"] == "new"]),
        "existing_teams": existing_count,
    }


@router.post("/import/csv/confirm")
async def confirm_import_teams_csv(
    competitie_id: str,
    file: UploadFile = File(...),
    column_mapping: str = "{}",
    overwrite: bool = False,
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
    import json

    mapping = json.loads(column_mapping)
    csv_naam = mapping.get("naam", "Teamnaam")
    csv_captain = mapping.get("captain_naam", "Capitano")
    csv_email = mapping.get("captain_email", "Email")
    csv_klasse = mapping.get("speelklasse", "Klasse")
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    created = 0
    skipped = 0
    for row in reader:
        team_naam = row.get(csv_naam, "").strip()
        if not team_naam:
            continue
        captain_naam = row.get(csv_captain, "").strip()
        captain_email = row.get(csv_email, "").strip()
        speelklasse = row.get(csv_klasse, "").strip()
        result = await db.execute(
            select(Team).where(
                Team.club_id == club.id,
                Team.competitie_id == competitie_uuid,
                Team.naam == team_naam,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            if overwrite:
                existing.captain_naam = captain_naam
                existing.captain_email = captain_email
                existing.speelklasse = speelklasse
            skipped += 1
            continue
        team = Team(
            club_id=club.id,
            competitie_id=competitie_uuid,
            naam=team_naam,
            captain_naam=captain_naam,
            captain_email=captain_email,
            speelklasse=speelklasse,
        )
        db.add(team)
        created += 1
    await db.commit()
    return {
        "created": created,
        "skipped": skipped,
    }
