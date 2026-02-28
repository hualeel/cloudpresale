"""
系统设置 API
- GET  /settings              读取当前配置（LLM 状态 + 系统参数）
- PATCH /settings/system      保存非敏感系统参数（需管理员）
- PATCH /settings/llm         保存 LLM API Key 和默认模型（需管理员）
- POST  /settings/test-llm    测试 LLM 连接（支持 Anthropic / DeepSeek）
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
    SystemConfigUpdate, LLMConfigUpdate,
    LLMTestRequest, LLMTestResult,
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


def get_effective_api_key(db: Session) -> str:
    """Anthropic API Key：优先读 DB，回退到环境变量。"""
    db_key = _get(db, "anthropic_api_key")
    if db_key:
        return db_key
    return settings.ANTHROPIC_API_KEY or ""


def get_effective_deepseek_key(db: Session) -> str:
    """DeepSeek API Key：仅从 DB 读取（无默认环境变量）。"""
    return _get(db, "deepseek_api_key") or ""


def _build_llm_status(db: Session) -> LLMStatus:
    anthropic_key = get_effective_api_key(db)
    deepseek_key = get_effective_deepseek_key(db)
    current_model = _get(db, "default_llm")
    is_deepseek = current_model.startswith("deepseek")

    anthropic_configured = bool(anthropic_key)
    deepseek_configured = bool(deepseek_key)

    if is_deepseek:
        status = "connected" if deepseek_configured else "not_configured"
    else:
        status = "connected" if anthropic_configured else "not_configured"

    return LLMStatus(
        anthropic_configured=anthropic_configured,
        deepseek_configured=deepseek_configured,
        current_model=current_model,
        status=status,
    )


@router.get("", response_model=SettingsOut, summary="读取系统配置")
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return SettingsOut(llm=_build_llm_status(db), system=_read_system(db))


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


@router.patch("/llm", response_model=LLMStatus, summary="保存 LLM 配置（管理员）")
def update_llm(
    body: LLMConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if body.anthropic_api_key is not None:
        _set(db, "anthropic_api_key", body.anthropic_api_key, current_user.id)
    if body.deepseek_api_key is not None:
        _set(db, "deepseek_api_key", body.deepseek_api_key, current_user.id)
    if body.default_model is not None:
        _set(db, "default_llm", body.default_model, current_user.id)
    db.commit()
    return _build_llm_status(db)


@router.post("/test-llm", response_model=LLMTestResult, summary="测试 LLM 连接")
def test_llm(
    body: LLMTestRequest = LLMTestRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.provider == "deepseek":
        return _test_deepseek(body.api_key or get_effective_deepseek_key(db), db)
    else:
        return _test_anthropic(body.api_key or get_effective_api_key(db), db)


def _test_anthropic(api_key: str, db: Session) -> LLMTestResult:
    if not api_key:
        return LLMTestResult(ok=False, model="", error="Anthropic API Key 未配置")
    model = _get(db, "default_llm")
    # If current model is deepseek, test with a default claude model
    if model.startswith("deepseek"):
        model = "claude-sonnet-4-6"
    t0 = time.time()
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        client.messages.create(
            model=model,
            max_tokens=5,
            messages=[{"role": "user", "content": "ping"}],
        )
        return LLMTestResult(ok=True, model=model, latency_ms=int((time.time() - t0) * 1000))
    except Exception as exc:
        return LLMTestResult(ok=False, model=model, error=str(exc)[:200])


def _test_deepseek(api_key: str, db: Session) -> LLMTestResult:
    if not api_key:
        return LLMTestResult(ok=False, model="", error="DeepSeek API Key 未配置")
    model = _get(db, "default_llm")
    if not model.startswith("deepseek"):
        model = "deepseek-chat"
    t0 = time.time()
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
        client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
        )
        return LLMTestResult(ok=True, model=model, latency_ms=int((time.time() - t0) * 1000))
    except Exception as exc:
        return LLMTestResult(ok=False, model=model, error=str(exc)[:200])
