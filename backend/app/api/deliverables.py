import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.deliverable import Deliverable
from app.models.audit_log import AuditLog
from app.schemas.deliverable import DeliverableOut

router = APIRouter(prefix="/deliverables", tags=["交付物管理"])


@router.get("", response_model=list[DeliverableOut], summary="交付物列表")
def list_deliverables(
    solution_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Deliverable)
    if solution_id:
        query = query.filter(Deliverable.solution_id == solution_id)
    return [DeliverableOut.model_validate(d) for d in query.order_by(Deliverable.created_at.desc()).all()]


@router.get("/{dlv_id}", response_model=DeliverableOut, summary="交付物详情")
def get_deliverable(
    dlv_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = db.query(Deliverable).filter(Deliverable.id == dlv_id).first()
    if not d:
        raise HTTPException(404, "交付物不存在")
    return DeliverableOut.model_validate(d)


@router.post("/{dlv_id}/download-url", summary="获取下载链接（时效性预签名URL）")
def get_download_url(
    dlv_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    生产环境：调用 MinIO presigned URL，有效期 5 分钟。
    当前返回占位响应。
    """
    d = db.query(Deliverable).filter(Deliverable.id == dlv_id).first()
    if not d:
        raise HTTPException(404, "交付物不存在")
    if d.status.value != "ready":
        raise HTTPException(400, f"交付物尚未就绪（当前状态：{d.status.value}）")

    # 记录下载次数
    d.download_count += 1
    db.add(AuditLog(user_id=current_user.id, entity_type="deliverable", entity_id=d.id, action="download"))
    db.commit()

    from app.services.document_service import get_presigned_download_url
    url = get_presigned_download_url(d.file_path, d.file_name, expires_minutes=5)
    return {
        "url": url or f"/files/{d.file_path}",
        "expires_in": 300,
        "file_name": d.file_name,
    }


@router.get("/solution/{solution_id}/package", summary="获取整包下载链接")
def get_package_url(
    solution_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """生成该方案版本所有交付物的打包下载链接"""
    dlvs = db.query(Deliverable).filter(
        Deliverable.solution_id == solution_id,
        Deliverable.status == "ready",
    ).all()
    if not dlvs:
        raise HTTPException(400, "该版本暂无可下载的交付物")

    # 记录操作
    for d in dlvs:
        db.add(AuditLog(user_id=current_user.id, entity_type="deliverable", entity_id=d.id, action="download"))
    db.commit()

    # TODO: 打包压缩 → MinIO 临时对象 → 预签名 URL
    return {
        "url": f"/package/solution-{solution_id}.zip",
        "expires_in": 300,
        "file_count": len(dlvs),
    }
