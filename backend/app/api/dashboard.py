from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.models.opportunity import Opportunity, OpportunityStage, STAGE_LABEL
from app.models.requirement import Requirement
from app.models.solution import Solution
from app.models.deliverable import Deliverable
from app.schemas.dashboard import DashboardStats, StageCount, RecentOpportunity, TeamMemberStat

router = APIRouter(prefix="/dashboard", tags=["仪表盘"])


@router.get("", response_model=DashboardStats, summary="总览仪表盘统计")
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=now.weekday())

    active_customers = db.query(func.count(Customer.id)).scalar() or 0
    active_opps = db.query(func.count(Opportunity.id)).filter(
        Opportunity.stage.in_(["initial", "req_confirm", "proposal", "customer_report"])
    ).scalar() or 0
    solutions_total = db.query(func.count(Solution.id)).scalar() or 0
    solutions_this_month = db.query(func.count(Solution.id)).filter(
        Solution.created_at >= month_start
    ).scalar() or 0
    deliverables_total = db.query(func.count(Deliverable.id)).scalar() or 0
    deliverables_this_week = db.query(func.count(Deliverable.id)).filter(
        Deliverable.created_at >= week_start
    ).scalar() or 0

    # Pipeline by stage
    pipeline_by_stage = []
    for stage in OpportunityStage:
        count = db.query(func.count(Opportunity.id)).filter(Opportunity.stage == stage).scalar() or 0
        pipeline_by_stage.append(StageCount(stage=stage.value, label=STAGE_LABEL[stage], count=count))

    # Total pipeline value
    total_value = db.query(func.sum(Opportunity.value)).filter(
        Opportunity.stage.in_(["initial", "req_confirm", "proposal", "customer_report"])
    ).scalar()

    # Recent opportunities
    recent_opps_db = (
        db.query(Opportunity)
        .order_by(Opportunity.updated_at.desc())
        .limit(5)
        .all()
    )
    recent_opportunities = []
    for opp in recent_opps_db:
        cust = db.query(Customer).filter(Customer.id == opp.customer_id).first()
        recent_opportunities.append(RecentOpportunity(
            id=str(opp.id),
            name=opp.name,
            customer_name=cust.name if cust else "",
            stage=opp.stage.value,
            stage_label=STAGE_LABEL[opp.stage],
            value=opp.value,
            updated_at=opp.updated_at,
        ))

    # Team stats
    users = db.query(User).filter(User.is_active == True).all()
    team_stats = []
    for u in users:
        sol_count = db.query(func.count(Solution.id)).filter(
            Solution.created_by == u.id, Solution.created_at >= month_start
        ).scalar() or 0
        opp_count = db.query(func.count(Opportunity.id)).filter(
            Opportunity.owner_ids.contains([str(u.id)]),
            Opportunity.stage.in_(["initial", "req_confirm", "proposal", "customer_report"]),
        ).scalar() or 0
        team_stats.append(TeamMemberStat(
            user_id=str(u.id), name=u.name, role=u.role.value,
            solutions_this_month=sol_count, active_opportunities=opp_count,
        ))

    return DashboardStats(
        active_customers=active_customers,
        active_opportunities=active_opps,
        solutions_total=solutions_total,
        solutions_this_month=solutions_this_month,
        deliverables_total=deliverables_total,
        deliverables_this_week=deliverables_this_week,
        pipeline_by_stage=pipeline_by_stage,
        total_pipeline_value=total_value,
        recent_opportunities=recent_opportunities,
        team_stats=team_stats,
    )


@router.get("/hierarchy", summary="四维层级树（客户→商机→需求→方案）")
def hierarchy_tree(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """返回完整四维树结构，供前端左侧层级树渲染"""
    customers = db.query(Customer).order_by(Customer.name).all()
    result = []
    for cust in customers:
        opps = db.query(Opportunity).filter(Opportunity.customer_id == cust.id).order_by(Opportunity.updated_at.desc()).all()
        opp_list = []
        for opp in opps:
            reqs = db.query(Requirement).filter(Requirement.opportunity_id == opp.id).order_by(Requirement.version.desc()).all()
            req_list = []
            for req in reqs:
                sols = db.query(Solution).filter(Solution.requirement_id == req.id).order_by(Solution.created_at.desc()).all()
                req_list.append({
                    "id": str(req.id),
                    "title": req.title,
                    "version": req.version,
                    "status": req.status.value,
                    "completeness": req.completeness,
                    "solutions": [
                        {
                            "id": str(s.id),
                            "version": s.version,
                            "status": s.status.value,
                            "is_current": s.is_current,
                            "change_note": s.change_note,
                            "created_at": s.created_at.isoformat(),
                        }
                        for s in sols
                    ],
                })
            opp_list.append({
                "id": str(opp.id),
                "name": opp.name,
                "stage": opp.stage.value,
                "stage_label": STAGE_LABEL[opp.stage],
                "value": str(opp.value) if opp.value else None,
                "requirements": req_list,
            })
        result.append({
            "id": str(cust.id),
            "name": cust.name,
            "industry": cust.industry.value,
            "tier": cust.tier,
            "opportunities": opp_list,
        })
    return result
