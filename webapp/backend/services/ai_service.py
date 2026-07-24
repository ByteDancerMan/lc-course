from openai import AsyncOpenAI
from ..config import DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL, DASHSCOPE_MODEL, TAVILY_API_KEY
from .search_service import web_search


SYSTEM_PROMPT = """你是一个智能AI助手，帮助用户解答各种问题。
你需要根据用户的问题和对话历史给出准确、有用的回答。

当用户的问题需要最新信息时，你可以使用搜索工具查找相关资料。
回答请使用中文，清晰有条理。

如果用户上传了图片，请根据图片内容进行回答。"""


def _get_client() -> AsyncOpenAI | None:
    if not DASHSCOPE_API_KEY:
        return None
    return AsyncOpenAI(api_key=DASHSCOPE_API_KEY, base_url=DASHSCOPE_BASE_URL)


async def chat_completion(
    messages: list[dict],
    model: str | None = None,
    stream: bool = False,
) -> str | AsyncOpenAI:
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
    search_text = _extract_text({"content": user_message}) if isinstance(user_message, str) else user_message

    if TAVILY_API_KEY and search_text.strip():
        search_results = await web_search(search_text)
        if search_results:
            search_context = "以下是搜索结果，请参考这些信息来回答用户问题：\n\n"
            for i, r in enumerate(search_results, 1):
                search_context += f"{i}. {r['title']}\n   链接: {r['url']}\n"
            search_context += "\n请结合搜索结果和你的知识来回答。在回答中适当引用来源。"
        else:
            search_context = ""
    else:
        search_context = ""

    client = _get_client()
    if not client:
        return "AI服务未配置。"

    system_msg = {"role": "system", "content": SYSTEM_PROMPT + ("\n\n" + search_context if search_context else "")}
    full_messages = [system_msg] + messages

    if stream:
        return await client.chat.completions.create(
            model=model or DASHSCOPE_MODEL,
            messages=full_messages,
            stream=True,
            temperature=0.7,
            max_tokens=4096,
        )

    resp = await client.chat.completions.create(
        model=model or DASHSCOPE_MODEL,
        messages=full_messages,
        stream=False,
        temperature=0.7,
        max_tokens=4096,
    )
    return resp.choices[0].message.content or ""
