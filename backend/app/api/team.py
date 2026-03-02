import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models.user import User, UserRole
from app.models.solution import Solution
from app.models.opportunity import Opportunity
from app.schemas.auth import UserOut, UserUpdate

router = APIRouter(prefix="/team", tags=["团队管理"])


@router.get("", summary="团队成员列表（含工作量统计）")
def list_team(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = db.query(User).filter(User.is_active == True).order_by(User.created_at).all()
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = []
    for u in users:
        sol_this_month = (
            db.query(func.count(Solution.id))
            .filter(Solution.created_by == u.id, Solution.created_at >= month_start)
            .scalar()
        ) or 0
        active_opps = db.query(func.count(Opportunity.id)).filter(
            Opportunity.owner_ids.contains([str(u.id)]),
            Opportunity.stage.in_(["initial", "req_confirm", "proposal", "customer_report"]),
        ).scalar() or 0

        result.append({
            "user": UserOut.model_validate(u),
            "solutions_this_month": sol_this_month,
            "active_opportunities": active_opps,
        })
    return result


@router.get("/{user_id}", summary="成员详情")
def get_member(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    return UserOut.model_validate(user)


@router.patch("/{user_id}", response_model=UserOut, summary="更新成员信息（管理员）")
def update_member(
    user_id: uuid.UUID,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    data = body.model_dump(exclude_none=True)
    if "password" in data:
        import bcrypt
        user.hashed_password = bcrypt.hashpw(data.pop("password").encode(), bcrypt.gensalt()).decode()
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/{user_id}", summary="删除成员（管理员）")
def delete_member(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(400, "不能删除自己")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    db.delete(user)
    db.commit()
    return {"ok": True}
