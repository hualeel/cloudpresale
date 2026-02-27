"""
RAG 知识库服务（ChromaDB v2 REST API via httpx）

不依赖 chromadb Python 包，直接调用 HTTP API，大幅减小镜像体积。

职责：
- index_solution()  : 赢单方案入库（向量化存储）
- retrieve_similar(): 生成时检索相似历史案例
- _embed()          : 字符 n-gram + 词哈希嵌入（无外部模型依赖）
"""
import hashlib
import json
import logging
import math
import uuid

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "presale_solutions"
EMBED_DIM = 256

# ChromaDB v2 API 基础路径
_BASE = "/api/v2/tenants/default_tenant/databases/default_database"


# ── 嵌入计算（无模型依赖）────────────────────────────

def _embed(text: str) -> list[float]:
    """
    将文本转换为 256 维向量（字符 2/3-gram + 词级哈希）。
    确定性：相同输入始终产生相同向量；不依赖任何外部模型。
    """
    vec = [0.0] * EMBED_DIM
    text = text.lower()

    for n in (2, 3):
        for i in range(len(text) - n + 1):
            gram = text[i : i + n]
            idx = int(hashlib.md5(gram.encode("utf-8")).hexdigest(), 16) % EMBED_DIM
            vec[idx] += 1.0

    for word in text.split():
        idx = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16) % EMBED_DIM
        vec[idx] += 2.0

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
        parts.append(" ".join(str(v) for v in val) if isinstance(val, list) else str(val))
    return " ".join(parts)


# ── ChromaDB HTTP 客户端 ─────────────────────────────

def _client() -> httpx.Client:
    base_url = f"http://{settings.CHROMA_HOST}:{settings.CHROMA_PORT}"
    return httpx.Client(base_url=base_url, timeout=10.0)


def _get_or_create_collection(client: httpx.Client) -> str | None:
    """
    返回 collection 的 UUID（id）。
    先尝试 GET，不存在时 POST 创建。失败返回 None。
    """
    try:
        # 尝试按名称获取
        r = client.get(f"{_BASE}/collections/{COLLECTION_NAME}")
        if r.status_code == 200:
            return r.json()["id"]

        # 不存在则创建
        r = client.post(
            f"{_BASE}/collections",
            json={"name": COLLECTION_NAME, "metadata": {"hnsw:space": "cosine"}},
        )
        if r.status_code in (200, 201):
            return r.json()["id"]

        logger.warning(f"ChromaDB create collection failed: {r.status_code} {r.text[:200]}")
        return None
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
    将已赢单方案入库（upsert）。
    ChromaDB 不可用时静默返回 False。
    """
    try:
        with _client() as client:
            col_id = _get_or_create_collection(client)
            if not col_id:
                return False

            req_text  = _req_to_text(requirement_content)
            embedding = _embed(req_text)

            agent_summaries = {}
            for key in ("arch", "sizing", "security", "migration", "plan", "pricing"):
                result = solution_content.get(key)
                if result:
                    content = result.get("content", "") if isinstance(result, dict) else str(result)
                    agent_summaries[key] = content[:500]

            r = client.post(
                f"{_BASE}/collections/{col_id}/upsert",
                json={
                    "ids":        [str(solution_id)],
                    "embeddings": [embedding],
                    "documents":  [req_text],
                    "metadatas":  [{
                        "solution_id":   str(solution_id),
                        "customer_name": customer_name,
                        "req_title":     req_title,
                        "industry":      str(requirement_content.get("industry", "")),
                        "compliance":    json.dumps(requirement_content.get("compliance", []), ensure_ascii=False),
                        "modules":       json.dumps(requirement_content.get("modules", []), ensure_ascii=False),
                        "agents_json":   json.dumps(agent_summaries, ensure_ascii=False)[:2000],
                    }],
                },
            )
            if r.status_code not in (200, 201):
                logger.error(f"ChromaDB upsert failed: {r.status_code} {r.text[:200]}")
                return False

            logger.info(f"RAG: indexed solution {solution_id} for '{customer_name}'")
            return True

    except Exception as exc:
        logger.error(f"RAG index_solution failed for {solution_id}: {exc}")
        return False


def retrieve_similar(requirement_content: dict, top_k: int = 3) -> str:
    """
    检索相似历史方案，返回格式化参考上下文字符串。
    知识库为空或 ChromaDB 不可用时返回空字符串。
    """
    try:
        with _client() as client:
            col_id = _get_or_create_collection(client)
            if not col_id:
                return ""

            # 检查是否有数据
            r = client.get(f"{_BASE}/collections/{col_id}/count")
            if r.status_code != 200 or r.json() == 0:
                return ""

            count = r.json()
            query_embedding = _embed(_req_to_text(requirement_content))

            r = client.post(
                f"{_BASE}/collections/{col_id}/query",
                json={
                    "query_embeddings": [query_embedding],
                    "n_results":        min(top_k, count),
                    "include":          ["metadatas", "distances"],
                },
            )
            if r.status_code != 200:
                return ""

            data      = r.json()
            metadatas = data.get("metadatas", [[]])[0]
            distances = data.get("distances", [[]])[0]

            if not metadatas:
                return ""

            lines = ["## 参考相似历史案例（仅供参考，请结合当前需求生成）\n"]
            for i, (meta, dist) in enumerate(zip(metadatas, distances), 1):
                similarity = round((1 - dist) * 100, 1)
                agents     = json.loads(meta.get("agents_json", "{}"))

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
