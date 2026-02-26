import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.deliverable import DeliverableType, DeliverableStatus


class DeliverableOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    solution_id: uuid.UUID
    type: DeliverableType
    status: DeliverableStatus
    file_name: str | None
    file_size: int | None
    pages: int | None
    download_count: int
    created_at: datetime
    updated_at: datetime

    # computed fields
    label: str = ""
    icon: str = ""
    size_display: str = ""    # "2.3MB"

    def model_post_init(self, __context):
        from app.models.deliverable import DELIVERABLE_LABEL, DELIVERABLE_ICON
        self.label = DELIVERABLE_LABEL.get(self.type, self.type)
        self.icon = DELIVERABLE_ICON.get(self.type, "📄")
        if self.file_size:
            mb = self.file_size / 1024 / 1024
            self.size_display = f"{mb:.1f}MB"
