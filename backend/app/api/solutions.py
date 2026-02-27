import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.requirement import Requirement
from app.models.solution import Solution, SolutionStatus
from app.models.deliverable import Deliverable, DeliverableType, DeliverableStatus
from app.models.gen_job import GenJob, AgentType, JobStatus
from app.models.audit_log import AuditLog
from app.schemas.solution import SolutionCreate, SolutionOut, SolutionList
from app.services.version_service import next_version, archive_previous_versions

router = APIRouter(prefix="/solutions", tags=["方案管理"])


def _to_out(sol: Solution) -> SolutionOut:
    return SolutionOut.model_validate(sol)


@router.get("", response_model=SolutionList, summary="方案列表")
def list_solutions(
    requirement_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Solution)
    if requirement_id:
        query = query.filter(Solution.requirement_id == requirement_id)
    total = query.count()
    items = query.order_by(Solution.created_at.desc()).all()
    return SolutionList(items=[_to_out(s) for s in items], total=total)


@router.post("", response_model=SolutionOut, status_code=201, summary="新建方案（触发AI生成）")
def create_solution(
    body: SolutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(Requirement).filter(Requirement.id == body.requirement_id).first()
    if not req:
        raise HTTPException(404, "需求不存在")

    version = next_version(db, body.requirement_id)

    # 创建方案
    solution = Solution(
        requirement_id=body.requirement_id,
        version=version,
        change_note=body.change_note,
        status=SolutionStatus.generating,
        is_current=True,
        created_by=current_user.id,
    )
    db.add(solution)
    db.flush()

    # 将同需求下其他版本标为非当前
    db.query(Solution).filter(
        Solution.requirement_id == body.requirement_id,
        Solution.id != solution.id,
    ).update({"is_current": False})

    # 创建 GenJob 记录（6个Agent）
    for agent in AgentType:
        db.add(GenJob(solution_id=solution.id, agent_type=agent))

    # 创建 Deliverable 占位记录
    requested_types = [DeliverableType(t) for t in body.deliverable_types if t in DeliverableType._value2member_map_]
    if not requested_types:
        requested_types = [DeliverableType.word_tech, DeliverableType.ppt_overview, DeliverableType.ppt_exec]
    for dtype in requested_types:
        db.add(Deliverable(solution_id=solution.id, type=dtype, status=DeliverableStatus.generating))

    db.add(AuditLog(user_id=current_user.id, entity_type="solution", entity_id=solution.id, action="generate"))
    db.commit()
    db.refresh(solution)

    # 异步触发 Celery 任务
    try:
        from app.services.celery_app import generate_solution as celery_generate
        celery_generate.delay(str(solution.id))
    except Exception:
        # Celery/Redis 不可用时降级：记录日志但不阻断 API 响应
        import logging
        logging.getLogger(__name__).warning(
            "Celery unavailable, solution generation not triggered for %s", solution.id
        )

    return _to_out(solution)


@router.get("/{sol_id}", response_model=SolutionOut, summary="方案详情（含 Agent 状态和交付物）")
def get_solution(
    sol_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sol = db.query(Solution).filter(Solution.id == sol_id).first()
    if not sol:
        raise HTTPException(404, "方案不存在")
    return _to_out(sol)


@router.patch("/{sol_id}/status", response_model=SolutionOut, summary="更新方案状态")
def update_solution_status(
    sol_id: uuid.UUID,
    status: SolutionStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sol = db.query(Solution).filter(Solution.id == sol_id).first()
    if not sol:
        raise HTTPException(404, "方案不存在")
    sol.status = status
    if status == SolutionStatus.archived:
        sol.archived_at = datetime.now(timezone.utc)
        sol.is_current = False
    db.add(AuditLog(user_id=current_user.id, entity_type="solution", entity_id=sol.id, action="update",
                    diff={"status": status.value}))
    db.commit()
    db.refresh(sol)

    # 赢单（approved）时将方案异步写入 RAG 知识库
    if status == SolutionStatus.approved:
        _trigger_rag_index(sol, db)

    return _to_out(sol)


def _trigger_rag_index(sol: Solution, db: Session):
    """在后台线程中将已批准方案写入 ChromaDB，不阻塞 API 响应。"""
    import threading
    from app.models.customer import Customer

    req = sol.requirement
    if not req:
        return

    customer = (
        db.query(Customer).filter(Customer.id == req.opportunity.customer_id).first()
        if req.opportunity else None
    )
    customer_name = customer.name if customer else ""

    solution_id   = sol.id
    req_content   = dict(req.content or {})
    sol_content   = dict(sol.content or {})
    req_title     = req.title

    def _index():
        try:
            from app.services.rag_service import index_solution
            index_solution(solution_id, req_content, sol_content, customer_name, req_title)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(f"RAG indexing failed for solution {solution_id}: {exc}")

    threading.Thread(target=_index, daemon=True).start()


@router.get("/{sol_id}/progress", summary="实时查询生成进度")
def get_progress(
    sol_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sol = db.query(Solution).filter(Solution.id == sol_id).first()
    if not sol:
        raise HTTPException(404, "方案不存在")
    jobs = db.query(GenJob).filter(GenJob.solution_id == sol_id).all()
    done_count = sum(1 for j in jobs if j.status == JobStatus.done)
    return {
        "solution_id": str(sol_id),
        "solution_status": sol.status.value,
        "agents_total": len(jobs),
        "agents_done": done_count,
        "overall_progress": round(done_count / len(jobs), 2) if jobs else 0,
        "agents": [
            {
                "agent_type": j.agent_type.value,
                "status": j.status.value,
                "progress": j.progress,
                "started_at": j.started_at.isoformat() if j.started_at else None,
                "finished_at": j.finished_at.isoformat() if j.finished_at else None,
            }
            for j in jobs
        ],
    }
