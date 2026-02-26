import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.models.opportunity import Opportunity
from app.models.audit_log import AuditLog
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerOut, CustomerList

router = APIRouter(prefix="/customers", tags=["客户管理"])


def _to_out(c: Customer, db: Session) -> CustomerOut:
    count = db.query(func.count(Opportunity.id)).filter(Opportunity.customer_id == c.id).scalar()
    out = CustomerOut.model_validate(c)
    out.opportunity_count = count or 0
    return out


@router.get("", response_model=CustomerList, summary="客户列表")
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Customer)
    if q:
        query = query.filter(Customer.name.ilike(f"%{q}%"))
    total = query.count()
    items = query.order_by(Customer.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return CustomerList(
        items=[_to_out(c, db) for c in items],
        total=total, page=page, page_size=page_size,
    )


@router.post("", response_model=CustomerOut, status_code=201, summary="新建客户")
def create_customer(
    body: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = Customer(
        **body.model_dump(exclude={"contacts"}),
        contacts=[c.model_dump() for c in body.contacts],
        owner_id=current_user.id,
        created_by=current_user.id,
    )
    db.add(customer)
    db.flush()
    db.add(AuditLog(user_id=current_user.id, entity_type="customer", entity_id=customer.id, action="create"))
    db.commit()
    db.refresh(customer)
    return _to_out(customer, db)


@router.get("/{customer_id}", response_model=CustomerOut, summary="客户详情")
def get_customer(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "客户不存在")
    return _to_out(c, db)


@router.patch("/{customer_id}", response_model=CustomerOut, summary="更新客户")
def update_customer(
    customer_id: uuid.UUID,
    body: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "客户不存在")
    data = body.model_dump(exclude_none=True)
    if "contacts" in data:
        data["contacts"] = [ct.model_dump() for ct in body.contacts] if body.contacts else []
    for k, v in data.items():
        setattr(c, k, v)
    db.add(AuditLog(user_id=current_user.id, entity_type="customer", entity_id=c.id, action="update"))
    db.commit()
    db.refresh(c)
    return _to_out(c, db)


@router.delete("/{customer_id}", status_code=204, summary="删除客户")
def delete_customer(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Customer).filter(Customer.id == customer_id).first()
    if not c:
        raise HTTPException(404, "客户不存在")
    db.add(AuditLog(user_id=current_user.id, entity_type="customer", entity_id=c.id, action="delete"))
    db.delete(c)
    db.commit()
