from typing import TypedDict, Literal, Optional, List
from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import EmailStr


class UserRole(TypedDict):
    id: int
    name: str
    permissions: List[str]


class UserProfile(TypedDict):
    user_id: UUID
    username: str
    email: EmailStr
    avatar_url: Optional[str]
    bio: Optional[str]
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
    club_id: Optional[str]
    club_slug: Optional[str]
    is_superadmin: bool
