import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.exceptions import ResourceNotFoundError
from app.models import Club, User, InviteToken
from app.routers.auth import get_current_superadmin
from app.schemas import ClubCreate, ClubResponse, ClubUpdate, UserResponse, UserUpdate
from app.services.audit import log_audit
router = APIRouter(
    prefix="/superadmin",
    tags=["superadmin"]
)
@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> dict[str, Any]:
    clubs_result = await db.execute(select(Club))
    clubs = clubs_result.scalars().all()
    total_clubs = len(clubs)
    active_clubs = sum(1 for c in clubs if c.status == "active")
    trial_clubs = sum(1 for c in clubs if c.status == "trial")
    suspended_clubs = sum(1 for c in clubs if c.status == "suspended")
    users_result = await db.execute(select(User).where(~User.is_superadmin))
    users = users_result.scalars().all()
    total_users = len(users)
    week_ago = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=7)
    active_users = sum(1 for u in users if u.last_login and u.last_login >= week_ago)
    recent_clubs = sorted(clubs, key=lambda c: c.created_at, reverse=True)[:5]
    recent_logins = sorted(
        [u for u in users if u.last_login],
        key=lambda u: u.last_login or datetime.min,
        reverse=True,
    )[:5]
    return {
        "metrics": {
            "total_clubs": total_clubs,
            "active_clubs": active_clubs,
            "trial_clubs": trial_clubs,
            "suspended_clubs": suspended_clubs,
            "total_users": total_users,
            "active_users_last_7_days": active_users,
        },
        "recent_clubs": [
            {
                "id": str(c.id),
                "naam": c.naam,
                "slug": c.slug,
                "status": c.status,
                "created_at": c.created_at.isoformat(),
            }
            for c in recent_clubs
        ],
        "recent_logins": [
            {
                "id": str(u.id),
                "full_name": u.full_name,
                "email": u.email,
                "club_id": str(u.club_id) if u.club_id else None,
                "last_login": u.last_login.isoformat() if u.last_login else None,
            }
            for u in recent_logins
        ],
    }
@router.get("/clubs", response_model=list[ClubResponse])
async def list_clubs(
    status_filter: str | None = None,
    search: str | None = None,
    page: int = 1,
    per_page: int = 25,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> list[Club]:
    query = select(Club)
    if status_filter:
        query = query.where(Club.status == status_filter)
    if search:
        query = query.where((Club.naam.ilike(f"%{search}%")) | (Club.slug.ilike(f"%{search}%")))
    query = query.order_by(Club.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return result.scalars().all()
@router.get("/clubs/{club_id}", response_model=ClubResponse)
async def get_club(
    club_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> Club:
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise ResourceNotFoundError("Club niet gevonden")
    return club
@router.post("/clubs", response_model=ClubResponse, status_code=201)
async def create_club(
    club_data: ClubCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> Club:
    # Extract admin info if provided
    admin_email = club_data.admin_email
    admin_full_name = club_data.admin_full_name
    
    # Create club without extra fields
    club_dict = club_data.model_dump(exclude={"admin_email", "admin_full_name"})
    club = Club(**club_dict)
    db.add(club)
    await db.commit()
    await db.refresh(club)

    # Create invitation if admin_email is provided
    if admin_email:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=48)
        invite = InviteToken(
            club_id=club.id,
            email=admin_email,
            role="vereniging_admin",
            token=token,
            expires_at=expires_at,
        )
        db.add(invite)
        await db.commit()
        # In a real app, we would send an email here
    log_audit(
        "club.create",
        actor_id=str(current_user.id),
        actor_email=current_user.email,
        target_type="club",
        target_id=str(club.id),
        changed_fields=list(club_data.model_dump().keys()),
    )
    return club
@router.patch("/clubs/{club_id}", response_model=ClubResponse)
async def update_club(
    club_id: UUID,
    club_data: ClubUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> Club:
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise ResourceNotFoundError("Club niet gevonden")
    update_data = club_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(club, field, value)
    await db.commit()
    await db.refresh(club)
    log_audit(
        "club.update",
        actor_id=str(current_user.id),
        actor_email=current_user.email,
        target_type="club",
        target_id=str(club_id),
        changed_fields=list(update_data.keys()),
    )
    return club
@router.get("/users", response_model=list[UserResponse])
async def list_users(
    club_id: UUID | None = None,
    role: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> list[User]:
    query = select(User).where(~User.is_superadmin)
    if club_id:
        query = query.where(User.club_id == club_id)
    if role:
        query = query.where(User.role == role)
    if search:
        query = query.where(
            (User.full_name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )
    query = query.order_by(User.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()
@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise ResourceNotFoundError("Gebruiker niet gevonden")
    return user
@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise ResourceNotFoundError("Gebruiker niet gevonden")
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    log_audit(
        "user.update",
        actor_id=str(current_user.id),
        actor_email=current_user.email,
        target_type="user",
        target_id=str(user_id),
        changed_fields=list(update_data.keys()),
    )
    return user
@router.get("/clubs/{club_id}/users-count")
async def get_club_users_count(
    club_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> dict:
    result = await db.execute(select(func.count(User.id)).where(User.club_id == club_id))
    count = result.scalar()
    return {"count": count}
class BillingUpdate(BaseModel):
    billing_info: str | None = None
@router.get("/billing")
async def get_billing_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> dict:
    result = await db.execute(select(Club))
    clubs = result.scalars().all()
    trials = []
    actives = []
    suspended = []
    # now = datetime.now(UTC)  # reserved for future billing logic
    for c in clubs:
        entry = {
            "id": str(c.id),
            "naam": c.naam,
            "slug": c.slug,
            "status": c.status,
            "trial_ends_at": c.trial_ends_at.isoformat() if c.trial_ends_at else None,
            "billing_info": c.billing_info,
        }
        if c.status == "trial":
            trials.append(entry)
        elif c.status == "active":
            actives.append(entry)
        elif c.status == "suspended":
            suspended.append(entry)
    return {
        "trials": trials,
        "actives": actives,
        "suspended": suspended,
        "summary": {
            "total_trials": len(trials),
            "total_actives": len(actives),
            "total_suspended": len(suspended),
        },
    }
@router.post("/clubs/{club_id}/billing")
async def update_club_billing(
    club_id: UUID,
    data: BillingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> dict:
    result = await db.execute(select(Club).where(Club.id == club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise ResourceNotFoundError("Club niet gevonden")
    if data.billing_info is not None:
        club.billing_info = data.billing_info
    await db.commit()
    await db.refresh(club)
    log_audit(
        "club.update",
        actor_id=str(current_user.id),
        actor_email=current_user.email,
        target_type="club",
        target_id=str(club_id),
        changed_fields=["billing_info"],
    )
    return {
        "id": str(club.id),
        "billing_info": club.billing_info,
    }
@router.get("/billing/export")
async def export_billing_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> dict:
    result = await db.execute(select(Club))
    clubs = result.scalars().all()
    import csv
    import io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Naam", "Slug", "Status", "Trial ends", "Billing info"])
    for c in clubs:
        writer.writerow(
            [
                str(c.id),
                c.naam,
                c.slug,
                c.status,
                c.trial_ends_at.isoformat() if c.trial_ends_at else "",
                c.billing_info or "",
            ]
        )
    return {
        "csv": output.getvalue(),
        "filename": "billing_export.csv",
    }
