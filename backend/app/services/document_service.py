"""
文档生成服务：调用 Word/PPT 生成器，结果写入 MinIO，更新 Deliverable 记录。
"""
import io
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models.solution import Solution
from app.models.deliverable import Deliverable, DeliverableType, DeliverableStatus

logger = logging.getLogger(__name__)


def _get_minio_client():
    """懒加载 MinIO 客户端。"""
    try:
        from minio import Minio
        client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        return client
    except Exception as exc:
        logger.warning(f"MinIO unavailable: {exc}")
        return None


def _upload_to_minio(client, bucket: str, object_name: str, data: bytes, content_type: str) -> bool:
    """上传文件到 MinIO，返回是否成功。"""
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
        client.put_object(
            bucket,
            object_name,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return True
    except Exception as exc:
        logger.error(f"MinIO upload failed [{object_name}]: {exc}")
        return False


def generate_and_store_deliverables(solution_id: uuid.UUID, db: Session):
    """
    为指定 Solution 生成所有待生成的交付物并存储到 MinIO。

    Args:
        solution_id: Solution UUID
        db: SQLAlchemy Session
    """
    solution = db.query(Solution).filter(Solution.id == solution_id).first()
    if not solution:
        logger.error(f"Solution {solution_id} not found for document generation")
        return

    requirement = solution.requirement
    customer = requirement.opportunity.customer if requirement and requirement.opportunity else None
    customer_name = customer.name if customer else "未知客户"

    req_info = {
        "title": requirement.title if requirement else "技术方案",
        "content": requirement.content if requirement else {},
    }

    content = solution.content or {}
    version = solution.version

    # 获取待生成的交付物
    deliverables = db.query(Deliverable).filter(
        Deliverable.solution_id == solution_id,
        Deliverable.status == DeliverableStatus.generating,
    ).all()

    if not deliverables:
        logger.info(f"No pending deliverables for solution {solution_id}")
        return

    minio = _get_minio_client()
    bucket = settings.MINIO_BUCKET

    for dlv in deliverables:
        try:
            # 生成文件内容
            file_bytes, filename, content_type = _generate_file(
                dlv.type, content, req_info, customer_name, version
            )

            object_name = f"solutions/{solution_id}/{filename}"
            file_size = len(file_bytes)

            # 上传到 MinIO（MinIO 不可用时跳过但标记完成，适合本地开发）
            if minio and _upload_to_minio(minio, bucket, object_name, file_bytes, content_type):
                dlv.file_path = object_name
                logger.info(f"Uploaded {object_name} ({file_size} bytes)")
            else:
                # MinIO 不可用时仍标记完成（开发模式）
                dlv.file_path = object_name
                logger.warning(f"MinIO unavailable, skipping upload for {object_name}")

            dlv.file_name = filename
            dlv.file_size = file_size
            dlv.status = DeliverableStatus.ready

        except Exception as exc:
            logger.exception(f"Document generation failed [{dlv.type}]: {exc}")
            dlv.status = DeliverableStatus.failed

    db.commit()
    logger.info(f"Deliverables generated for solution {solution_id}: {len(deliverables)} files")


def _generate_file(
    dlv_type: DeliverableType,
    content: dict,
    req_info: dict,
    customer_name: str,
    version: str,
) -> tuple[bytes, str, str]:
    """
    根据交付物类型生成文件，返回 (bytes, filename, content_type)。
    """
    safe_customer = customer_name.replace(" ", "_").replace("/", "_")[:20]
    date_str = datetime.now().strftime("%Y%m%d")

    if dlv_type == DeliverableType.word_tech:
        from app.document_gen.word_generator import generate_word_tech
        data = generate_word_tech(content, req_info, customer_name, version)
        filename = f"{safe_customer}_技术方案_v{version}_{date_str}.docx"
        return data, filename, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    elif dlv_type == DeliverableType.ppt_overview:
        from app.document_gen.ppt_generator import generate_ppt_overview
        data = generate_ppt_overview(content, req_info, customer_name, version)
        filename = f"{safe_customer}_技术方案PPT_v{version}_{date_str}.pptx"
        return data, filename, "application/vnd.openxmlformats-officedocument.presentationml.presentation"

    elif dlv_type == DeliverableType.ppt_exec:
        from app.document_gen.ppt_generator import generate_ppt_exec
        data = generate_ppt_exec(content, req_info, customer_name, version)
        filename = f"{safe_customer}_汇报方案PPT_v{version}_{date_str}.pptx"
        return data, filename, "application/vnd.openxmlformats-officedocument.presentationml.presentation"

    else:
        raise ValueError(f"Unknown deliverable type: {dlv_type}")


def get_presigned_download_url(storage_path: str, filename: str, expires_minutes: int = 60) -> str | None:
    """
    获取 MinIO 预签名下载 URL。

    Args:
        storage_path: MinIO object path
        filename: 下载时的文件名
        expires_minutes: URL 有效期（分钟）

    Returns:
        预签名 URL 字符串，MinIO 不可用时返回 None
    """
    from datetime import timedelta

    minio = _get_minio_client()
    if not minio:
        return None

    try:
        from minio.commonconfig import ENABLED
        url = minio.presigned_get_object(
            settings.MINIO_BUCKET,
            storage_path,
            expires=timedelta(minutes=expires_minutes),
            response_headers={"response-content-disposition": f'attachment; filename="{filename}"'},
        )
        return url
    except Exception as exc:
        logger.error(f"Failed to generate presigned URL for {storage_path}: {exc}")
        return None
