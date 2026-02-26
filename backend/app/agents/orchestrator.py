"""
LangGraph 编排器：并行执行 6 个 Agent，聚合结果，更新数据库。

状态机：
  START → [arch, sizing, security, migration, plan, pricing] (并行) → aggregate → END
"""
import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.gen_job import GenJob, AgentType, JobStatus
from app.models.solution import Solution, SolutionStatus
from app.agents.base_agent import run_single_agent

logger = logging.getLogger(__name__)


def _update_job(db: Session, solution_id: uuid.UUID, agent_type: str, **kwargs):
    """原子更新 GenJob 记录。"""
    db.query(GenJob).filter(
        GenJob.solution_id == solution_id,
        GenJob.agent_type == agent_type,
    ).update(kwargs)
    db.commit()


def _run_agent_with_db(
    agent_type: str,
    solution_id: uuid.UUID,
    requirement_content: dict,
    raw_input: str,
    db: Session,
) -> tuple[str, dict | None]:
    """在线程中执行单个 Agent 并将进度写回 DB。"""
    try:
        _update_job(db, solution_id, agent_type,
                    status=JobStatus.running,
                    started_at=datetime.now(timezone.utc),
                    progress=0.0)

        def on_progress(progress: float, chunk: str):
            _update_job(db, solution_id, agent_type, progress=round(progress, 2))

        result = run_single_agent(
            agent_type=agent_type,
            requirement_content=requirement_content,
            raw_input=raw_input,
            on_progress=on_progress,
        )

        _update_job(db, solution_id, agent_type,
                    status=JobStatus.done,
                    progress=1.0,
                    result=result,
                    finished_at=datetime.now(timezone.utc))

        return agent_type, result

    except Exception as exc:
        logger.exception(f"[{agent_type}] Agent failed: {exc}")
        _update_job(db, solution_id, agent_type,
                    status=JobStatus.failed,
                    error=str(exc)[:500],
                    finished_at=datetime.now(timezone.utc))
        return agent_type, None


def run_solution_generation(solution_id: uuid.UUID, db: Session) -> dict[str, Any]:
    """
    主编排函数：并行执行 6 个 Agent，聚合结果写入 Solution.content。

    Args:
        solution_id: 要生成的 Solution UUID
        db: SQLAlchemy Session

    Returns:
        {"status": "completed"|"partial", "agents": {agent_type: result}}
    """
    solution = db.query(Solution).filter(Solution.id == solution_id).first()
    if not solution:
        raise ValueError(f"Solution {solution_id} not found")

    requirement = solution.requirement
    requirement_content = requirement.content or {}
    raw_input = requirement.raw_input or ""

    logger.info(f"[orchestrator] Starting generation for solution {solution_id}")

    # 更新 solution 状态为生成中
    solution.status = SolutionStatus.generating
    db.commit()

    agent_types = [at.value for at in AgentType]
    results: dict[str, dict | None] = {}

    # 并发执行（最多 6 个线程，一个 Agent 一个线程）
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(
                _run_agent_with_db,
                agent_type,
                solution_id,
                requirement_content,
                raw_input,
                db,
            ): agent_type
            for agent_type in agent_types
        }
        for future in as_completed(futures):
            agent_type, result = future.result()
            results[agent_type] = result

    # 聚合结果写入 solution.content
    content = {k: v for k, v in results.items() if v is not None}
    failed = [k for k, v in results.items() if v is None]

    solution.content = content
    solution.status = SolutionStatus.completed if not failed else SolutionStatus.failed
    db.commit()

    logger.info(
        f"[orchestrator] Generation complete. "
        f"Success: {list(content.keys())}, Failed: {failed}"
    )

    return {
        "status": "completed" if not failed else "partial",
        "agents": results,
        "failed": failed,
    }
