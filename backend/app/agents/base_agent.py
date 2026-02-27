"""
单个 AI Agent 执行器：调用 Claude API，流式输出，更新 GenJob 进度。
"""
import json
import logging
from datetime import datetime, timezone

import anthropic

from app.config import settings
from app.agents.prompts import AGENT_CONFIGS

logger = logging.getLogger(__name__)


def _format_requirement(content: dict) -> str:
    """将需求 content dict 格式化为可读文本，供 Prompt 使用。"""
    lines = []
    field_labels = {
        "industry": "行业",
        "current_containerization": "当前容器化比例",
        "target_containerization": "目标容器化比例",
        "cluster_count": "集群数量",
        "cluster_detail": "集群详情",
        "budget_range": "预算范围",
        "compliance": "合规要求",
        "modules": "覆盖模块",
        "key_contacts": "关键联系人",
        "pain_points": "业务痛点",
        "decision_timeline": "决策时间",
    }
    for key, label in field_labels.items():
        val = content.get(key)
        if val is None:
            continue
        if isinstance(val, list):
            val_str = "、".join(str(v) if not isinstance(v, dict) else json.dumps(v, ensure_ascii=False) for v in val)
        else:
            val_str = str(val)
        lines.append(f"- **{label}**: {val_str}")
    return "\n".join(lines) if lines else "（暂无结构化需求内容）"


def run_single_agent(
    agent_type: str,
    requirement_content: dict,
    raw_input: str = "",
    on_progress: callable = None,
) -> dict:
    """
    执行单个 Agent，返回结果 dict。

    Args:
        agent_type: "arch" | "sizing" | "security" | "migration" | "plan" | "pricing"
        requirement_content: 需求结构化内容 dict
        raw_input: 原始需求文本（补充上下文）
        on_progress: 进度回调 fn(progress: float, chunk: str)

    Returns:
        {"content": "<markdown>", "tokens": int, "duration_s": float}
    """
    config = AGENT_CONFIGS[agent_type]
    req_text = _format_requirement(requirement_content)
    if raw_input:
        req_text += f"\n\n**原始需求描述**:\n{raw_input}"

    # RAG：检索相似历史案例，注入参考上下文
    try:
        from app.services.rag_service import retrieve_similar
        rag_context = retrieve_similar(requirement_content, top_k=3)
    except Exception:
        rag_context = ""

    user_message = config["prompt_template"].format(requirement_content=req_text)
    if rag_context:
        user_message = rag_context + "\n\n---\n\n" + user_message

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    start_time = datetime.now(timezone.utc)
    collected_text = []
    input_tokens = 0
    output_tokens = 0

    logger.info(f"[{agent_type}] Starting generation with model {settings.DEFAULT_LLM}")

    with client.messages.stream(
        model=settings.DEFAULT_LLM,
        max_tokens=4096,
        system=config["system"],
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        char_count = 0
        for text in stream.text_stream:
            collected_text.append(text)
            char_count += len(text)
            # 估算进度（假设平均输出 2000 字符）
            estimated_progress = min(0.95, char_count / 2000)
            if on_progress:
                on_progress(estimated_progress, text)

        # 获取最终 usage
        final_message = stream.get_final_message()
        input_tokens = final_message.usage.input_tokens
        output_tokens = final_message.usage.output_tokens

    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    result_content = "".join(collected_text)

    logger.info(
        f"[{agent_type}] Done: {output_tokens} output tokens, {duration:.1f}s"
    )

    return {
        "content": result_content,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "duration_s": round(duration, 1),
    }
