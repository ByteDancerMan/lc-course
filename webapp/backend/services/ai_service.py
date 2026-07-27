import logging
from openai import AsyncOpenAI
from ..config import DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL, DASHSCOPE_MODEL, TAVILY_API_KEY
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


async def chat_completion(
    messages: list[dict],
    model: str | None = None,
    stream: bool = False,
) -> str | AsyncOpenAI:
    # 基础 AI 对话接口，不包含搜索增强
    client = _get_client()
    if not client:
        fallback = "AI服务未配置，请在.env中设置DASHSCOPE_API_KEY。"
        return fallback

    system_msg = {"role": "system", "content": SYSTEM_PROMPT}
    full_messages = [system_msg] + messages

    if stream:
        return await client.chat.completions.create(
            model=model or DASHSCOPE_MODEL,
            messages=full_messages,
            stream=True,
            temperature=0.7,
        )

    resp = await client.chat.completions.create(
        model=model or DASHSCOPE_MODEL,
        messages=full_messages,
        stream=False,
        temperature=0.7,
    )
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
) -> str | AsyncOpenAI:
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

    logger.info("AI API 请求 | model=%s stream=%s messages=%d search=%s",
                model or DASHSCOPE_MODEL, stream, len(messages), bool(search_context))

    system_msg = {"role": "system", "content": SYSTEM_PROMPT + ("\n\n" + search_context if search_context else "")}
    full_messages = [system_msg] + messages

    if stream:
        # 流式返回：逐 token 输出
        return await client.chat.completions.create(
            model=model or DASHSCOPE_MODEL,
            messages=full_messages,
            stream=True,
            temperature=0.7,
            max_tokens=4096,
        )

    # 非流式返回：等待完整回复
    resp = await client.chat.completions.create(
        model=model or DASHSCOPE_MODEL,
        messages=full_messages,
        stream=False,
        temperature=0.7,
        max_tokens=4096,
    )
    result = resp.choices[0].message.content or ""
    logger.info("AI API 响应完成 | len=%d", len(result))
    return result
