import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.opportunity import Opportunity
from app.models.requirement import Requirement, RequirementStatus
from app.models.solution import Solution
from app.models.audit_log import AuditLog
from app.schemas.requirement import RequirementCreate, RequirementUpdate, RequirementOut, RequirementList
from app.services.version_service import compute_completeness

router = APIRouter(prefix="/requirements", tags=["需求管理"])


def _to_out(req: Requirement, db: Session) -> RequirementOut:
    sol_count = db.query(func.count(Solution.id)).filter(Solution.requirement_id == req.id).scalar()
    out = RequirementOut.model_validate(req)
    out.solution_count = sol_count or 0
    return out


@router.get("", response_model=RequirementList, summary="需求列表")
def list_requirements(
    opportunity_id: uuid.UUID | None = None,
    status: RequirementStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Requirement)
    if opportunity_id:
        query = query.filter(Requirement.opportunity_id == opportunity_id)
    if status:
        query = query.filter(Requirement.status == status)
    total = query.count()
    items = query.order_by(Requirement.updated_at.desc()).all()
    return RequirementList(items=[_to_out(r, db) for r in items], total=total)


@router.post("", response_model=RequirementOut, status_code=201, summary="新建需求")
def create_requirement(
    body: RequirementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Opportunity).filter(Opportunity.id == body.opportunity_id).first():
        raise HTTPException(404, "商机不存在")

    # 自动递增版本号
    latest_ver = (
        db.query(func.max(Requirement.version))
        .filter(Requirement.opportunity_id == body.opportunity_id)
        .scalar()
    ) or 0

    content_dict = body.content.model_dump()
    completeness = compute_completeness(content_dict)

    req = Requirement(
        opportunity_id=body.opportunity_id,
        title=body.title,
        version=latest_ver + 1,
        content=content_dict,
        raw_input=body.raw_input,
        completeness=completeness,
        created_by=current_user.id,
    )
    db.add(req)
    db.flush()
    db.add(AuditLog(user_id=current_user.id, entity_type="requirement", entity_id=req.id, action="create"))
    db.commit()
    db.refresh(req)
    return _to_out(req, db)


@router.get("/{req_id}", response_model=RequirementOut, summary="需求详情")
def get_requirement(
    req_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(404, "需求不存在")
    return _to_out(req, db)


@router.patch("/{req_id}", response_model=RequirementOut, summary="更新需求")
def update_requirement(
    req_id: uuid.UUID,
    body: RequirementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(404, "需求不存在")
    data = body.model_dump(exclude_none=True)
    if "content" in data:
        content_dict = body.content.model_dump()
        req.content = content_dict
        req.completeness = compute_completeness(content_dict)
        data.pop("content")
    for k, v in data.items():
        setattr(req, k, v)
    db.add(AuditLog(user_id=current_user.id, entity_type="requirement", entity_id=req.id, action="update"))
    db.commit()
    db.refresh(req)
    return _to_out(req, db)


@router.post("/{req_id}/confirm", response_model=RequirementOut, summary="确认需求")
def confirm_requirement(
    req_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(404, "需求不存在")
    req.status = RequirementStatus.confirmed
    req.confirmed_at = datetime.now(timezone.utc)
    req.confirmed_by = current_user.id
    db.add(AuditLog(user_id=current_user.id, entity_type="requirement", entity_id=req.id, action="confirm"))
    db.commit()
    db.refresh(req)
    return _to_out(req, db)


@router.delete("/{req_id}", status_code=204, summary="删除需求")
def delete_requirement(
    req_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not req:
        raise HTTPException(404, "需求不存在")
    db.add(AuditLog(user_id=current_user.id, entity_type="requirement", entity_id=req.id, action="delete"))
    db.delete(req)
    db.commit()
