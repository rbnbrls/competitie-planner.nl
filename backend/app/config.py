from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/competitieplanner"
    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    SUPER_ADMIN_EMAIL: str = "ruben@rabar.nl"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    ENCRYPTION_KEY: str


settings = Settings()
