import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Club, User
from app.services.auth import TokenPayload, decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/tenant/login")


async def get_current_tenant_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, Club]:
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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access required",
        )

    result = await db.execute(select(Club).where(Club.id == user.club_id))
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


async def get_current_tenant_admin(
    current: tuple[User, Club] = Depends(get_current_tenant_user),
) -> tuple[User, Club]:
    user, club = current
    if user.role != "vereniging_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user, club


def generate_public_token() -> str:
    """Generate a secure random string for public links."""
    import secrets

    return secrets.token_urlsafe(32)
