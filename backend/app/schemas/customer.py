import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.customer import Industry


class ContactInfo(BaseModel):
    name: str
    title: str | None = None
    phone: str | None = None
    email: str | None = None


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    industry: Industry
    tier: str | None = None
    description: str | None = None
    contacts: list[ContactInfo] = []


class CustomerUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    industry: Industry | None = None
    tier: str | None = None
    description: str | None = None
    contacts: list[ContactInfo] | None = None
    owner_id: uuid.UUID | None = None


class CustomerOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    industry: Industry
    tier: str | None
    description: str | None
    contacts: list | None
    owner_id: uuid.UUID
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    opportunity_count: int = 0    # 商机数量（computed）


class CustomerList(BaseModel):
    items: list[CustomerOut]
    total: int
    page: int
    page_size: int
