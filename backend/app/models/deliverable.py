import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, Integer, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database import Base


class DeliverableType(str, enum.Enum):
    word_tech = "word_tech"         # Word 技术方案
    ppt_overview = "ppt_overview"   # PPT 总体方案（面向IT管理层）
    ppt_container = "ppt_container" # PPT 容器平台专项
    ppt_devops = "ppt_devops"       # PPT DevOps专项
    ppt_exec = "ppt_exec"           # PPT 高层汇报（面向CIO）
    ppt_security = "ppt_security"   # PPT 安全合规专项


DELIVERABLE_LABEL = {
    DeliverableType.word_tech: "Word技术方案",
    DeliverableType.ppt_overview: "总体方案PPT",
    DeliverableType.ppt_container: "容器平台专项PPT",
    DeliverableType.ppt_devops: "DevOps专项PPT",
    DeliverableType.ppt_exec: "高层汇报PPT",
    DeliverableType.ppt_security: "安全合规专项PPT",
}

DELIVERABLE_ICON = {
    DeliverableType.word_tech: "📘",
    DeliverableType.ppt_overview: "📊",
    DeliverableType.ppt_container: "📑",
    DeliverableType.ppt_devops: "📑",
    DeliverableType.ppt_exec: "🎯",
    DeliverableType.ppt_security: "🔐",
}


class DeliverableStatus(str, enum.Enum):
    generating = "generating"
    ready = "ready"
    failed = "failed"


class Deliverable(Base):
    __tablename__ = "deliverables"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    solution_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("solutions.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[DeliverableType] = mapped_column(SAEnum(DeliverableType), nullable=False)
    status: Mapped[DeliverableStatus] = mapped_column(SAEnum(DeliverableStatus), default=DeliverableStatus.generating, nullable=False)

    # File info
    file_name: Mapped[str | None] = mapped_column(String(300))        # 原始文件名
    file_path: Mapped[str | None] = mapped_column(String(500))        # MinIO object path
    file_size: Mapped[int | None] = mapped_column(BigInteger)         # bytes
    pages: Mapped[int | None] = mapped_column(Integer)                # 页数
    download_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    solution: Mapped["Solution"] = relationship("Solution", back_populates="deliverables")
