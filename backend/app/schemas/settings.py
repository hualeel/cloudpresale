from pydantic import BaseModel


class LLMStatus(BaseModel):
    anthropic_configured: bool
    deepseek_configured: bool = False
    kimi_configured: bool = False
    current_model: str
    status: str          # "connected" | "not_configured" | "error"
    error: str | None = None


class SystemConfig(BaseModel):
    default_llm: str
    sensitive_data_routing: bool
    rag_top_k: int
    agent_timeout_minutes: int
    audit_log_enabled: bool
    auto_knowledge_base: bool
    max_concurrent_generations: int


class SettingsOut(BaseModel):
    llm: LLMStatus
    system: SystemConfig


class SystemConfigUpdate(BaseModel):
    default_llm: str | None = None
    sensitive_data_routing: bool | None = None
    rag_top_k: int | None = None
    agent_timeout_minutes: int | None = None
    audit_log_enabled: bool | None = None
    auto_knowledge_base: bool | None = None
    max_concurrent_generations: int | None = None


class LLMConfigUpdate(BaseModel):
    anthropic_api_key: str | None = None
    deepseek_api_key: str | None = None
    kimi_api_key: str | None = None
    default_model: str | None = None


class LLMTestRequest(BaseModel):
    api_key: str | None = None
    provider: str = "anthropic"   # "anthropic" | "deepseek" | "kimi"


class LLMTestResult(BaseModel):
    ok: bool
    model: str
    latency_ms: int | None = None
    error: str | None = None
