import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.requirement import RequirementStatus


class RequirementContent(BaseModel):
    """结构化需求字段"""
    industry: str | None = None
    current_containerization: str | None = None   # "20%"
    target_containerization: str | None = None    # "80%+"
    cluster_count: int | None = None
    cluster_detail: str | None = None             # "生产×2, 测试×1, 开发×1"
    budget_range: str | None = None               # "1000-1500万"
    compliance: list[str] = []                    # ["等保三级", "信创", "金融监管"]
    modules: list[str] = []                       # ["容器平台", "DevOps", ...]
    key_contacts: list[dict] = []
    pain_points: str | None = None
    tech_stack_current: str | None = None
    decision_timeline: str | None = None


class RequirementCreate(BaseModel):
    opportunity_id: uuid.UUID
    title: str = Field(..., min_length=2, max_length=300)
    content: RequirementContent = RequirementContent()
    raw_input: str | None = None   # 原始文本（AI 将解析补充 content）


class RequirementUpdate(BaseModel):
    title: str | None = None
    content: RequirementContent | None = None
    raw_input: str | None = None
    status: RequirementStatus | None = None


class RequirementOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    opportunity_id: uuid.UUID
    opportunity_name: str | None = None
    customer_name: str | None = None
    version: int
    title: str
    status: RequirementStatus
    completeness: float
    content: dict
    raw_input: str | None
    confirmed_at: datetime | None
    confirmed_by: uuid.UUID | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    solution_count: int = 0


class RequirementList(BaseModel):
    items: list[RequirementOut]
    total: int
