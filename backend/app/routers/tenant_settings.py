import os
import shutil
import traceback
import logging
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Baan, User
from app.services.audit import log_audit
from app.services.tenant_auth import get_current_tenant_admin, get_current_tenant_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tenant", tags=["tenant-settings"])
CURRENT_TENANT_DEP = Depends(get_current_tenant_user)
CURRENT_ADMIN_DEP = Depends(get_current_tenant_admin)


class ClubSettingsUpdate(BaseModel):
    naam: str | None = None
    adres: str | None = None
    postcode: str | None = None
    stad: str | None = None
    telefoon: str | None = None
    website: str | None = None
    max_thuisteams_per_dag: int | None = None
    max_banen: int | None = None
    heeft_buitenbanen: bool | None = None
    latitude: float | None = None
    longitude: float | None = None


@router.get("/settings")
async def get_settings(
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    if club is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Club ID required. Specify club_id query parameter for superadmin access.",
        )
    return {
        "id": str(club.id),
        "naam": club.naam,
        "slug": club.slug,
        "adres": club.adres,
        "postcode": club.postcode,
        "stad": club.stad,
        "telefoon": club.telefoon,
        "website": club.website,
        "status": club.status,
        "max_thuisteams_per_dag": club.max_thuisteams_per_dag,
        "max_banen": club.max_banen,
        "heeft_buitenbanen": club.heeft_buitenbanen,
        "latitude": club.latitude,
        "longitude": club.longitude,
    }


@router.patch("/settings")
async def update_settings(
    data: ClubSettingsUpdate,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    if data.naam is not None:
        club.naam = data.naam
    if data.adres is not None:
        club.adres = data.adres
    if data.postcode is not None:
        club.postcode = data.postcode
    if data.stad is not None:
        club.stad = data.stad
    if data.telefoon is not None:
        club.telefoon = data.telefoon
    if data.website is not None:
        club.website = data.website
    if data.max_thuisteams_per_dag is not None:
        club.max_thuisteams_per_dag = data.max_thuisteams_per_dag
    if data.max_banen is not None:
        club.max_banen = data.max_banen
    if data.heeft_buitenbanen is not None:
        club.heeft_buitenbanen = data.heeft_buitenbanen
    if data.latitude is not None:
        club.latitude = data.latitude
    if data.longitude is not None:
        club.longitude = data.longitude
    await db.commit()
    await db.refresh(club)
    changed = [k for k, v in data.model_dump(exclude_unset=True).items() if v is not None]
    log_audit(
        "club.update",
        actor_id=str(user.id),
        target_type="club",
        target_id=str(club.id),
        club_id=str(club.id),
        changed_fields=changed,
    )
    return {
        "id": str(club.id),
        "naam": club.naam,
        "slug": club.slug,
        "adres": club.adres,
        "postcode": club.postcode,
        "stad": club.stad,
        "telefoon": club.telefoon,
        "website": club.website,
        "status": club.status,
        "max_thuisteams_per_dag": club.max_thuisteams_per_dag,
        "max_banen": club.max_banen,
        "heeft_buitenbanen": club.heeft_buitenbanen,
        "latitude": club.latitude,
        "longitude": club.longitude,
    }


class BrandingUpdate(BaseModel):
    primary_color: str | None = None
    secondary_color: str | None = None
    accent_color: str | None = None
    font_choice: str | None = None

    @model_validator(mode="before")
    @classmethod
    def validate_hex_colors(cls, values):
        if values is None:
            return values
        for field in ["primary_color", "secondary_color", "accent_color"]:
            val = values.get(field)
            if val is not None and isinstance(val, str):
                if not val.startswith("#") or len(val) not in (4, 7):
                    logger.warning(f"Invalid hex color format for {field}: {val}")
        return values


@router.get("/branding")
async def get_branding(
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    return {
        "primary_color": club.primary_color,
        "secondary_color": club.secondary_color,
        "accent_color": club.accent_color,
        "font_choice": club.font_choice,
        "logo_url": club.logo_url,
    }


@router.patch("/branding")
async def update_branding(
    data: BrandingUpdate,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    logger.info(
        f"branding_update_started: club_id={club.id}, fields={data.model_dump(exclude_unset=True)}"
    )
    if data.primary_color is not None:
        club.primary_color = data.primary_color
    if data.secondary_color is not None:
        club.secondary_color = data.secondary_color
    if data.accent_color is not None:
        club.accent_color = data.accent_color
    if data.font_choice is not None:
        club.font_choice = data.font_choice

    try:
        await db.commit()
        await db.refresh(club)
        logger.info(f"branding_update_success: club_id={club.id}")
    except Exception as e:
        await db.rollback()
        error_type = type(e).__name__
        logger.error(
            f"branding_update_failed: club_id={club.id}, error={str(e)}, error_type={error_type}, trace={traceback.format_exc()}"
        )
        if "unique" in str(e).lower() or "integrity" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflict: {str(e)}",
            )
        elif "timeout" in str(e).lower() or "pool" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database temporarily unavailable. Please try again.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save branding: {str(e)}",
            )

    return {
        "primary_color": club.primary_color,
        "secondary_color": club.secondary_color,
        "accent_color": club.accent_color,
        "font_choice": club.font_choice,
        "logo_url": club.logo_url,
    }


@router.post("/branding/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    if file.size and file.size > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Max 2MB.",
        )
    allowed_extensions = {".png", ".svg"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PNG and SVG files are allowed.",
        )
    upload_dir = f"/tmp/uploads/{club.id}"
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"logo{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    club.logo_url = f"/uploads/{club.id}/{filename}"
    await db.commit()
    return {"logo_url": club.logo_url}


@router.get("/banen")
async def list_banen(
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    result = await db.execute(select(Baan).where(Baan.club_id == club.id).order_by(Baan.nummer))
    banen = result.scalars().all()
    return {
        "banen": [
            {
                "id": str(b.id),
                "nummer": b.nummer,
                "naam": b.naam,
                "verlichting_type": b.verlichting_type,
                "overdekt": b.overdekt,
                "prioriteit_score": b.prioriteit_score,
                "actief": b.actief,
                "notitie": b.notitie,
            }
            for b in banen
        ]
    }


class BaanCreate(BaseModel):
    nummer: int
    naam: str | None = None
    verlichting_type: str = "geen"
    overdekt: bool = False
    prioriteit_score: int = 5


class BaanUpdate(BaseModel):
    nummer: int | None = None
    naam: str | None = None
    verlichting_type: str | None = None
    overdekt: bool | None = None
    prioriteit_score: int | None = None
    actief: bool | None = None
    notitie: str | None = None


@router.post("/banen")
async def create_banen(
    data: BaanCreate,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    result = await db.execute(
        select(Baan).where(
            Baan.club_id == club.id,
            Baan.nummer == data.nummer,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Baan with this number already exists",
        )
    baan = Baan(
        club_id=club.id,
        nummer=data.nummer,
        naam=data.naam,
        verlichting_type=data.verlichting_type,
        overdekt=data.overdekt,
        prioriteit_score=data.prioriteit_score,
    )
    db.add(baan)
    await db.commit()
    await db.refresh(baan)
    return {
        "id": str(baan.id),
        "nummer": baan.nummer,
        "naam": baan.naam,
        "verlichting_type": baan.verlichting_type,
        "overdekt": baan.overdekt,
        "prioriteit_score": baan.prioriteit_score,
        "actief": baan.actief,
    }


@router.get("/banen/{baan_id}")
async def get_baan(
    baan_id: str,
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    result = await db.execute(
        select(Baan).where(
            Baan.id == UUID(baan_id),
            Baan.club_id == club.id,
        )
    )
    baan = result.scalar_one_or_none()
    if not baan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Baan not found",
        )
    return {
        "id": str(baan.id),
        "nummer": baan.nummer,
        "naam": baan.naam,
        "verlichting_type": baan.verlichting_type,
        "overdekt": baan.overdekt,
        "prioriteit_score": baan.prioriteit_score,
        "actief": baan.actief,
        "notitie": baan.notitie,
    }


@router.patch("/banen/{baan_id}")
async def update_baan(
    baan_id: str,
    data: BaanUpdate,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    result = await db.execute(
        select(Baan).where(
            Baan.id == UUID(baan_id),
            Baan.club_id == club.id,
        )
    )
    baan = result.scalar_one_or_none()
    if not baan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Baan not found",
        )
    if data.nummer is not None:
        baan.nummer = data.nummer
    if data.naam is not None:
        baan.naam = data.naam
    if data.verlichting_type is not None:
        baan.verlichting_type = data.verlichting_type
    if data.overdekt is not None:
        baan.overdekt = data.overdekt
    if data.prioriteit_score is not None:
        baan.prioriteit_score = data.prioriteit_score
    if data.actief is not None:
        baan.actief = data.actief
    if data.notitie is not None:
        baan.notitie = data.notitie
    await db.commit()
    await db.refresh(baan)
    return {
        "id": str(baan.id),
        "nummer": baan.nummer,
        "naam": baan.naam,
        "verlichting_type": baan.verlichting_type,
        "overdekt": baan.overdekt,
        "prioriteit_score": baan.prioriteit_score,
        "actief": baan.actief,
        "notitie": baan.notitie,
    }


@router.delete("/banen/{baan_id}")
async def delete_baan(
    baan_id: str,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    result = await db.execute(
        select(Baan).where(
            Baan.id == UUID(baan_id),
            Baan.club_id == club.id,
        )
    )
    baan = result.scalar_one_or_none()
    if not baan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Baan not found",
        )
    baan.actief = False
    await db.commit()
    return {"message": "Baan deactivated successfully"}


@router.get("/users")
async def list_users(
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    result = await db.execute(
        select(User).where(User.club_id == club.id).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return {
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
                "last_login": u.last_login.isoformat() if u.last_login else None,
            }
            for u in users
        ]
    }


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    email_opt_out: bool | None = None
    onboarding_completed: bool | None = None


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    result = await db.execute(
        select(User).where(
            User.id == UUID(user_id),
            User.club_id == club.id,
        )
    )
    user_obj = result.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return {
        "id": str(user_obj.id),
        "email": user_obj.email,
        "full_name": user_obj.full_name,
        "role": user_obj.role,
        "is_active": user_obj.is_active,
        "last_login": user_obj.last_login.isoformat() if user_obj.last_login else None,
        "created_at": user_obj.created_at.isoformat(),
    }


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    data: UserUpdate,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    admin_user, club = current
    result = await db.execute(
        select(User).where(
            User.id == UUID(user_id),
            User.club_id == club.id,
        )
    )
    user_obj = result.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if str(user_obj.id) == str(admin_user.id):
        if data.role is not None and data.role != admin_user.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot change your own role",
            )
        if data.is_active is not None and not data.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate yourself",
            )
    if data.full_name is not None:
        user_obj.full_name = data.full_name
    if data.role is not None:
        user_obj.role = data.role
    if data.is_active is not None:
        user_obj.is_active = data.is_active
    if data.email_opt_out is not None:
        user_obj.email_opt_out = data.email_opt_out
    if data.onboarding_completed is not None:
        user_obj.onboarding_completed = data.onboarding_completed
    await db.commit()
    await db.refresh(user_obj)
    log_audit(
        "user.update",
        actor_id=str(admin_user.id),
        target_type="user",
        target_id=str(user_obj.id),
        club_id=str(club.id),
        changed_fields=[k for k in data.model_dump(exclude_unset=True)],
    )
    return {
        "id": str(user_obj.id),
        "email": user_obj.email,
        "full_name": user_obj.full_name,
        "role": user_obj.role,
        "is_active": user_obj.is_active,
    }


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: str,
    current: tuple = CURRENT_ADMIN_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    admin_user, club = current
    if str(user_id) == str(admin_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate yourself",
        )
    result = await db.execute(
        select(User).where(
            User.id == UUID(user_id),
            User.club_id == club.id,
        )
    )
    user_obj = result.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    user_obj.is_active = False
    await db.commit()
    log_audit(
        "user.deactivate",
        actor_id=str(admin_user.id),
        target_type="user",
        target_id=user_id,
        club_id=str(club.id),
    )
    return {"message": "User deactivated successfully"}


@router.get("/club")
async def get_club(
    current: tuple = CURRENT_TENANT_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    if club is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Club ID required. Specify club_id query parameter for superadmin access.",
        )
    return {
        "id": str(club.id),
        "naam": club.naam,
        "slug": club.slug,
        "status": club.status,
        "primary_color": club.primary_color,
        "secondary_color": club.secondary_color,
        "accent_color": club.accent_color,
        "logo_url": club.logo_url,
        "font_choice": club.font_choice,
        "is_sponsored": club.is_sponsored,
    }
