"""
单个 AI Agent 执行器：支持 Anthropic Claude 和 DeepSeek，流式输出，更新 GenJob 进度。
"""
import json
import logging
from datetime import datetime, timezone

from app.config import settings
from app.crypto import decrypt_secret
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
            val_str = "、".join(
                str(v) if not isinstance(v, dict) else json.dumps(v, ensure_ascii=False)
                for v in val
            )
        else:
            val_str = str(val)
        lines.append(f"- **{label}**: {val_str}")
    return "\n".join(lines) if lines else "（暂无结构化需求内容）"


def _read_llm_config() -> dict:
    """从 DB 读取有效 LLM 配置，返回 {model, anthropic_key, deepseek_key, kimi_key}。DB 优先，env 兜底。"""
    model = settings.DEFAULT_LLM
    anthropic_key = settings.ANTHROPIC_API_KEY or ""
    deepseek_key = ""
    kimi_key = ""
    try:
        from sqlalchemy import create_engine as _ce
        from sqlalchemy.orm import Session as _S
        from app.models.system_setting import SystemSetting as _SS
        _engine = _ce(settings.DATABASE_URL)
        with _S(_engine) as _db:
            rows = _db.query(_SS).filter(
                _SS.key.in_(["default_llm", "anthropic_api_key", "deepseek_api_key", "kimi_api_key"])
            ).all()
            kv = {r.key: r.value for r in rows if r.value}
            if "default_llm" in kv:
                model = kv["default_llm"]
            if "anthropic_api_key" in kv:
                anthropic_key = decrypt_secret(kv["anthropic_api_key"])
            if "deepseek_api_key" in kv:
                deepseek_key = decrypt_secret(kv["deepseek_api_key"])
            if "kimi_api_key" in kv:
                kimi_key = decrypt_secret(kv["kimi_api_key"])
        _engine.dispose()
    except Exception as e:
        logger.warning(f"_read_llm_config: failed to read from DB: {e}")
    return {"model": model, "anthropic_key": anthropic_key, "deepseek_key": deepseek_key, "kimi_key": kimi_key}


def _run_with_anthropic(
    config: dict, user_message: str, model: str, api_key: str, on_progress
) -> dict:
    import anthropic
    client = anthropic.Anthropic(
        api_key=api_key,
        **( {"base_url": settings.LLM_BASE_URL} if settings.LLM_BASE_URL else {} ),
    )
    start_time = datetime.now(timezone.utc)
    collected_text = []
    input_tokens = 0
    output_tokens = 0

    with client.messages.stream(
        model=model,
        max_tokens=4096,
        system=config["system"],
        messages=[{"role": "user", "content": user_message}],
    ) as stream:
        char_count = 0
        for text in stream.text_stream:
            collected_text.append(text)
            char_count += len(text)
            estimated_progress = min(0.95, char_count / 2000)
            if on_progress:
                on_progress(estimated_progress, text)
        final_message = stream.get_final_message()
        input_tokens = final_message.usage.input_tokens
        output_tokens = final_message.usage.output_tokens

    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    return {
        "content": "".join(collected_text),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "duration_s": round(duration, 1),
    }


def _run_with_deepseek(
    config: dict, user_message: str, model: str, api_key: str, on_progress
) -> dict:
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    start_time = datetime.now(timezone.utc)
    collected_text = []
    output_tokens = 0

    stream = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": config["system"]},
            {"role": "user", "content": user_message},
        ],
        stream=True,
        stream_options={"include_usage": True},
        max_tokens=4096,
    )
    char_count = 0
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            text = chunk.choices[0].delta.content
            collected_text.append(text)
            char_count += len(text)
            estimated_progress = min(0.95, char_count / 2000)
            if on_progress:
                on_progress(estimated_progress, text)
        if hasattr(chunk, "usage") and chunk.usage:
            output_tokens = chunk.usage.completion_tokens or 0

    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    return {
        "content": "".join(collected_text),
        "input_tokens": 0,
        "output_tokens": output_tokens,
        "duration_s": round(duration, 1),
    }


def _run_with_kimi(
    config: dict, user_message: str, model: str, api_key: str, on_progress
) -> dict:
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url="https://api.moonshot.cn/v1")
    start_time = datetime.now(timezone.utc)
    collected_text = []
    output_tokens = 0

    stream = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": config["system"]},
            {"role": "user", "content": user_message},
        ],
        stream=True,
        stream_options={"include_usage": True},
        max_tokens=4096,
    )
    char_count = 0
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            text = chunk.choices[0].delta.content
            collected_text.append(text)
            char_count += len(text)
            estimated_progress = min(0.95, char_count / 2000)
            if on_progress:
                on_progress(estimated_progress, text)
        if hasattr(chunk, "usage") and chunk.usage:
            output_tokens = chunk.usage.completion_tokens or 0

    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    return {
        "content": "".join(collected_text),
        "input_tokens": 0,
        "output_tokens": output_tokens,
        "duration_s": round(duration, 1),
    }


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
        {"content": "<markdown>", "input_tokens": int, "output_tokens": int, "duration_s": float}
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

    llm_cfg = _read_llm_config()
    model = llm_cfg["model"]
    logger.info(f"[{agent_type}] Starting generation with model {model}")

    if model.startswith("moonshot"):
        kimi_key = llm_cfg["kimi_key"]
        if not kimi_key:
            raise ValueError("Kimi API Key 未配置，请在平台配置中心设置")
        result = _run_with_kimi(config, user_message, model, kimi_key, on_progress)
    elif model.startswith("deepseek"):
        deepseek_key = llm_cfg["deepseek_key"]
        if not deepseek_key:
            raise ValueError("DeepSeek API Key 未配置，请在平台配置中心设置")
        result = _run_with_deepseek(config, user_message, model, deepseek_key, on_progress)
    else:
        anthropic_key = llm_cfg["anthropic_key"]
        if not anthropic_key:
            raise ValueError("Anthropic API Key 未配置，请在平台配置中心设置")
        result = _run_with_anthropic(config, user_message, model, anthropic_key, on_progress)

    logger.info(
        f"[{agent_type}] Done: {result['output_tokens']} output tokens, {result['duration_s']}s"
    )
    return result
