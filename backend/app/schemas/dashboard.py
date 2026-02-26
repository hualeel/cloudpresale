from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class StageCount(BaseModel):
    stage: str
    label: str
    count: int


class RecentOpportunity(BaseModel):
    id: str
    name: str
    customer_name: str
    stage: str
    stage_label: str
    value: Decimal | None
    updated_at: datetime


class TeamMemberStat(BaseModel):
    user_id: str
    name: str
    role: str
    solutions_this_month: int
    active_opportunities: int


class DashboardStats(BaseModel):
    active_customers: int
    active_opportunities: int
    solutions_total: int
    solutions_this_month: int
    deliverables_total: int
    deliverables_this_week: int
    pipeline_by_stage: list[StageCount]
    recent_opportunities: list[RecentOpportunity]
    team_stats: list[TeamMemberStat]
    total_pipeline_value: Decimal | None
