import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.solution import SolutionStatus
from app.schemas.deliverable import DeliverableOut
from app.schemas.gen_job import GenJobOut


class SolutionCreate(BaseModel):
    requirement_id: uuid.UUID
    change_note: str | None = None
    deliverable_types: list[str] = []   # DeliverableType values to generate


class SolutionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    requirement_id: uuid.UUID
    version: str
    change_note: str | None
    status: SolutionStatus
    is_current: bool
    content: dict
    created_by: uuid.UUID
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    deliverables: list[DeliverableOut] = []
    gen_jobs: list[GenJobOut] = []


class SolutionList(BaseModel):
    items: list[SolutionOut]
    total: int
