from pydantic import BaseModel


class LLMStatus(BaseModel):
    anthropic_configured: bool
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


class LLMTestResult(BaseModel):
    ok: bool
    model: str
    latency_ms: int | None = None
    error: str | None = None
