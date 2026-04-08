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
    ENVIRONMENT: str = "development"
    VERSION: str = "0.1.0"
    AUDIT_LOG_RETENTION_DAYS: int = 90
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 300

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def format_database_url(cls, v: str | None) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            if v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v or "postgresql+asyncpg://user:pass@localhost:5432/competitieplanner"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            if v.startswith("["):
                import json

                try:
                    return json.loads(v.replace("'", '"'))
                except json.JSONDecodeError:
                    return [i.strip() for i in v.strip("[]").replace("'", "").split(",")]
            return [i.strip() for i in v.split(",")]
        return v or []


settings = Settings()
