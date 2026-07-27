import httpx
from ..config import TAVILY_API_KEY


async def web_search(query: str, max_results: int = 5) -> list[dict[str, str]]:
    # 调用 Tavily 搜索 API 获取网络搜索结果
    # 返回标题和 URL 列表，供 AI 参考
    if not TAVILY_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={"api_key": TAVILY_API_KEY, "query": query, "max_results": max_results, "topic": "general"},
            )
            if resp.is_success:
                data = resp.json()
                return [
                    {"title": r.get("title", ""), "url": r.get("url", "")}
                    for r in data.get("results", []) if r.get("title") and r.get("url")
                ]
    except Exception:
        pass
    return []
