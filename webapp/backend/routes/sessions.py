import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..database import get_sessions, get_session, create_session, update_session_title, delete_session, delete_messages_after

logger = logging.getLogger(__name__)

router = APIRouter()


class UpdateTitleRequest(BaseModel):
    title: str


@router.get("/sessions")
async def list_sessions():
    # 获取所有会话列表（侧边栏展示用）
    sessions = get_sessions()
    logger.info("查询会话列表 | count=%d", len(sessions))
    return {"sessions": sessions}


@router.post("/sessions")
async def new_session():
    # 创建新的空会话
    session = create_session()
    logger.info("创建新会话 | session=%s", session["id"])
    return session


@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: str):
    # 获取单个会话详情（包含所有消息）
    session = get_session(session_id)
    if not session:
        logger.warning("会话不存在 | session=%s", session_id)
        raise HTTPException(404, "会话不存在")
    logger.info("查询会话详情 | session=%s messages=%d", session_id, len(session["messages"]))
    return session


@router.put("/sessions/{session_id}/title")
async def rename_session(session_id: str, body: UpdateTitleRequest):
    # 修改会话标题
    existing = get_session(session_id)
    if not existing:
        raise HTTPException(404, "会话不存在")
    update_session_title(session_id, body.title)
    logger.info("更新会话标题 | session=%s title=%s", session_id, body.title)
    return {"success": True}


class ResetRequest(BaseModel):
    messageId: str


@router.post("/sessions/{session_id}/reset")
async def reset_session(session_id: str, body: ResetRequest):
    # "重置到此处"：删除指定消息之后的所有消息，回退到历史节点
    existing = get_session(session_id)
    if not existing:
        raise HTTPException(404, "会话不存在")
    delete_messages_after(session_id, body.messageId)
    logger.info("重置到此处 | session=%s messageId=%s", session_id, body.messageId)
    return get_session(session_id)


@router.delete("/sessions/{session_id}")
async def remove_session(session_id: str):
    # 删除整个会话
    existing = get_session(session_id)
    if not existing:
        raise HTTPException(404, "会话不存在")
    delete_session(session_id)
    logger.info("删除会话 | session=%s", session_id)
    return {"success": True}
