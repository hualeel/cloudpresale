import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.database import Base


class SolutionStatus(str, enum.Enum):
    generating = "generating"   # AI生成中
    draft = "draft"             # 草稿
    reviewing = "reviewing"     # 审核中
    approved = "approved"       # 已审批（可对外）
    archived = "archived"       # 已归档（历史版本）


class Solution(Base):
    """
    方案 —— 第四维（版本化）。
    version 采用字符串语义版本，如 "1.0", "1.1", "2.0"。
    同一 requirement_id 下允许多个版本，最新的为 current。
    """
    __tablename__ = "solutions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requirement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(20), nullable=False)          # "1.0", "1.1", "2.0"
    change_note: Mapped[str | None] = mapped_column(Text)                     # 版本变更说明
    status: Mapped[SolutionStatus] = mapped_column(SAEnum(SolutionStatus), default=SolutionStatus.generating, nullable=False)
    is_current: Mapped[bool] = mapped_column(default=True, nullable=False)    # 标记当前生效版本

    # 方案内容（各 Agent 输出汇总）
    content: Mapped[dict] = mapped_column(JSONB, default=dict)
    # 例：{
    #   "arch": { "summary": "...", "components": [...], "clusters": [...] },
    #   "sizing": { "total_nodes": 330, "detail": [...] },
    #   "security": { "compliance_level": "等保三级", "measures": [...] },
    #   "migration": { "phases": [...], "timeline": "6个月" },
    #   "plan": { "milestones": [...] },
    #   "pricing": { "total": 12000000, "breakdown": [...] }
    # }

    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    requirement: Mapped["Requirement"] = relationship("Requirement", back_populates="solutions")
    deliverables: Mapped[list["Deliverable"]] = relationship("Deliverable", back_populates="solution", cascade="all, delete-orphan")
    gen_jobs: Mapped[list["GenJob"]] = relationship("GenJob", back_populates="solution", cascade="all, delete-orphan")
