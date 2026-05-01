"""
File: backend/app/routers/planning.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import Baan, BaanToewijzing, Competitie, Speelronde, Team
from app.services.audit import log_audit
from app.services.email import EmailService
from app.services.mollie import MollieService
from app.services.pdf import PDFService
from app.services.planning import (
    genereer_indeling,
    get_historie_heatmap,
    get_snapshots,
    herstel_snapshot,
    plan_competitie,
    save_snapshot,
    update_planning_historie,
)
from app.services.tenant_auth import get_current_tenant_user

router = APIRouter(prefix="/tenant", tags=["planning"])


class BaanToewijzingResponse(BaseModel):
    id: str
    team_id: str
    baan_id: str
    tijdslot_start: str
    tijdslot_eind: str | None = None
    notitie: str | None = None


class SpeelrondeDetailResponse(BaseModel):
    id: str
    competitie_id: str
    club_id: str
    datum: str
    week_nummer: int | None
    is_inhaalronde: bool
    status: str
    public_token: str | None = None
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


@router.post("/rondes/{ronde_id}/genereer", response_model=SpeelrondeDetailResponse)
async def generate_indeling(
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
    result = await db.execute(
        select(Speelronde)
        .where(Speelronde.id == ronde_uuid)
        .options(selectinload(Speelronde.competitie))
    )
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

    await save_snapshot(ronde_uuid, ronde.club_id, "genereer", db, user_id=user.id)
    await genereer_indeling(ronde_uuid, db)

    toewijzing_result = await db.execute(
        select(BaanToewijzing)
        .where(BaanToewijzing.ronde_id == ronde_uuid)
        .options(selectinload(BaanToewijzing.baan), selectinload(BaanToewijzing.team))
    )
    toewijzingen = list(toewijzing_result.scalars().all())
    return SpeelrondeDetailResponse(
        id=str(ronde.id),
        competitie_id=str(ronde.competitie_id),
        club_id=str(ronde.club_id),
        datum=ronde.datum.isoformat(),
        week_nummer=ronde.week_nummer,
        is_inhaalronde=ronde.is_inhaalronde,
        status=ronde.status,
        public_token=ronde.public_token,
        toewijzingen=[
            BaanToewijzingResponse(
                id=str(t.id),
                team_id=str(t.team_id),
                baan_id=str(t.baan_id),
                tijdslot_start=t.tijdslot_start.isoformat() if t.tijdslot_start else "19:00:00",
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
    toewijzing_result = await db.execute(
        select(BaanToewijzing)
        .where(BaanToewijzing.id == toewijzing_uuid)
        .options(selectinload(BaanToewijzing.ronde).selectinload(Speelronde.competitie))
    )
    toewijzing = toewijzing_result.scalar_one_or_none()
    if not toewijzing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Toewijzing not found",
        )
    ronde = toewijzing.ronde
    if not ronde or ronde.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    competitie = ronde.competitie
    if not competitie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )
    mollie_service = MollieService(db)
    is_paid = await mollie_service.is_competitie_paid(club.id, competitie.naam)
    if club.status != "trial" and not is_paid:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Betaling nodig voor competitie '{competitie.naam}'. Ga naar het Payments tabblad om te betalen.",
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
        new_start = datetime.strptime(data.tijdslot_start, "%H:%M").time()
        new_end = toewijzing.tijdslot_eind
        result = await db.execute(
            select(BaanToewijzing).where(
                and_(
                    BaanToewijzing.ronde_id == toewijzing.ronde_id,
                    BaanToewijzing.baan_id == toewijzing.baan_id,
                    BaanToewijzing.id != toewijzing.id,
                )
            )
        )
        existing_toewijzingen = result.scalars().all()
        for existing in existing_toewijzingen:
            if existing.tijdslot_eind is None or existing.tijdslot_start is None:
                continue
            if not (
                new_start >= existing.tijdslot_eind
                or (new_end and new_end <= existing.tijdslot_start)
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tijdslot overlapt met bestaande toewijzing ({existing.tijdslot_start.isoformat()} - {existing.tijdslot_eind.isoformat()})",
                )
        toewijzing.tijdslot_start = new_start
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
    result = await db.execute(select(Competitie).where(Competitie.id == ronde.competitie_id))
    competitie = result.scalar_one_or_none()
    if not competitie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )
    mollie_service = MollieService(db)
    is_paid = await mollie_service.is_competitie_paid(club.id, competitie.naam)
    if club.status != "trial" and not is_paid:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Betaling nodig voor competitie '{competitie.naam}'. Ga naar het Payments tabblad om te betalen.",
        )
    if ronde.status == "gepubliceerd":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ronde is already published",
        )
    import secrets

    if not ronde.public_token:
        ronde.public_token = secrets.token_urlsafe(32)
    ronde.status = "gepubliceerd"
    ronde.published_at = datetime.now(UTC)
    ronde.published_by = user.id
    result = await db.execute(select(Competitie).where(Competitie.id == ronde.competitie_id))
    competitie = result.scalar_one_or_none()
    email_notification_sent = False
    if competitie and competitie.email_notifications_enabled:
        email_service = EmailService(db)
        email_result = await email_service.send_publication_notification(ronde_uuid)
        email_notification_sent = email_result.get("sent", 0) > 0
    log_audit(
        "ronde.publish",
        actor_id=str(user.id),
        target_type="ronde",
        target_id=str(ronde.id),
        club_id=str(club.id),
        competitie_id=str(competitie.id),
    )
    await db.commit()
    await db.refresh(ronde)
    await update_planning_historie(ronde_uuid, db)
    public_url = f"/display/{club.slug}/{ronde.public_token}"
    return {
        "id": str(ronde.id),
        "status": ronde.status,
        "public_token": ronde.public_token,
        "public_url": public_url,
        "email_notification_sent": email_notification_sent,
    }


@router.post("/rondes/{ronde_id}/depublish")
async def depublish_ronde(
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
    result = await db.execute(
        select(Speelronde)
        .where(Speelronde.id == ronde_uuid)
        .options(selectinload(Speelronde.competitie))
    )
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
    competitie = ronde.competitie
    if not competitie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )
    mollie_service = MollieService(db)
    is_paid = await mollie_service.is_competitie_paid(club.id, competitie.naam)
    if club.status != "trial" and not is_paid:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Betaling nodig voor competitie '{competitie.naam}'. Ga naar het Payments tabblad om te betalen.",
        )
    if ronde.status != "gepubliceerd":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ronde is not published",
        )
    ronde.status = "concept"
    await db.commit()
    await db.refresh(ronde)
    log_audit(
        "ronde.depublish",
        actor_id=str(user.id),
        target_type="ronde",
        target_id=str(ronde.id),
        club_id=str(club.id),
        competitie_id=str(competitie.id),
    )
    return {
        "id": str(ronde.id),
        "status": ronde.status,
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
    result = await db.execute(select(Baan).where(Baan.club_id == club.id, Baan.actief))
    banen = list(result.scalars().all())
    heatmap = await get_historie_heatmap(competitie_uuid, db)
    result = await db.execute(
        select(Team).where(Team.competitie_id == competitie_uuid, Team.actief)
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


@router.get("/banen")
async def list_banen_for_planning(
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    user, club = current
    result = await db.execute(select(Baan).where(Baan.club_id == club.id, Baan.actief))
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


@router.get("/rondes/{ronde_id}")
async def get_ronde(
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
    result = await db.execute(
        select(Speelronde)
        .where(Speelronde.id == ronde_uuid)
        .options(selectinload(Speelronde.competitie))
    )
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
        select(BaanToewijzing)
        .options(selectinload(BaanToewijzing.team), selectinload(BaanToewijzing.baan))
        .where(BaanToewijzing.ronde_id == ronde_uuid)
    )
    toewijzingen = result.scalars().all()
    return SpeelrondeDetailResponse(
        id=str(ronde.id),
        competitie_id=str(ronde.competitie_id),
        club_id=str(ronde.club_id),
        datum=ronde.datum.isoformat(),
        week_nummer=ronde.week_nummer,
        is_inhaalronde=ronde.is_inhaalronde,
        status=ronde.status,
        public_token=ronde.public_token,
        toewijzingen=[
            BaanToewijzingResponse(
                id=str(t.id),
                team_id=str(t.team_id),
                baan_id=str(t.baan_id),
                tijdslot_start=t.tijdslot_start.isoformat() if t.tijdslot_start else "",
                tijdslot_eind=t.tijdslot_eind.isoformat() if t.tijdslot_eind else None,
                notitie=t.notitie,
            )
            for t in toewijzingen
        ],
    )


@router.get("/rondes/{ronde_id}/pdf")
async def download_ronde_pdf(
    ronde_id: str,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    user, club = current
    try:
        ronde_uuid = UUID(ronde_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ronde ID",
        )
    result = await db.execute(
        select(Speelronde)
        .where(Speelronde.id == ronde_uuid)
        .options(selectinload(Speelronde.competitie))
    )
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
    if ronde.status != "gepubliceerd":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only published roundes can be exported to PDF",
        )
    pdf_service = PDFService(db)
    pdf_content = await pdf_service.generate_banenindeling_pdf(ronde_uuid)
    filename = f"banenindeling-{club.slug}-{ronde.datum.strftime('%Y-%m-%d')}.pdf"
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


class BulkGenerateRequest(BaseModel):
    ronde_ids: list[str]


class BulkPublishRequest(BaseModel):
    ronde_ids: list[str]


@router.post("/rondes/bulk-generate")
async def bulk_generate_rondes(
    competitie_id: str,
    data: BulkGenerateRequest,
    current: tuple = Depends(get_current_tenant_user),
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
    result = await db.execute(select(Competitie).where(Competitie.id == competitie_uuid))
    competitie = result.scalar_one_or_none()
    if not competitie or competitie.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )
    mollie_service = MollieService(db)
    is_paid = await mollie_service.is_competitie_paid(club.id, competitie.naam)
    if club.status != "trial" and not is_paid:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Betaling nodig voor competitie '{competitie.naam}'. Ga naar het Payments tabblad om te betalen.",
        )
    results = []
    errors = []
    for ronde_id in data.ronde_ids:
        try:
            ronde_uuid = UUID(ronde_id)
        except ValueError:
            errors.append({"ronde_id": ronde_id, "error": "Invalid ID"})
            continue
        result = await db.execute(select(Speelronde).where(Speelronde.id == ronde_uuid))
        ronde = result.scalar_one_or_none()
        if not ronde:
            errors.append({"ronde_id": ronde_id, "error": "Not found"})
            continue
        if ronde.status == "gepubliceerd":
            errors.append({"ronde_id": ronde_id, "error": "Already published"})
            continue
        try:
            toewijzingen = await genereer_indeling(ronde_uuid, db)
            results.append(
                {
                    "ronde_id": str(ronde.id),
                    "datum": ronde.datum.isoformat(),
                    "toewijzingen_count": len(toewijzingen),
                }
            )
        except Exception as e:
            errors.append({"ronde_id": str(ronde.id), "error": str(e)})
    return {
        "success": len(results),
        "errors": errors,
        "results": results,
    }


@router.post("/rondes/bulk-publish")
async def bulk_publish_rondes(
    competitie_id: str,
    data: BulkPublishRequest,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    import secrets

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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )
    mollie_service = MollieService(db)
    is_paid = await mollie_service.is_competitie_paid(club.id, competitie.naam)
    if club.status != "trial" and not is_paid:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Betaling nodig voor competitie '{competitie.naam}'. Ga naar het Payments tabblad om te betalen.",
        )
    results = []
    errors = []
    email_notifications_sent = 0
    for ronde_id in data.ronde_ids:
        try:
            ronde_uuid = UUID(ronde_id)
        except ValueError:
            errors.append({"ronde_id": ronde_id, "error": "Invalid ID"})
            continue
        result = await db.execute(select(Speelronde).where(Speelronde.id == ronde_uuid))
        ronde = result.scalar_one_or_none()
        if not ronde:
            errors.append({"ronde_id": ronde_id, "error": "Not found"})
            continue
        if ronde.status == "gepubliceerd":
            errors.append({"ronde_id": str(ronde.id), "error": "Already published"})
            continue
        try:
            if not ronde.public_token:
                ronde.public_token = secrets.token_urlsafe(32)
            ronde.status = "gepubliceerd"
            ronde.published_at = datetime.now(UTC)
            ronde.published_by = user.id
            await db.commit()
            await db.refresh(ronde)
            await update_planning_historie(ronde_uuid, db)
            if competitie.email_notifications_enabled:
                email_service = EmailService(db)
                email_result = await email_service.send_publication_notification(ronde_uuid)
                if email_result.get("sent", 0) > 0:
                    email_notifications_sent += 1
            log_audit(
                "ronde.publish",
                actor_id=str(user.id),
                target_type="ronde",
                target_id=str(ronde.id),
                club_id=str(club.id),
                competitie_id=str(competitie.id),
                bulk=True,
            )
            results.append(
                {
                    "ronde_id": str(ronde.id),
                    "datum": ronde.datum.isoformat(),
                    "public_token": ronde.public_token,
                }
            )
        except Exception as e:
            errors.append({"ronde_id": str(ronde.id), "error": str(e)})
    return {
        "success": len(results),
        "errors": errors,
        "results": results,
        "email_notifications_sent": email_notifications_sent,
    }


class PlanningPreviewRequest(BaseModel):
    ronde_ids: list[str] | None = None


@router.post("/competities/{competitie_id}/planning/preview")
async def preview_planning(
    competitie_id: str,
    data: PlanningPreviewRequest,
    current: tuple = Depends(get_current_tenant_user),
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
    ronde_uuids = None
    if data.ronde_ids:
        try:
            ronde_uuids = [UUID(rid) for rid in data.ronde_ids]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ronde ID(s)",
            )
    result = await db.execute(select(Competitie).where(Competitie.id == competitie_uuid))
    competitie = result.scalar_one_or_none()
    if not competitie or competitie.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )
    return await plan_competitie(competitie_uuid, db, ronde_ids=ronde_uuids, apply=False)


@router.post("/competities/{competitie_id}/planning/apply")
async def apply_planning(
    competitie_id: str,
    data: PlanningPreviewRequest,
    current: tuple = Depends(get_current_tenant_user),
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
    ronde_uuids = None
    if data.ronde_ids:
        try:
            ronde_uuids = [UUID(rid) for rid in data.ronde_ids]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ronde ID(s)",
            )
    result = await db.execute(select(Competitie).where(Competitie.id == competitie_uuid))
    competitie = result.scalar_one_or_none()
    if not competitie or competitie.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )
    mollie_service = MollieService(db)
    is_paid = await mollie_service.is_competitie_paid(club.id, competitie.naam)
    if club.status != "trial" and not is_paid:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Betaling nodig voor competitie '{competitie.naam}'. Ga naar het Payments tabblad om te betalen.",
        )
    return await plan_competitie(competitie_uuid, db, ronde_ids=ronde_uuids, apply=True)


@router.get("/rondes/{ronde_id}/snapshots")
async def list_snapshots(
    ronde_id: str,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    user, club = current
    try:
        ronde_uuid = UUID(ronde_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ronde ID")
    result = await db.execute(select(Speelronde).where(Speelronde.id == ronde_uuid))
    ronde = result.scalar_one_or_none()
    if not ronde or ronde.club_id != club.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speelronde not found")
    snapshots = await get_snapshots(ronde_uuid, db)
    return [
        {
            "id": str(s.id),
            "aanleiding": s.aanleiding,
            "created_at": s.created_at.isoformat(),
            "count": len(s.snapshot_data),
        }
        for s in snapshots
    ]


@router.post("/rondes/{ronde_id}/snapshots/{snapshot_id}/herstel")
async def herstel_ronde_snapshot(
    ronde_id: str,
    snapshot_id: str,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> SpeelrondeDetailResponse:
    user, club = current
    try:
        ronde_uuid = UUID(ronde_id)
        snapshot_uuid = UUID(snapshot_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID")
    result = await db.execute(
        select(Speelronde)
        .where(Speelronde.id == ronde_uuid)
        .options(selectinload(Speelronde.competitie))
    )
    ronde = result.scalar_one_or_none()
    if not ronde or ronde.club_id != club.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speelronde not found")
    if ronde.status == "gepubliceerd":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kan geen snapshot herstellen voor een gepubliceerde ronde",
        )
    await save_snapshot(ronde_uuid, club.id, "voor_herstel", db, user_id=user.id)
    await herstel_snapshot(snapshot_uuid, ronde_uuid, db)
    toewijzing_result = await db.execute(
        select(BaanToewijzing)
        .where(BaanToewijzing.ronde_id == ronde_uuid)
        .options(selectinload(BaanToewijzing.baan), selectinload(BaanToewijzing.team))
    )
    toewijzingen = list(toewijzing_result.scalars().all())
    log_audit(
        "ronde.snapshot_herstel",
        actor_id=str(user.id),
        target_type="ronde",
        target_id=str(ronde.id),
        club_id=str(club.id),
        snapshot_id=str(snapshot_uuid),
    )
    return SpeelrondeDetailResponse(
        id=str(ronde.id),
        competitie_id=str(ronde.competitie_id),
        club_id=str(ronde.club_id),
        datum=ronde.datum.isoformat(),
        week_nummer=ronde.week_nummer,
        is_inhaalronde=ronde.is_inhaalronde,
        status=ronde.status,
        public_token=ronde.public_token,
        toewijzingen=[
            BaanToewijzingResponse(
                id=str(t.id),
                team_id=str(t.team_id),
                baan_id=str(t.baan_id),
                tijdslot_start=t.tijdslot_start.isoformat() if t.tijdslot_start else "19:00:00",
                tijdslot_eind=t.tijdslot_eind.isoformat() if t.tijdslot_eind else None,
                notitie=t.notitie,
            )
            for t in toewijzingen
        ],
    )


class AfgelastRequest(BaseModel):
    stuur_emails: bool = True


@router.post("/rondes/{ronde_id}/afgelast")
async def mark_ronde_afgelast(
    ronde_id: str,
    data: AfgelastRequest,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Mark a speelronde as 'afgelast' (cancelled due to weather).
    Optionally sends cancellation emails to captains of home teams.
    """
    user, club = current
    try:
        ronde_uuid = UUID(ronde_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ronde ID",
        )
    result = await db.execute(
        select(Speelronde)
        .where(Speelronde.id == ronde_uuid)
        .options(selectinload(Speelronde.competitie))
    )
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

    ronde.status = "afgelast"
    await db.commit()
    await db.refresh(ronde)

    email_sent = 0
    if data.stuur_emails:
        email_service = EmailService(db)
        email_result = await email_service.send_cancellation_notification(ronde_uuid)
        email_sent = email_result.get("sent", 0)

    log_audit(
        "ronde.afgelast",
        actor_id=str(user.id),
        target_type="ronde",
        target_id=str(ronde.id),
        club_id=str(club.id),
    )
    return {
        "id": str(ronde.id),
        "status": ronde.status,
        "email_sent": email_sent,
    }
