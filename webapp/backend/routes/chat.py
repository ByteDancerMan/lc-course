import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from ..config import DASHSCOPE_MODEL, DASHSCOPE_VISION_MODEL

logger = logging.getLogger(__name__)
from ..database import get_session, add_message, create_session, update_session_title, get_sessions, delete_last_assistant_message, delete_messages_after
from ..services.ai_service import chat_with_search

router = APIRouter()


# 请求体：发送聊天消息
class ChatRequest(BaseModel):
    sessionId: str | None = None
    message: str
    imageUrl: str | None = None
    stream: bool = True
    useSearch: bool = True


# 响应体：非流式返回
class ChatResponse(BaseModel):
    sessionId: str
    messageId: str
    content: str


def _build_user_content(message: str, image_url: str | None) -> str | list:
    # 构建发送给 AI 的用户消息内容
    # 如果没有图片，直接返回纯文本；否则返回多模态内容（文本+图片）
    if not image_url:
        return message or "你好"
    content: list = []
    text = message.strip() or "请分析这张图片"
    content.append({"type": "text", "text": text})
    content.append({"type": "image_url", "image_url": {"url": image_url}})
    return content


def _display_text(message: str, image_url: str | None) -> str:
    # 获取展示用的文本（用于会话标题和数据库存储）
    # 只有图片时显示为"[图片]"
    if message.strip():
        return message
    if image_url:
        return "[图片]"
    return message


@router.post("/chat")
async def chat(req: ChatRequest):
    # 核心聊天接口：接收用户消息，调用 AI，返回流式或非流式响应
    session_id = req.sessionId
    display_msg = _display_text(req.message, req.imageUrl)
    title_text = display_msg[:30] if len(display_msg) > 30 else display_msg

    logger.info("收到用户消息 | session=%s message=%s", session_id or "新建", display_msg[:50])

    # 如果没有 sessionId 则创建新会话，否则校验会话是否存在
    if not session_id:
        session = create_session(title_text)
        session_id = session["id"]
        logger.info("创建新会话 | session=%s title=%s", session_id, title_text)
    else:
        existing = get_session(session_id)
        if not existing:
            raise HTTPException(404, "会话不存在")
        # 如果会话只有一条消息（系统欢迎语），用当前消息更新标题
        if existing["messages"] and len(existing["messages"]) == 1:
            update_session_title(session_id, title_text)

    # 将用户消息保存到数据库
    add_message(session_id, "user", display_msg, req.imageUrl)

    # 构造对话历史（排除最后一条刚保存的用户消息，AI 后续会处理）
    session = get_session(session_id)
    history = []
    for m in session["messages"][:-1]:
        history.append({"role": m["role"], "content": m["content"]})

    # 根据是否包含图片选择模型
    has_image = bool(req.imageUrl)
    model = DASHSCOPE_VISION_MODEL if has_image else DASHSCOPE_MODEL

    user_content = _build_user_content(req.message, req.imageUrl)
    messages = history + [{"role": "user", "content": user_content}]
    search_text = req.message or display_msg

    logger.info("调用 AI 模型 | session=%s model=%s history_len=%d", session_id, model, len(history))

    if req.stream:
        # 流式返回：逐 token 推送 SSE 事件
        stream_resp = await chat_with_search(messages, search_text, model=model, stream=True)

        async def generate():
            full_content = ""
            token_count = 0
            async for chunk in stream_resp:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_content += content
                    token_count += 1
                    yield f"data: {json.dumps({'content': content, 'sessionId': session_id}, ensure_ascii=False)}\n\n"
            # 流结束后将完整 AI 回复保存到数据库
            add_message(session_id, "assistant", full_content)
            logger.info("AI 流式回复完成 | session=%s tokens=%d len=%d", session_id, token_count, len(full_content))
            yield f"data: {json.dumps({'done': True, 'sessionId': session_id}, ensure_ascii=False)}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    # 非流式返回
    content = await chat_with_search(messages, search_text, model=model, stream=False)
    msg = add_message(session_id, "assistant", content)
    logger.info("AI 非流式回复完成 | session=%s len=%d", session_id, len(content))
    return {"sessionId": session_id, "messageId": msg["id"], "content": content}


# 请求体：重新生成消息
class RegenerateRequest(BaseModel):
    sessionId: str
    messageId: str | None = None  # 指定从哪条 AI 回复开始重新生成
    useSearch: bool = True


@router.post("/chat/regenerate")
async def regenerate(req: RegenerateRequest):
    # 重新生成接口
    logger.info("重新生成请求 | session=%s messageId=%s", req.sessionId, req.messageId)
    session = get_session(req.sessionId)
    if not session:
        raise HTTPException(404, "会话不存在")

    # 如果指定了 messageId，删除该消息（含）及之后的所有消息
    if req.messageId:
        found = delete_messages_after(req.sessionId, req.messageId, inclusive=True)
        if not found:
            logger.warning("messageId 未找到，降级为删除最后一条 AI 回复 | session=%s", req.sessionId)
            delete_last_assistant_message(req.sessionId)
        else:
            logger.info("已删除消息及之后内容 | session=%s messageId=%s", req.sessionId, req.messageId)
    else:
        # 向后兼容：只删除最后一条 AI 回复
        delete_last_assistant_message(req.sessionId)

    # 重新获取会话，找到最后一条用户消息作为生成依据
    updated = get_session(req.sessionId)
    msgs = updated["messages"]
    if not msgs or msgs[-1]["role"] != "user":
        raise HTTPException(400, "没有可重新生成的用户消息")

    last_user = msgs[-1]

    # 构造历史（不含最后一条用户消息，然后手动加上，和 /chat 接口一致）
    history = [{"role": m["role"], "content": m["content"]} for m in msgs[:-1]]
    has_image = bool(last_user.get("imageUrl"))
    model = DASHSCOPE_VISION_MODEL if has_image else DASHSCOPE_MODEL
    search_text = last_user["content"]
    messages = history + [{"role": "user", "content": last_user["content"]}]

    logger.info("重新生成调用 AI | session=%s model=%s history_len=%d", req.sessionId, model, len(history))
    stream_resp = await chat_with_search(messages, search_text, model=model, stream=True)

    async def generate():
        full_content = ""
        async for chunk in stream_resp:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_content += content
                yield f"data: {json.dumps({'content': content, 'sessionId': req.sessionId}, ensure_ascii=False)}\n\n"
        add_message(req.sessionId, "assistant", full_content)
        logger.info("重新生成回复完成 | session=%s len=%d", req.sessionId, len(full_content))
        yield f"data: {json.dumps({'done': True, 'sessionId': req.sessionId}, ensure_ascii=False)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
