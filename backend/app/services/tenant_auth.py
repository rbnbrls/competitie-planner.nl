import structlog
from uuid import UUID
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import Club, User
from app.services.auth import TokenPayload, decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/tenant/login")


async def get_current_tenant_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    club_id: UUID | None = Query(None, description="Club ID for superadmin access"),
) -> tuple[User, Club | None]:
    payload = decode_token(token)
    token_payload = TokenPayload(payload)

    if token_payload.type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    result = await db.execute(select(User).where(User.id == token_payload.user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    if not user.club_id:
        if user.is_superadmin:
            if club_id:
                result = await db.execute(
                    select(Club).where(Club.id == club_id).options(selectinload(Club.banen))
                )
                club = result.scalar_one_or_none()
                if not club:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Club not found",
                    )
                if club.status == "suspended":
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Uw verenigingsaccount is niet actief. Neem contact op met de platformbeheerder.",
                    )
                structlog.contextvars.bind_contextvars(
                    user_id=str(user.id),
                    club_id=str(club.id),
                )
                return user, club
            return user, None
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access required",
        )

    result = await db.execute(
        select(Club).where(Club.id == user.club_id).options(selectinload(Club.banen))
    )
    club = result.scalar_one_or_none()

    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found",
        )

    if club.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Uw verenigingsaccount is niet actief. Neem contact op met de platformbeheerder.",
        )

    structlog.contextvars.bind_contextvars(
        user_id=str(user.id),
        club_id=str(club.id),
    )

    return user, club


TENANT_ADMIN_ROLES = {"vereniging_admin", "club_admin", "admin"}


async def get_current_tenant_admin(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    club_id: UUID | None = Query(None, description="Club ID for superadmin access"),
) -> tuple[User, Club | None]:
    user, club = await get_current_tenant_user(token, db, club_id)
    if user.is_superadmin:
        return user, club
    if user.role not in TENANT_ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user, club


def generate_public_token() -> str:
    """Generate a secure random string for public links."""
    import secrets

    return secrets.token_urlsafe(32)
