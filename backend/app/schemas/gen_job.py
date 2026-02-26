import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.gen_job import AgentType, JobStatus, AGENT_LABEL


class GenJobOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    solution_id: uuid.UUID
    agent_type: AgentType
    status: JobStatus
    progress: float
    result: dict | None
    error: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime

    label: str = ""

    def model_post_init(self, __context):
        self.label = AGENT_LABEL.get(self.agent_type, self.agent_type)
