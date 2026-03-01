from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.auth import router as auth_router
from app.api.customers import router as customers_router
from app.api.opportunities import router as opps_router
from app.api.requirements import router as reqs_router
from app.api.solutions import router as sols_router
from app.api.deliverables import router as dlvs_router
from app.api.team import router as team_router
from app.api.dashboard import router as dashboard_router
from app.api.settings import router as settings_router


def _ensure_minio_bucket() -> None:
    """启动时确保 MinIO bucket 存在，不存在则创建。"""
    import logging
    logger = logging.getLogger(__name__)
    try:
        from minio import Minio
        client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        bucket = settings.MINIO_BUCKET
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info(f"MinIO bucket created: {bucket}")
        else:
            logger.info(f"MinIO bucket ok: {bucket}")
    except Exception as exc:
        logger.warning(f"MinIO bucket init skipped: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_minio_bucket()
    yield


app = FastAPI(
    title="SolveIQ — Backend API",
    version="1.0.0",
    description="SolveIQ 方案智能协同平台 — Backend API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 路由注册 ──
API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(customers_router, prefix=API_PREFIX)
app.include_router(opps_router, prefix=API_PREFIX)
app.include_router(reqs_router, prefix=API_PREFIX)
app.include_router(sols_router, prefix=API_PREFIX)
app.include_router(dlvs_router, prefix=API_PREFIX)
app.include_router(team_router, prefix=API_PREFIX)
app.include_router(dashboard_router, prefix=API_PREFIX)
app.include_router(settings_router, prefix=API_PREFIX)


@app.get("/health", tags=["系统"])
def health():
    return {"status": "ok", "version": "1.0.0"}
