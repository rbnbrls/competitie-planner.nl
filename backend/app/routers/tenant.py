from datetime import datetime, timedelta
from uuid import UUID
import structlog

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db import get_db
from app.limiter import limiter
from app.models import Club, InviteToken, PasswordResetToken, User
from app.schemas import UserResponse
from app.services.audit import log_audit
from app.services.auth import (
    TokenPayload,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/tenant", tags=["tenant"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/tenant/login")


class TenantLoginRequest(BaseModel):
    slug: str


def get_slug_from_request(slug: str | None = Query(None)) -> str:
    if not slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant slug is required",
        )
    return slug


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
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    club_id: UUID | None = Query(None, description="Club ID for superadmin access"),
) -> tuple[User, Club | None]:
    user, club = await get_current_tenant_user(token, db, club_id)
    if user.is_superadmin:
        return user, club
    if user.role != "vereniging_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user, club


@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    slug: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Club).where(Club.slug == slug))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vereniging niet gevonden",
        )
    if club.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Uw verenigingsaccount is niet actief. Neem contact op met de platformbeheerder.",
        )

    result = await db.execute(
        select(User).where(
            User.email == form_data.username,
        )
    )
    user = result.scalar_one_or_none()

    if user and user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gebruik het superadmin portaal voor superadmin accounts",
        )

    result = await db.execute(
        select(User).where(
            User.email == form_data.username,
            User.club_id == club.id,
        )
    )
    user = result.scalar_one_or_none()
    if user:
        if user.locked_until and user.locked_until > datetime.now():
            retry_after = int((user.locked_until - datetime.now()).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Account is tijdelijk geblokkeerd wegens te veel mislukte pogingen. Probeer het over {retry_after // 60 + 1} minuten opnieuw.",
            )
    if not user or not verify_password(form_data.password, user.password_hash):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 3:
                log_audit(
                    "auth.login_failure",
                    actor_id=str(user.id),
                    actor_email=user.email,
                    club_id=str(club.id),
                    result="failure",
                    attempts=user.failed_login_attempts,
                )
            if user.failed_login_attempts >= 10:
                user.locked_until = datetime.now() + timedelta(minutes=15)
                log_audit(
                    "auth.account_locked",
                    actor_id=str(user.id),
                    actor_email=user.email,
                    club_id=str(club.id),
                    result="failure",
                    locked_minutes=15,
                )
            await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "club_id": str(user.club_id),
            "club_slug": club.slug,
            "is_superadmin": False,
        }
    )
    refresh_token = create_refresh_token(user.id)
    # Reset failed attempts on success
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now()
    log_audit(
        "auth.login_success",
        actor_id=str(user.id),
        actor_email=user.email,
        club_id=str(club.id),
    )
    await db.commit()
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "club_id": str(user.club_id),
            "club_slug": club.slug,
        },
        "club": {
            "id": str(club.id),
            "naam": club.naam,
            "slug": club.slug,
            "status": club.status,
            "primary_color": club.primary_color,
            "secondary_color": club.secondary_color,
            "accent_color": club.accent_color,
            "logo_url": club.logo_url,
        },
    }


@router.post("/refresh")
async def refresh_token(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> dict:
    payload = decode_token(token)
    token_payload = TokenPayload(payload)
    if token_payload.type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    result = await db.execute(select(User).where(User.id == token_payload.user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active or not user.club_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    result = await db.execute(select(Club).where(Club.id == user.club_id))
    club = result.scalar_one_or_none()
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "club_id": str(user.club_id),
            "club_slug": club.slug if club else None,
            "is_superadmin": False,
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


class InviteRequest(BaseModel):
    email: EmailStr
    role: str


@router.post("/invite")
async def create_invite(
    invite_data: InviteRequest,
    current: tuple[User, Club | None] = Depends(get_current_tenant_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    if user.is_superadmin or club is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmins cannot invite users to clubs",
        )
    if invite_data.role not in ["vereniging_admin", "planner"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role",
        )
    result = await db.execute(
        select(User).where(
            User.email == invite_data.email,
            User.club_id == club.id,
        )
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists in this club",
        )
    import secrets

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(hours=48)
    invite = InviteToken(
        club_id=club.id,
        email=invite_data.email,
        role=invite_data.role,
        token=token,
        expires_at=expires_at,
    )
    db.add(invite)
    await db.commit()
    return {
        "token": token,
        "expires_at": expires_at.isoformat(),
        "invite_url": f"https://{club.slug}.competitie-planner.nl/invite/{token}",
    }


class AcceptInviteRequest(BaseModel):
    token: str
    password: str


@router.post("/accept-invite")
async def accept_invite(
    data: AcceptInviteRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(InviteToken).where(
            InviteToken.token == data.token,
            InviteToken.used.is_(False),
        )
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invite token",
        )
    if invite.expires_at < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite token has expired",
        )
    if len(data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    import re

    if not re.search(r"\d", data.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 1 digit",
        )
    result = await db.execute(select(Club).where(Club.id == invite.club_id))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Club not found",
        )
    if club.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vereniging is opgeschort",
        )
    user = User(
        club_id=club.id,
        email=invite.email,
        password_hash=get_password_hash(data.password),
        full_name=invite.email.split("@")[0],
        role=invite.role,
        is_active=True,
    )
    db.add(user)
    invite.used = True
    await db.commit()
    log_audit(
        "user.create",
        actor_id=str(user.id),
        actor_email=user.email,
        target_type="user",
        target_id=str(user.id),
        club_id=str(club.id),
        role=invite.role,
    )
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "club_id": str(user.club_id),
            "club_slug": club.slug,
            "is_superadmin": False,
        }
    )
    return {
        "message": "Account created successfully",
        "access_token": access_token,
        "token_type": "bearer",
    }


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    slug: str


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Club).where(Club.slug == data.slug))
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vereniging niet gevonden",
        )
    result = await db.execute(
        select(User).where(
            User.email == data.email,
            User.club_id == club.id,
        )
    )
    user = result.scalar_one_or_none()
    if user:
        # Rate limit: max 3 per hour per email
        result = await db.execute(
            select(func.count(PasswordResetToken.id)).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.created_at > datetime.now() - timedelta(hours=1),
            )
        )
        reset_count = result.scalar()
        if reset_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Te veel aanvragen voor wachtwoordherstel. Probeer het later opnieuw.",
            )
        import secrets

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=1)
        reset_token = PasswordResetToken(
            club_id=club.id,
            user_id=user.id,
            token=token,
            expires_at=expires_at,
        )
        db.add(reset_token)
        await db.commit()
        return {
            "message": "Password reset email sent",
            "reset_url": f"https://{club.slug}.competitie-planner.nl/reset-password/{token}",
        }
    return {"message": "If the email exists, a reset link has been sent"}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == data.token,
            PasswordResetToken.used.is_(False),
        )
    )
    reset_token = result.scalar_one_or_none()
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    if reset_token.expires_at < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired",
        )
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    import re

    if not re.search(r"\d", data.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 1 digit",
        )
    result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found",
        )
    user.password_hash = get_password_hash(data.new_password)
    reset_token.used = True
    await db.commit()
    log_audit(
        "user.password_reset",
        target_type="user",
        target_id=str(user.id),
        club_id=str(reset_token.club_id),
    )
    return {"message": "Password reset successfully"}


@router.post("/superadmin-login")
async def superadmin_login(
    request: Request,
    slug: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.replace("Bearer ", "")

    payload = decode_token(token)
    token_payload = TokenPayload(payload)

    if token_payload.type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    if not token_payload.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )

    result = await db.execute(select(User).where(User.id == token_payload.user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active or not user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    result = await db.execute(select(Club).where(Club.slug == slug))
    club = result.scalar_one_or_none()

    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vereniging niet gevonden",
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

    log_audit(
        "auth.superadmin_tenant_login",
        actor_id=str(user.id),
        actor_email=user.email,
        club_id=str(club.id),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": "superadmin",
            "is_superadmin": True,
        },
        "club": {
            "id": str(club.id),
            "naam": club.naam,
            "slug": club.slug,
            "status": club.status,
        },
    }


@router.get("/me", response_model=UserResponse)
async def get_me(
    current: tuple[User, Club | None] = Depends(get_current_tenant_user),
) -> User:
    return current[0]
