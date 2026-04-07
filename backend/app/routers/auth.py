from datetime import UTC, datetime, timedelta

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.limiter import limiter
from app.models import User
from app.schemas import UserResponse
from app.services.auth import (
    TokenPayload,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
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

    return user


async def get_current_superadmin(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )
    return current_user


@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if user:
        if user.locked_until and user.locked_until > datetime.now(UTC).replace(tzinfo=None):
            retry_after = int(
                (user.locked_until - datetime.now(UTC).replace(tzinfo=None)).total_seconds()
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Account is tijdelijk geblokkeerd wegens te veel mislukte pogingen. Probeer het over {retry_after // 60 + 1} minuten opnieuw.",
            )

    if not user or not verify_password(form_data.password, user.password_hash):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 10:
                user.locked_until = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=15)
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

    if not user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )

    # Reset failed attempts on success
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(UTC).replace(tzinfo=None)

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "club_id": str(user.club_id) if user.club_id else None,
            "club_slug": None,
            "is_superadmin": True,
        }
    )
    refresh_token = create_refresh_token(user.id)

    logger = structlog.get_logger()
    logger.info(
        "user_login_success",
        user_id=str(user.id),
        email=user.email,
        is_superadmin=user.is_superadmin,
    )

    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
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

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "club_id": str(user.club_id) if user.club_id else None,
            "club_slug": None,
            "is_superadmin": user.is_superadmin,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user


@router.post("/logout")
async def logout() -> dict:
    return {"message": "Logged out successfully"}


@router.get("/admin-exists")
async def admin_exists(db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(select(func.count(User.id)).where(User.is_superadmin))
    count = result.scalar()
    return {"exists": count > 0}


@router.post("/register-admin")
@limiter.limit("3/hour")
async def register_admin(
    request: Request,
    email: str,
    password: str,
    full_name: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(func.count(User.id)).where(User.is_superadmin))
    if result.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin already exists",
        )

    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    password_hash = get_password_hash(password)
    new_user = User(
        email=email,
        password_hash=password_hash,
        full_name=full_name,
        role="admin",
        is_superadmin=True,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    access_token = create_access_token(
        data={
            "sub": str(new_user.id),
            "email": new_user.email,
            "role": new_user.role,
            "club_id": None,
            "club_slug": None,
            "is_superadmin": True,
        }
    )
    refresh_token = create_refresh_token(new_user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }
