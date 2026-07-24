from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..database import get_sessions, get_session, create_session, update_session_title, delete_session, delete_messages_after

router = APIRouter()


class UpdateTitleRequest(BaseModel):
    title: str


@router.get("/sessions")
async def list_sessions():
    return {"sessions": get_sessions()}


@router.post("/sessions")
async def new_session():
    session = create_session()
    return session


@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "会话不存在")
    return session


@router.put("/sessions/{session_id}/title")
async def rename_session(session_id: str, body: UpdateTitleRequest):
    existing = get_session(session_id)
    if not existing:
        raise HTTPException(404, "会话不存在")
    update_session_title(session_id, body.title)
    return {"success": True}


class ResetRequest(BaseModel):
    messageId: str


@router.post("/sessions/{session_id}/reset")
async def reset_session(session_id: str, body: ResetRequest):
    existing = get_session(session_id)
    if not existing:
        raise HTTPException(404, "会话不存在")
    delete_messages_after(session_id, body.messageId)
    return get_session(session_id)


@router.delete("/sessions/{session_id}")
async def remove_session(session_id: str):
    existing = get_session(session_id)
    if not existing:
        raise HTTPException(404, "会话不存在")
    delete_session(session_id)
    return {"success": True}
