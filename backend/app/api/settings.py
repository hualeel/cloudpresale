"""
系统设置 API
- GET  /settings         读取当前配置（LLM 状态 + 系统参数）
- PATCH /settings/system 保存非敏感系统参数（需管理员）
- POST  /settings/test-llm 测试 Anthropic 连接
"""
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models.user import User
from app.models.system_setting import SystemSetting
from app.schemas.settings import (
    SettingsOut, LLMStatus, SystemConfig,
    SystemConfigUpdate, LLMTestResult,
)

router = APIRouter(prefix="/settings", tags=["系统设置"])

# 默认值（DB 中不存在时使用）
_DEFAULTS: dict[str, str] = {
    "default_llm":                settings.DEFAULT_LLM,
    "sensitive_data_routing":     "true",
    "rag_top_k":                  "5",
    "agent_timeout_minutes":      "5",
    "audit_log_enabled":          "true",
    "auto_knowledge_base":        "true",
    "max_concurrent_generations": "5",
}


def _get(db: Session, key: str) -> str:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return row.value if row else _DEFAULTS.get(key, "")


def _set(db: Session, key: str, value: str, user_id: uuid.UUID):
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row:
        row.value = value
        row.updated_at = datetime.now(timezone.utc)
        row.updated_by = user_id
    else:
        db.add(SystemSetting(key=key, value=value, updated_by=user_id))


def _bool(v: str) -> bool:
    return v.lower() not in ("false", "0", "")


def _read_system(db: Session) -> SystemConfig:
    return SystemConfig(
        default_llm=_get(db, "default_llm"),
        sensitive_data_routing=_bool(_get(db, "sensitive_data_routing")),
        rag_top_k=int(_get(db, "rag_top_k") or "5"),
        agent_timeout_minutes=int(_get(db, "agent_timeout_minutes") or "5"),
        audit_log_enabled=_bool(_get(db, "audit_log_enabled")),
        auto_knowledge_base=_bool(_get(db, "auto_knowledge_base")),
        max_concurrent_generations=int(_get(db, "max_concurrent_generations") or "5"),
    )


@router.get("", response_model=SettingsOut, summary="读取系统配置")
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    configured = bool(settings.ANTHROPIC_API_KEY)
    current_model = _get(db, "default_llm")
    llm = LLMStatus(
        anthropic_configured=configured,
        current_model=current_model,
        status="connected" if configured else "not_configured",
    )
    return SettingsOut(llm=llm, system=_read_system(db))


@router.patch("/system", response_model=SystemConfig, summary="保存系统参数（管理员）")
def update_system(
    body: SystemConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    updates = body.model_dump(exclude_none=True)
    for k, v in updates.items():
        str_v = str(v).lower() if isinstance(v, bool) else str(v)
        _set(db, k, str_v, current_user.id)
    db.commit()
    return _read_system(db)


@router.post("/test-llm", response_model=LLMTestResult, summary="测试 Anthropic 连接")
def test_llm(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.ANTHROPIC_API_KEY:
        return LLMTestResult(ok=False, model=settings.DEFAULT_LLM, error="ANTHROPIC_API_KEY 未配置")

    current_model = _get(db, "default_llm")
    t0 = time.time()
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        client.messages.create(
            model=current_model,
            max_tokens=5,
            messages=[{"role": "user", "content": "ping"}],
        )
        return LLMTestResult(
            ok=True,
            model=current_model,
            latency_ms=int((time.time() - t0) * 1000),
        )
    except Exception as exc:
        return LLMTestResult(ok=False, model=current_model, error=str(exc)[:200])
