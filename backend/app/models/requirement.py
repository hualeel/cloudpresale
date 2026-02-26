import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, Text, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.database import Base


class RequirementStatus(str, enum.Enum):
    draft = "draft"           # 草稿
    confirmed = "confirmed"   # 已确认
    archived = "archived"     # 已归档


class Requirement(Base):
    """
    需求 —— 第三维。每个商机下可有多个版本需求。
    content 字段存储结构化需求（JSON），raw_input 存原始文本。
    """
    __tablename__ = "requirements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 版本号（整数递增）
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[RequirementStatus] = mapped_column(SAEnum(RequirementStatus), default=RequirementStatus.draft, nullable=False)
    completeness: Mapped[float] = mapped_column(Float, default=0.0)           # 0.0 ~ 1.0

    # 结构化需求字段（JSON）
    content: Mapped[dict] = mapped_column(JSONB, default=dict)
    # 例：{
    #   "industry": "bank_state",
    #   "current_containerization": "20%",
    #   "target_containerization": "80%+",
    #   "cluster_count": 4,
    #   "budget_range": "1000-1500万",
    #   "compliance": ["等保三级", "信创", "金融监管"],
    #   "modules": ["容器平台", "DevOps", "微服务治理"],
    #   "key_contacts": [{"name": "王总监", "title": "科技部总监"}],
    #   "pain_points": "发布周期长（2-4周）、资源利用率低",
    # }

    raw_input: Mapped[str | None] = mapped_column(Text)   # 原始输入（会议纪要、RFP摘要等）

    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confirmed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    opportunity: Mapped["Opportunity"] = relationship("Opportunity", back_populates="requirements")
    solutions: Mapped[list["Solution"]] = relationship("Solution", back_populates="requirement", cascade="all, delete-orphan")
