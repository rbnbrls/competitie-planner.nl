from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import bcrypt
from fastapi import HTTPException, status
from jose import ExpiredSignatureError, JWTError, jwt

from app.config import settings
from app.models import Club


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            # Ensure it is bytes
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        return False
    except ValueError:
        return False


def get_password_hash(password: str) -> str:
    sa = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), sa).decode("utf-8")


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC).replace(tzinfo=None) + expires_delta
    else:
        expire = datetime.now(UTC).replace(tzinfo=None) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire, "iat": datetime.now(UTC).replace(tzinfo=None)})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: UUID) -> str:
    to_encode = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": datetime.now(UTC).replace(tzinfo=None)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "iat": datetime.now(UTC).replace(tzinfo=None),
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


class TokenPayload:
    def __init__(self, payload: dict[str, Any]):
        self.sub = payload.get("sub")
        self.email = payload.get("email")
        self.role = payload.get("role")
        self.club_id = payload.get("club_id")
        self.club_slug = payload.get("club_slug")
        self.is_superadmin = payload.get("is_superadmin", False)
        self.type = payload.get("type", "access")

    @property
    def user_id(self) -> UUID | None:
        return UUID(self.sub) if self.sub else None


def has_full_access(club: Club) -> bool:
    return club.payment_enabled or club.is_sponsored
