import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from ..config import DASHSCOPE_MODEL, DASHSCOPE_VISION_MODEL
from ..database import get_session, add_message, create_session, update_session_title, get_sessions
from ..services.ai_service import chat_with_search

router = APIRouter()


class ChatRequest(BaseModel):
    sessionId: str | None = None
    message: str
    imageUrl: str | None = None
    stream: bool = True
    useSearch: bool = True


class ChatResponse(BaseModel):
    sessionId: str
    messageId: str
    content: str


def _build_user_content(message: str, image_url: str | None) -> str | list:
    if not image_url:
        return message or "你好"
    content: list = []
    text = message.strip() or "请分析这张图片"
    content.append({"type": "text", "text": text})
    content.append({"type": "image_url", "image_url": {"url": image_url}})
    return content


def _display_text(message: str, image_url: str | None) -> str:
    if message.strip():
        return message
    if image_url:
        return "[图片]"
    return message


@router.post("/chat")
async def chat(req: ChatRequest):
    session_id = req.sessionId
    display_msg = _display_text(req.message, req.imageUrl)
    title_text = display_msg[:30] if len(display_msg) > 30 else display_msg

    if not session_id:
        session = create_session(title_text)
        session_id = session["id"]
    else:
        existing = get_session(session_id)
        if not existing:
            raise HTTPException(404, "会话不存在")
        if existing["messages"] and len(existing["messages"]) == 1:
            update_session_title(session_id, title_text)

    add_message(session_id, "user", display_msg, req.imageUrl)

    session = get_session(session_id)
    history = []
    for m in session["messages"][:-1]:
        history.append({"role": m["role"], "content": m["content"]})

    has_image = bool(req.imageUrl)
    model = DASHSCOPE_VISION_MODEL if has_image else DASHSCOPE_MODEL

    user_content = _build_user_content(req.message, req.imageUrl)
    messages = history + [{"role": "user", "content": user_content}]
    search_text = req.message or display_msg

    if req.stream:
        stream_resp = await chat_with_search(messages, search_text, model=model, stream=True)

        async def generate():
            full_content = ""
            async for chunk in stream_resp:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_content += content
                    yield f"data: {json.dumps({'content': content, 'sessionId': session_id}, ensure_ascii=False)}\n\n"
            add_message(session_id, "assistant", full_content)
            yield f"data: {json.dumps({'done': True, 'sessionId': session_id}, ensure_ascii=False)}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    content = await chat_with_search(messages, search_text, model=model, stream=False)
    msg = add_message(session_id, "assistant", content)
    return {"sessionId": session_id, "messageId": msg["id"], "content": content}
