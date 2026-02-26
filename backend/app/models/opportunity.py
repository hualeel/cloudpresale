import uuid
from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, Text, Date, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import enum

from app.database import Base


class OpportunityStage(str, enum.Enum):
    initial = "initial"                 # 初步接触
    req_confirm = "req_confirm"         # 需求确认
    proposal = "proposal"               # 方案制作
    customer_report = "customer_report" # 客户汇报
    won = "won"                         # 已赢单
    lost = "lost"                       # 已输单


STAGE_LABEL = {
    OpportunityStage.initial: "初步接触",
    OpportunityStage.req_confirm: "需求确认",
    OpportunityStage.proposal: "方案制作",
    OpportunityStage.customer_report: "客户汇报",
    OpportunityStage.won: "已赢单",
    OpportunityStage.lost: "已输单",
}


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    stage: Mapped[OpportunityStage] = mapped_column(SAEnum(OpportunityStage), default=OpportunityStage.initial, nullable=False)
    value: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))           # 合同额（元）
    expected_close: Mapped[date | None] = mapped_column(Date)
    key_requirements: Mapped[str | None] = mapped_column(Text)              # 简要诉求描述

    # 多个跟进人：存 user_id list
    owner_ids: Mapped[list] = mapped_column(JSONB, default=list)

    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="opportunities")
    requirements: Mapped[list["Requirement"]] = relationship("Requirement", back_populates="opportunity", cascade="all, delete-orphan")
