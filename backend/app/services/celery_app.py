"""
Celery 应用配置与任务定义。
启动命令: celery -A app.services.celery_app worker --loglevel=info -c 4
"""
import uuid
import logging

from celery import Celery
from sqlalchemy.orm import sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "cloudpresale",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)


@celery_app.task(
    name="generate_solution",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
)
def generate_solution(self, solution_id_str: str):
    """
    异步任务：
    1. 并行执行 6 个 AI Agent 生成方案内容
    2. 生成 Word/PPT 文档并上传到 MinIO
    """
    from app.database import get_sync_engine
    from app.agents.orchestrator import run_solution_generation
    from app.services.document_service import generate_and_store_deliverables

    engine = get_sync_engine()
    SM = sessionmaker(bind=engine)
    db = SM()

    try:
        solution_id = uuid.UUID(solution_id_str)
        logger.info(f"[celery] Starting solution generation: {solution_id}")

        # Step 1: AI Agent 并行生成
        result = run_solution_generation(solution_id=solution_id, db=db)
        logger.info(f"[celery] Agent generation complete: {result['status']}")

        # Step 2: 文档生成 + MinIO 上传
        generate_and_store_deliverables(solution_id=solution_id, db=db)
        logger.info(f"[celery] Documents generated for solution: {solution_id}")

        return result
    except Exception as exc:
        logger.exception(f"[celery] Task failed: {exc}")
        db.rollback()
        raise self.retry(exc=exc)
    finally:
        db.close()
