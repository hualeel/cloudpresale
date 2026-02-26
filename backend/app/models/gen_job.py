import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.database import Base


class AgentType(str, enum.Enum):
    arch = "arch"             # 架构设计
    sizing = "sizing"         # 规模测算
    security = "security"     # 安全合规
    migration = "migration"   # 迁移路径
    plan = "plan"             # 实施计划
    pricing = "pricing"       # 报价估算


AGENT_LABEL = {
    AgentType.arch: "架构设计 Agent",
    AgentType.sizing: "规模测算 Agent",
    AgentType.security: "安全合规 Agent",
    AgentType.migration: "迁移路径 Agent",
    AgentType.plan: "实施计划 Agent",
    AgentType.pricing: "报价估算 Agent",
}


class JobStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"


class GenJob(Base):
    """AI 生成任务记录（每个 Agent 一条记录）"""
    __tablename__ = "gen_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solution_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("solutions.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_type: Mapped[AgentType] = mapped_column(SAEnum(AgentType), nullable=False)
    status: Mapped[JobStatus] = mapped_column(SAEnum(JobStatus), default=JobStatus.pending, nullable=False)
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0.0 ~ 1.0

    result: Mapped[dict | None] = mapped_column(JSONB)    # Agent 输出内容
    error: Mapped[str | None] = mapped_column(Text)       # 失败原因

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    solution: Mapped["Solution"] = relationship("Solution", back_populates="gen_jobs")
