from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.exceptions import AuthenticationError, AuthorizationError, ConflictError
from app.limiter import limiter
from app.models import User
from app.schemas import (
    AdminExistsResponse,
    LogoutResponse,
    RefreshTokenResponse,
    RegisterAdminRequest,
    TokenResponse,
    UserResponse,
)
from app.services.audit import log_audit
from app.services.auth import (
    TokenPayload,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    description="Platform authentication endpoints for superadmin users. Handles login, token refresh, session management, and initial admin registration.",
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(token)
    token_payload = TokenPayload(payload)

    if token_payload.type != "access":
        raise AuthenticationError("Ongeldig token type")

    result = await db.execute(select(User).where(User.id == token_payload.user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise AuthenticationError("Gebruiker niet gevonden of inactief")

    # Add user_id to request state for logging
    request.state.user_id = str(user.id)

    return user


async def get_current_superadmin(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superadmin:
        raise AuthorizationError("Superadmin toegang vereist")
    return current_user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login as superadmin",
    description="Authenticate a superadmin user with email and password. Returns access and refresh tokens. Rate limited to 5 requests per minute. Account locks for 15 minutes after 10 failed attempts.",
    responses={
        401: {
            "description": "Onjuiste email of wachtwoord / Account geblokkeerd / Gebruiker inactief"
        },
        403: {"description": "Superadmin toegang vereist"},
        429: {"description": "Te veel inlogpogingen"},
    },
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if user:
        if user.locked_until and user.locked_until > datetime.now(UTC).replace(tzinfo=None):
            retry_after = int(
                (user.locked_until - datetime.now(UTC).replace(tzinfo=None)).total_seconds()
            )
            raise AuthenticationError(
                f"Account is tijdelijk geblokkeerd wegens te veel mislukte pogingen. Probeer het over {retry_after // 60 + 1} minuten opnieuw."
            )

    if not user or not verify_password(form_data.password, user.password_hash):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 3:
                log_audit(
                    "auth.login_failure",
                    actor_id=str(user.id),
                    actor_email=user.email,
                    result="failure",
                    attempts=user.failed_login_attempts,
                )
            if user.failed_login_attempts >= 10:
                user.locked_until = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=15)
                log_audit(
                    "auth.account_locked",
                    actor_id=str(user.id),
                    actor_email=user.email,
                    result="failure",
                    locked_minutes=15,
                )
            await db.commit()

        raise AuthenticationError("Onjuiste email of wachtwoord")

    if not user.is_active:
        raise AuthenticationError("Gebruikersaccount is inactief")

    if not user.is_superadmin:
        raise AuthorizationError("Superadmin toegang vereist")

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

    log_audit(
        "auth.login_success",
        actor_id=str(user.id),
        actor_email=user.email,
        is_superadmin=True,
    )

    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> RefreshTokenResponse:
    payload = decode_token(token)
    token_payload = TokenPayload(payload)

    if token_payload.type != "refresh":
        raise AuthenticationError("Ongeldig token type")

    result = await db.execute(select(User).where(User.id == token_payload.user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise AuthenticationError("Gebruiker niet gevonden of inactief")

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

    return RefreshTokenResponse(
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user


@router.post("/logout", response_model=LogoutResponse)
async def logout() -> LogoutResponse:
    return LogoutResponse(message="Logged out successfully")


@router.get("/admin-exists", response_model=AdminExistsResponse)
async def admin_exists(db: AsyncSession = Depends(get_db)) -> AdminExistsResponse:
    result = await db.execute(select(func.count(User.id)).where(User.is_superadmin))
    count = result.scalar()
    return AdminExistsResponse(exists=count > 0)


@router.post("/register-admin", response_model=TokenResponse)
@limiter.limit("3/hour")
async def register_admin(
    request: Request,
    admin_data: RegisterAdminRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    result = await db.execute(select(func.count(User.id)).where(User.is_superadmin))
    if result.scalar() > 0:
        raise ConflictError("Admin bestaat al")

    result = await db.execute(select(User).where(User.email == admin_data.email))
    if result.scalar_one_or_none():
        raise ConflictError("Email is al geregistreerd")

    password_hash = get_password_hash(admin_data.password)
    new_user = User(
        email=admin_data.email,
        password_hash=password_hash,
        full_name=admin_data.full_name,
        role="admin",
        is_superadmin=True,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    log_audit(
        "user.create",
        actor_id=str(new_user.id),
        actor_email=new_user.email,
        target_type="user",
        target_id=str(new_user.id),
        role="superadmin",
    )

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

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )
