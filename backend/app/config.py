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
    LLM_BASE_URL: str = ""  # 留空 = 直连 Anthropic；填 OpenRouter 等兼容地址即可切换

    # 敏感配置加密（Fernet key，base64-urlsafe 32字节）
    # 生成命令: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # 生产环境必须设置，未设置则明文存储（仅限开发）
    SETTINGS_ENCRYPT_KEY: str = ""

    # ChromaDB（RAG 知识库）
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000


settings = Settings()
