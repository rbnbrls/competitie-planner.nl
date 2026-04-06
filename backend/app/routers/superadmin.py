from datetime import UTC, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Club, User
from app.routers.auth import get_current_superadmin
from app.schemas import ClubCreate, ClubResponse, ClubUpdate, UserResponse, UserUpdate

router = APIRouter(prefix="/superadmin", tags=["superadmin"])


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

    users_result = await db.execute(select(User).where(User.is_superadmin == False))
    users = users_result.scalars().all()
    total_users = len(users)

    week_ago = datetime.now(UTC) - timedelta(days=7)
    active_users = sum(1 for u in users if u.last_login and u.last_login >= week_ago)

    recent_clubs = sorted(clubs, key=lambda c: c.created_at, reverse=True)[:5]
    recent_logins = sorted(
        [u for u in users if u.last_login],
        key=lambda u: u.last_login,
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
        raise HTTPException(status_code=404, detail="Club not found")
    return club


@router.post("/clubs", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
async def create_club(
    club_data: ClubCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> Club:
    result = await db.execute(select(Club).where(Club.slug == club_data.slug))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")

    reserved_slugs = ["admin", "api", "display", "www", "mail", "app", "static"]
    if club_data.slug.lower() in reserved_slugs:
        raise HTTPException(status_code=400, detail="Slug is reserved")

    club = Club(
        naam=club_data.naam,
        slug=club_data.slug,
        adres=club_data.adres,
        postcode=club_data.postcode,
        stad=club_data.stad,
        telefoon=club_data.telefoon,
        website=club_data.website,
        status="trial",
        trial_ends_at=datetime.now(UTC) + timedelta(days=7),
    )
    db.add(club)
    await db.commit()
    await db.refresh(club)

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
        raise HTTPException(status_code=404, detail="Club not found")

    update_data = club_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(club, field, value)

    await db.commit()
    await db.refresh(club)
    return club


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    club_id: UUID | None = None,
    role: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> list[User]:
    query = select(User).where(User.is_superadmin == False)

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
        raise HTTPException(status_code=404, detail="User not found")
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
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
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

    now = datetime.now(UTC)

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
        raise HTTPException(status_code=404, detail="Club not found")

    if data.billing_info is not None:
        club.billing_info = data.billing_info

    await db.commit()
    await db.refresh(club)

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
