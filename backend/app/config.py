from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+psycopg://presale:presale123@localhost:5432/presale_db"

    # Auth
    SECRET_KEY: str = "dev-secret-key-change-in-production-must-be-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24h

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin123"
    MINIO_BUCKET: str = "presale-deliverables"
    MINIO_SECURE: bool = False

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    # LLM
    ANTHROPIC_API_KEY: str = ""
    DEFAULT_LLM: str = "claude-sonnet-4-6"


settings = Settings()
