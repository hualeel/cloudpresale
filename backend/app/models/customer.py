import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum

from app.database import Base


class Industry(str, enum.Enum):
    bank_state = "bank_state"          # 国有大行
    bank_commercial = "bank_commercial"  # 股份制银行
    bank_city = "bank_city"            # 城商行/农商行
    insurance = "insurance"            # 保险
    securities = "securities"          # 券商
    fund = "fund"                      # 基金
    internet = "internet"              # 互联网金融
    other = "other"                    # 其他


INDUSTRY_LABEL = {
    Industry.bank_state: "银行（国有大行）",
    Industry.bank_commercial: "银行（股份制）",
    Industry.bank_city: "银行（城商/农商）",
    Industry.insurance: "保险",
    Industry.securities: "券商",
    Industry.fund: "基金",
    Industry.internet: "互联网金融",
    Industry.other: "其他",
}


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    industry: Mapped[Industry] = mapped_column(SAEnum(Industry), nullable=False)
    tier: Mapped[str | None] = mapped_column(String(50))        # 规模/级别标签，如 "国有大行"
    description: Mapped[str | None] = mapped_column(Text)
    contacts: Mapped[list | None] = mapped_column(JSONB, default=list)
    # [{"name": "王总监", "title": "科技部总监", "phone": "...", "email": "..."}]

    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_customers", foreign_keys=[owner_id])
    opportunities: Mapped[list["Opportunity"]] = relationship("Opportunity", back_populates="customer", cascade="all, delete-orphan")
