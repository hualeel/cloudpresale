"""
RAG 知识库服务（ChromaDB）

职责：
- index_solution()  : 赢单方案入库（向量化存储）
- retrieve_similar(): 生成时检索相似历史案例
- _embed()          : 无外部模型依赖的字符 n-gram + 词哈希嵌入
"""
import hashlib
import json
import logging
import math
import uuid

from app.config import settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "presale_solutions"
EMBED_DIM = 256


# ── 嵌入计算（无模型依赖）────────────────────────────
def _embed(text: str) -> list[float]:
    """
    将文本转换为 256 维向量（字符 2-gram / 3-gram + 词级哈希）。
    确定性：相同输入始终产生相同向量；不依赖任何外部模型。
    """
    vec = [0.0] * EMBED_DIM
    text = text.lower()

    # 字符 n-gram
    for n in (2, 3):
        for i in range(len(text) - n + 1):
            gram = text[i : i + n]
            idx = int(hashlib.md5(gram.encode("utf-8")).hexdigest(), 16) % EMBED_DIM
            vec[idx] += 1.0

    # 词级（权重更高）
    for word in text.split():
        idx = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16) % EMBED_DIM
        vec[idx] += 2.0

    # L2 归一化
    mag = math.sqrt(sum(x * x for x in vec))
    if mag > 0:
        vec = [x / mag for x in vec]

    return vec


def _req_to_text(req_content: dict) -> str:
    """将需求 dict 序列化为可嵌入的文本串。"""
    parts = []
    for key in (
        "industry", "current_containerization", "target_containerization",
        "cluster_count", "budget_range", "compliance", "modules", "pain_points",
    ):
        val = req_content.get(key)
        if val is None:
            continue
        if isinstance(val, list):
            parts.append(" ".join(str(v) for v in val))
        else:
            parts.append(str(val))
    return " ".join(parts)


# ── ChromaDB 客户端（懒加载）─────────────────────────
def _get_collection():
    """返回 ChromaDB Collection，连接失败时返回 None。"""
    try:
        import chromadb
        client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
        )
        collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        return collection
    except Exception as exc:
        logger.warning(f"ChromaDB unavailable: {exc}")
        return None


# ── 公开接口 ─────────────────────────────────────────

def index_solution(
    solution_id: uuid.UUID,
    requirement_content: dict,
    solution_content: dict,
    customer_name: str = "",
    req_title: str = "",
) -> bool:
    """
    将已赢单方案入库。

    Args:
        solution_id:         Solution UUID
        requirement_content: 需求结构化内容 dict
        solution_content:    6个 Agent 输出的汇总 dict
        customer_name:       客户名称
        req_title:           需求标题

    Returns:
        True 表示入库成功，False 表示 ChromaDB 不可用或失败
    """
    collection = _get_collection()
    if collection is None:
        return False

    try:
        req_text = _req_to_text(requirement_content)
        embedding = _embed(req_text)

        # 存储各 Agent 输出摘要（取前 500 字符作为可读预览）
        agent_summaries = {}
        for agent_key in ("arch", "sizing", "security", "migration", "plan", "pricing"):
            result = solution_content.get(agent_key)
            if result:
                content = result.get("content", "") if isinstance(result, dict) else str(result)
                agent_summaries[agent_key] = content[:500]

        doc_id = str(solution_id)
        collection.upsert(
            ids=[doc_id],
            embeddings=[embedding],
            documents=[req_text],
            metadatas=[{
                "solution_id":   doc_id,
                "customer_name": customer_name,
                "req_title":     req_title,
                "industry":      str(requirement_content.get("industry", "")),
                "compliance":    json.dumps(requirement_content.get("compliance", []), ensure_ascii=False),
                "modules":       json.dumps(requirement_content.get("modules", []), ensure_ascii=False),
                "agents_json":   json.dumps(agent_summaries, ensure_ascii=False)[:2000],
            }],
        )
        logger.info(f"RAG: indexed solution {solution_id} for customer '{customer_name}'")
        return True

    except Exception as exc:
        logger.error(f"RAG index_solution failed for {solution_id}: {exc}")
        return False


def retrieve_similar(
    requirement_content: dict,
    top_k: int = 3,
) -> str:
    """
    检索相似历史方案，返回格式化的参考上下文字符串。
    知识库为空或 ChromaDB 不可用时返回空字符串。

    Args:
        requirement_content: 当前需求 dict
        top_k:               返回的最相似案例数

    Returns:
        Markdown 格式的参考案例文本，可直接拼入 Agent prompt
    """
    collection = _get_collection()
    if collection is None:
        return ""

    try:
        count = collection.count()
        if count == 0:
            return ""

        query_text = _req_to_text(requirement_content)
        query_embedding = _embed(query_text)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, count),
            include=["metadatas", "distances"],
        )

        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        if not metadatas:
            return ""

        lines = ["## 参考相似历史案例（仅供参考，请结合当前需求生成）\n"]
        for i, (meta, dist) in enumerate(zip(metadatas, distances), 1):
            similarity = round((1 - dist) * 100, 1)
            agents = json.loads(meta.get("agents_json", "{}"))

            lines.append(f"### 参考案例 {i}：{meta.get('customer_name', '未知客户')} — {meta.get('req_title', '')}")
            lines.append(f"- 相似度：{similarity}%")
            lines.append(f"- 行业：{meta.get('industry', '')}")
            lines.append(f"- 合规：{meta.get('compliance', '')}")
            lines.append(f"- 覆盖模块：{meta.get('modules', '')}")

            if agents.get("arch"):
                lines.append(f"\n**架构方案摘要**：\n{agents['arch']}\n")
            if agents.get("sizing"):
                lines.append(f"**规模测算摘要**：\n{agents['sizing']}\n")

        return "\n".join(lines)

    except Exception as exc:
        logger.warning(f"RAG retrieve_similar failed: {exc}")
        return ""
