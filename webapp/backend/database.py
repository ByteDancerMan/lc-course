import logging
from pathlib import Path
from typing import Any
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker, Session

from .config import DB_PATH
from .models import Base, SessionModel, MessageModel, now_beijing

logger = logging.getLogger(__name__)

# 创建数据库引擎和会话工厂
Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
SessionLocal = sessionmaker(bind=engine)


def get_db() -> Session:
    # 获取一个数据库会话实例
    return SessionLocal()


def init_db():
    # 根据模型定义创建所有数据库表（幂等操作）
    Base.metadata.create_all(engine)
    logger.info("数据库表初始化完成")


def create_session(title: str = "新对话") -> dict[str, Any]:
    # 创建新会话，返回会话摘要信息
    db = get_db()
    now = now_beijing()
    session = SessionModel(title=title, created_at=now, updated_at=now)
    db.add(session)
    db.commit()
    result = {"id": session.id, "title": session.title, "createdAt": session.created_at, "updatedAt": session.updated_at}
    db.close()
    logger.debug("创建会话 | session=%s title=%s", session.id, title)
    return result


def update_session_title(session_id: str, title: str):
    # 更新会话标题
    db = get_db()
    db.query(SessionModel).filter(SessionModel.id == session_id).update(
        {"title": title, "updated_at": now_beijing()}
    )
    db.commit()
    db.close()
    logger.debug("更新会话标题 | session=%s title=%s", session_id, title)


def delete_session(session_id: str):
    # 删除会话及其所有消息（级联删除）
    db = get_db()
    db.query(SessionModel).filter(SessionModel.id == session_id).delete()
    db.commit()
    db.close()
    logger.debug("删除会话 | session=%s", session_id)


def get_sessions() -> list[dict[str, Any]]:
    # 查询所有会话列表，按更新时间倒序，附带最后一条消息的预览
    db = get_db()
    # 子查询：获取每个会话的最新一条消息内容
    last_msg_subq = (
        select(MessageModel.content)
        .where(MessageModel.session_id == SessionModel.id)
        .order_by(MessageModel.created_at.desc())
        .limit(1)
        .correlate(SessionModel)
        .scalar_subquery()
    )
    rows = (
        db.query(
            SessionModel.id,
            SessionModel.title,
            SessionModel.created_at,
            SessionModel.updated_at,
            func.coalesce(last_msg_subq, "").label("last_message"),
        )
        .order_by(SessionModel.updated_at.desc())
        .all()
    )
    db.close()
    result = [
        {
            "id": r.id,
            "title": r.title,
            "createdAt": r.created_at,
            "updatedAt": r.updated_at,
            "lastMessage": r.last_message,
        }
        for r in rows
    ]
    logger.debug("查询会话列表 | count=%d", len(result))
    return result


def get_session(session_id: str) -> dict[str, Any] | None:
    # 查询单个会话详情（包含所有消息）
    db = get_db()
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        db.close()
        return None
    messages = [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "imageUrl": m.image_url,
            "createdAt": m.created_at,
        }
        for m in session.messages
    ]
    db.close()
    return {
        "id": session.id,
        "title": session.title,
        "createdAt": session.created_at,
        "updatedAt": session.updated_at,
        "messages": messages,
    }


def delete_messages_after(session_id: str, message_id: str, inclusive: bool = False) -> bool:
    # 删除指定消息之后（或包括自身）的所有消息，返回是否找到并删除了消息
    db = get_db()
    msg = db.query(MessageModel).filter(
        MessageModel.id == message_id,
        MessageModel.session_id == session_id
    ).first()
    if not msg:
        logger.warning("要删除的消息不存在 | session=%s messageId=%s", session_id, message_id)
        db.close()
        return False
    deleted = db.query(MessageModel).filter(
        MessageModel.session_id == session_id,
        MessageModel.created_at >= msg.created_at if inclusive else MessageModel.created_at > msg.created_at
    ).delete()
    db.query(SessionModel).filter(SessionModel.id == session_id).update({"updated_at": now_beijing()})
    db.commit()
    db.close()
    logger.debug("批量删除消息 | session=%s inclusive=%s deleted=%d", session_id, inclusive, deleted)
    return True


def delete_last_assistant_message(session_id: str):
    # 删除会话中最后一条 AI 回复
    db = get_db()
    last = (
        db.query(MessageModel)
        .filter(MessageModel.session_id == session_id, MessageModel.role == "assistant")
        .order_by(MessageModel.created_at.desc())
        .first()
    )
    if last:
        db.delete(last)
        db.commit()
        logger.debug("删除最后一条 AI 回复 | session=%s messageId=%s", session_id, last.id)
    db.close()


def add_message(session_id: str, role: str, content: str, image_url: str | None = None) -> dict[str, Any]:
    # 向会话中添加一条消息，同时更新会话的更新时间
    db = get_db()
    now = now_beijing()
    msg = MessageModel(session_id=session_id, role=role, content=content, image_url=image_url, created_at=now)
    db.add(msg)
    db.query(SessionModel).filter(SessionModel.id == session_id).update({"updated_at": now})
    db.commit()
    result = {"id": msg.id, "role": msg.role, "content": msg.content, "imageUrl": msg.image_url, "createdAt": msg.created_at}
    db.close()
    logger.debug("添加消息 | session=%s role=%s id=%s", session_id, role, msg.id)
    return result
