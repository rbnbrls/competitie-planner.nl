from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/competitieplanner"
    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    SUPER_ADMIN_EMAIL: str  # Required env var - no default
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    ENCRYPTION_KEY: str

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def format_database_url(cls, v: str | None) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            if v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v or "postgresql+asyncpg://user:pass@localhost:5432/competitieplanner"


settings = Settings()
