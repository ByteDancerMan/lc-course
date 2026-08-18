import logging
from collections.abc import AsyncIterator
from typing import Any

from openai import AsyncOpenAI
from ..config import (
    DASHSCOPE_API_KEY,
    DASHSCOPE_BASE_URL,
    DASHSCOPE_FALLBACK_MODELS,
    DASHSCOPE_MODEL,
    DASHSCOPE_VISION_FALLBACK_MODELS,
    DASHSCOPE_VISION_MODEL,
    TAVILY_API_KEY,
)
from .search_service import web_search
from .knowledge_service import search_knowledge

logger = logging.getLogger(__name__)


# AI 系统提示词，定义助手的行为
SYSTEM_PROMPT = """你是一个智能AI助手，帮助用户解答各种问题。
你需要根据用户的问题和对话历史给出准确、有用的回答。

当用户的问题需要最新信息时，你可以使用搜索工具查找相关资料。
回答请使用中文，清晰有条理。

如果用户上传了图片，请根据图片内容进行回答。"""


def _get_client() -> AsyncOpenAI | None:
    # 创建 DashScope 兼容的 OpenAI 客户端
    if not DASHSCOPE_API_KEY:
        return None
    return AsyncOpenAI(api_key=DASHSCOPE_API_KEY, base_url=DASHSCOPE_BASE_URL)


def _resolve_model_chain(model: str | None) -> list[str]:
    primary_model = model or DASHSCOPE_MODEL
    if primary_model == DASHSCOPE_VISION_MODEL:
        fallbacks = DASHSCOPE_VISION_FALLBACK_MODELS
    else:
        fallbacks = DASHSCOPE_FALLBACK_MODELS

    chain: list[str] = []
    for candidate in [primary_model, *fallbacks]:
        if candidate and candidate not in chain:
            chain.append(candidate)
    return chain


async def _create_chat_completion(
    client: AsyncOpenAI,
    messages: list[dict[str, Any]],
    model: str,
    stream: bool,
    **kwargs: Any,
) -> Any:
    return await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=stream,
        **kwargs,
    )


async def _chat_completion_with_fallback(
    client: AsyncOpenAI,
    messages: list[dict[str, Any]],
    model: str | None,
    stream: bool,
    **kwargs: Any,
) -> tuple[str, Any]:
    model_chain = _resolve_model_chain(model)
    last_error: Exception | None = None

    for index, candidate in enumerate(model_chain):
        try:
            response = await _create_chat_completion(
                client=client,
                messages=messages,
                model=candidate,
                stream=stream,
                **kwargs,
            )
            if index > 0:
                logger.warning("模型回退成功 | from=%s to=%s", model_chain[0], candidate)
            return candidate, response
        except Exception as exc:
            last_error = exc
            is_last = index == len(model_chain) - 1
            logger.warning(
                "模型调用失败%s | model=%s error=%s",
                "，准备尝试备用模型" if not is_last else "",
                candidate,
                exc,
                exc_info=True,
            )

    assert last_error is not None
    raise last_error


async def _stream_with_fallback(
    client: AsyncOpenAI,
    messages: list[dict[str, Any]],
    model: str | None,
    **kwargs: Any,
) -> AsyncIterator[Any]:
    model_chain = _resolve_model_chain(model)
    last_error: Exception | None = None

    for index, candidate in enumerate(model_chain):
        emitted = False
        try:
            stream_resp = await _create_chat_completion(
                client=client,
                messages=messages,
                model=candidate,
                stream=True,
                **kwargs,
            )
            if index > 0:
                logger.warning("流式模型回退成功 | from=%s to=%s", model_chain[0], candidate)

            async for chunk in stream_resp:
                emitted = True
                yield chunk
            return
        except Exception as exc:
            last_error = exc
            is_last = index == len(model_chain) - 1
            if emitted:
                logger.error("流式响应中断 | model=%s error=%s", candidate, exc, exc_info=True)
                raise
            logger.warning(
                "流式模型调用失败%s | model=%s error=%s",
                "，准备尝试备用模型" if not is_last else "",
                candidate,
                exc,
                exc_info=True,
            )

    assert last_error is not None
    raise last_error


async def chat_completion(
    messages: list[dict],
    model: str | None = None,
    stream: bool = False,
) -> str | AsyncIterator[Any]:
    # 基础 AI 对话接口，不包含搜索增强
    client = _get_client()
    if not client:
        fallback = "AI服务未配置，请在.env中设置DASHSCOPE_API_KEY。"
        return fallback

    system_msg = {"role": "system", "content": SYSTEM_PROMPT}
    full_messages = [system_msg] + messages

    if stream:
        return _stream_with_fallback(
            client=client,
            messages=full_messages,
            model=model,
            temperature=0.7,
        )

    resolved_model, resp = await _chat_completion_with_fallback(
        client=client,
        messages=full_messages,
        model=model,
        stream=False,
        temperature=0.7,
    )
    logger.info("AI API 响应完成 | model=%s", resolved_model)
    return resp.choices[0].message.content or ""


def _extract_text(msg: dict) -> str:
    # 从消息中提取纯文本（兼容 OpenAI 多模态格式）
    content = msg.get("content", "")
    if isinstance(content, list):
        parts = [p for p in content if isinstance(p, dict) and p.get("type") == "text"]
        return " ".join(p["text"] for p in parts if p.get("text"))
    return content if isinstance(content, str) else str(content)


async def chat_with_search(
    messages: list[dict],
    user_message: str,
    model: str | None = None,
    stream: bool = False,
) -> str | AsyncIterator[Any]:
    # 带搜索增强的 AI 对话接口
    # 1. 提取用户问题中的纯文本
    search_text = _extract_text({"content": user_message}) if isinstance(user_message, str) else user_message

    # 2. 如果配置了 Tavily 搜索密钥，执行网络搜索
    search_context = ""
    if TAVILY_API_KEY and search_text.strip():
        logger.info("执行网络搜索 | query=%s", search_text[:50])
        search_results = await web_search(search_text)
        if search_results:
            logger.info("搜索结果 | count=%d", len(search_results))
            # 将搜索结果拼接到系统提示词中，要求 AI 参考这些信息回答
            search_context = "以下是搜索结果，请参考这些信息来回答用户问题：\n\n"
            for i, r in enumerate(search_results, 1):
                search_context += f"{i}. [{r['title']}]({r['url']})\n"
            search_context += "\n请结合搜索结果和你的知识来回答。引用来源时请使用内联 markdown 链接格式：[来源名称](链接地址)。"
        else:
            logger.info("搜索无结果 | query=%s", search_text[:50])
    elif not TAVILY_API_KEY:
        logger.info("未配置搜索密钥，跳过搜索")

    # 3. 从知识库检索相关内容
    knowledge_context = await search_knowledge(search_text)
    if knowledge_context:
        if search_context:
            search_context += "\n\n" + knowledge_context
        else:
            search_context = knowledge_context

    # 4. 发送请求到 AI 模型
    client = _get_client()
    if not client:
        logger.error("AI 服务未配置，请设置 DASHSCOPE_API_KEY")
        return "AI服务未配置。"

    logger.info(
        "AI API 请求 | model=%s stream=%s messages=%d search=%s",
        model or DASHSCOPE_MODEL,
        stream,
        len(messages),
        bool(search_context),
    )

    system_msg = {"role": "system", "content": SYSTEM_PROMPT + ("\n\n" + search_context if search_context else "")}
    full_messages = [system_msg] + messages

    if stream:
        return _stream_with_fallback(
            client=client,
            messages=full_messages,
            model=model,
            temperature=0.7,
            max_tokens=4096,
        )

    resolved_model, resp = await _chat_completion_with_fallback(
        client=client,
        messages=full_messages,
        model=model,
        stream=False,
        temperature=0.7,
        max_tokens=4096,
    )
    result = resp.choices[0].message.content or ""
    logger.info("AI API 响应完成 | model=%s len=%d", resolved_model, len(result))
    return result
