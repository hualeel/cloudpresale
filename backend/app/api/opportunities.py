import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.models.opportunity import Opportunity, OpportunityStage, STAGE_LABEL
from app.models.requirement import Requirement
from app.models.solution import Solution
from app.models.audit_log import AuditLog
from app.schemas.opportunity import OpportunityCreate, OpportunityUpdate, OpportunityOut, OpportunityList

router = APIRouter(prefix="/opportunities", tags=["商机管理"])


def _to_out(opp: Opportunity, db: Session) -> OpportunityOut:
    customer = db.query(Customer).filter(Customer.id == opp.customer_id).first()
    req_count = db.query(func.count(Requirement.id)).filter(Requirement.opportunity_id == opp.id).scalar()
    sol_count = (
        db.query(func.count(Solution.id))
        .join(Requirement, Solution.requirement_id == Requirement.id)
        .filter(Requirement.opportunity_id == opp.id)
        .scalar()
    )
    out = OpportunityOut.model_validate(opp)
    out.customer_name = customer.name if customer else ""
    out.requirement_count = req_count or 0
    out.solution_count = sol_count or 0
    return out


@router.get("", response_model=OpportunityList, summary="商机列表")
def list_opportunities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    customer_id: uuid.UUID | None = None,
    stage: OpportunityStage | None = None,
    owner_id: uuid.UUID | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Opportunity)
    if customer_id:
        query = query.filter(Opportunity.customer_id == customer_id)
    if stage:
        query = query.filter(Opportunity.stage == stage)
    if q:
        query = query.filter(Opportunity.name.ilike(f"%{q}%"))
    if owner_id:
        query = query.filter(Opportunity.owner_ids.contains([str(owner_id)]))
    total = query.count()
    items = query.order_by(Opportunity.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return OpportunityList(
        items=[_to_out(o, db) for o in items],
        total=total, page=page, page_size=page_size,
    )


@router.get("/kanban", summary="商机看板（按阶段分组）")
def kanban(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """返回各阶段商机列表，供前端看板视图使用"""
    result = {}
    for stage in OpportunityStage:
        items = db.query(Opportunity).filter(Opportunity.stage == stage).order_by(Opportunity.updated_at.desc()).limit(10).all()
        result[stage.value] = {
            "label": STAGE_LABEL[stage],
            "count": db.query(func.count(Opportunity.id)).filter(Opportunity.stage == stage).scalar(),
            "items": [_to_out(o, db) for o in items],
        }
    return result


@router.post("", response_model=OpportunityOut, status_code=201, summary="新建商机")
def create_opportunity(
    body: OpportunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Customer).filter(Customer.id == body.customer_id).first():
        raise HTTPException(404, "客户不存在")
    owner_ids = [str(uid) for uid in body.owner_ids] if body.owner_ids else [str(current_user.id)]
    opp = Opportunity(
        customer_id=body.customer_id,
        name=body.name,
        stage=body.stage,
        value=body.value,
        expected_close=body.expected_close,
        key_requirements=body.key_requirements,
        owner_ids=owner_ids,
        created_by=current_user.id,
    )
    db.add(opp)
    db.flush()
    db.add(AuditLog(user_id=current_user.id, entity_type="opportunity", entity_id=opp.id, action="create"))
    db.commit()
    db.refresh(opp)
    return _to_out(opp, db)


@router.get("/{opp_id}", response_model=OpportunityOut, summary="商机详情")
def get_opportunity(
    opp_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(404, "商机不存在")
    return _to_out(opp, db)


@router.patch("/{opp_id}", response_model=OpportunityOut, summary="更新商机")
def update_opportunity(
    opp_id: uuid.UUID,
    body: OpportunityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(404, "商机不存在")
    data = body.model_dump(exclude_none=True)
    if "owner_ids" in data:
        data["owner_ids"] = [str(uid) for uid in body.owner_ids]
    for k, v in data.items():
        setattr(opp, k, v)
    db.add(AuditLog(user_id=current_user.id, entity_type="opportunity", entity_id=opp.id, action="update",
                    diff={"stage": opp.stage.value if "stage" in data else None}))
    db.commit()
    db.refresh(opp)
    return _to_out(opp, db)


@router.delete("/{opp_id}", status_code=204, summary="删除商机")
def delete_opportunity(
    opp_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(404, "商机不存在")
    db.add(AuditLog(user_id=current_user.id, entity_type="opportunity", entity_id=opp.id, action="delete"))
    db.delete(opp)
    db.commit()
