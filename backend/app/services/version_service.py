"""方案版本号自动管理服务"""
from sqlalchemy.orm import Session
from app.models.solution import Solution


def next_version(db: Session, requirement_id) -> str:
    """
    根据当前需求下已有方案版本，计算下一个版本号。
    规则：小版本递增（1.0 → 1.1 → 1.2）
    若需要大版本迭代，由用户手动指定。
    """
    latest = (
        db.query(Solution)
        .filter(Solution.requirement_id == requirement_id)
        .order_by(Solution.created_at.desc())
        .first()
    )
    if latest is None:
        return "1.0"

    parts = latest.version.split(".")
    try:
        major, minor = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
        return f"{major}.{minor + 1}"
    except (ValueError, IndexError):
        return "1.0"


def archive_previous_versions(db: Session, requirement_id, current_solution_id) -> None:
    """将同一需求下其他版本标记为非当前（is_current=False）"""
    db.query(Solution).filter(
        Solution.requirement_id == requirement_id,
        Solution.id != current_solution_id,
    ).update({"is_current": False})
    db.commit()


def compute_completeness(content: dict) -> float:
    """
    根据需求内容 JSON 计算完整度（0.0~1.0）。
    各字段权重相同，填写一个算一份。
    """
    fields = [
        "industry", "current_containerization", "target_containerization",
        "cluster_count", "budget_range", "compliance", "modules",
        "key_contacts", "pain_points", "decision_timeline",
    ]
    filled = sum(1 for f in fields if content.get(f))
    return round(filled / len(fields), 2)
