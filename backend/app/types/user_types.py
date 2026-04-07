from datetime import datetime
from enum import Enum
from typing import TypedDict
from uuid import UUID

from pydantic import EmailStr


class UserRole(TypedDict):
    id: int
    name: str
    permissions: list[str]


class UserProfile(TypedDict):
    user_id: UUID
    username: str
    email: EmailStr
    avatar_url: str | None
    bio: str | None
    created_at: datetime
    updated_at: datetime


class UserStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


# Additional user-related types
class AuthTokenData(TypedDict):
    sub: str
    email: str
    role: str
    club_id: str | None
    club_slug: str | None
    is_superadmin: bool
