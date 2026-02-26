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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时可做初始化（如创建 MinIO bucket 等）
    yield
    # 关闭时清理资源


app = FastAPI(
    title="CloudPresale AI — 后端 API",
    version="1.0.0",
    description="云原生售前智能方案生成平台后端接口",
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


@app.get("/health", tags=["系统"])
def health():
    return {"status": "ok", "version": "1.0.0"}
