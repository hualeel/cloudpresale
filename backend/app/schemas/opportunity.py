import uuid
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.opportunity import OpportunityStage


class OpportunityCreate(BaseModel):
    customer_id: uuid.UUID
    name: str = Field(..., min_length=2, max_length=300)
    stage: OpportunityStage = OpportunityStage.initial
    value: Decimal | None = None
    expected_close: date | None = None
    key_requirements: str | None = None
    owner_ids: list[uuid.UUID] = []


class OpportunityUpdate(BaseModel):
    name: str | None = None
    stage: OpportunityStage | None = None
    value: Decimal | None = None
    expected_close: date | None = None
    key_requirements: str | None = None
    owner_ids: list[uuid.UUID] | None = None


class OpportunityOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    customer_id: uuid.UUID
    customer_name: str = ""        # computed from relationship
    name: str
    stage: OpportunityStage
    value: Decimal | None
    expected_close: date | None
    key_requirements: str | None
    owner_ids: list
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    requirement_count: int = 0     # 需求数量
    solution_count: int = 0        # 方案总版本数


class OpportunityList(BaseModel):
    items: list[OpportunityOut]
    total: int
    page: int
    page_size: int
