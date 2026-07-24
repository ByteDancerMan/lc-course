from pathlib import Path
from typing import Any
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker, Session

from .config import DB_PATH
from .models import Base, SessionModel, MessageModel, now_beijing

Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(f"sqlite:///{DB_PATH}", echo=True)
SessionLocal = sessionmaker(bind=engine)


def get_db() -> Session:
    return SessionLocal()


def init_db():
    Base.metadata.create_all(engine)


def create_session(title: str = "新对话") -> dict[str, Any]:
    db = get_db()
    now = now_beijing()
    session = SessionModel(title=title, created_at=now, updated_at=now)
    db.add(session)
    db.commit()
    result = {"id": session.id, "title": session.title, "createdAt": session.created_at, "updatedAt": session.updated_at}
    db.close()
    return result


def update_session_title(session_id: str, title: str):
    db = get_db()
    db.query(SessionModel).filter(SessionModel.id == session_id).update(
        {"title": title, "updated_at": now_beijing()}
    )
    db.commit()
    db.close()


def delete_session(session_id: str):
    db = get_db()
    db.query(SessionModel).filter(SessionModel.id == session_id).delete()
    db.commit()
    db.close()


def get_sessions() -> list[dict[str, Any]]:
    db = get_db()
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
    return [
        {
            "id": r.id,
            "title": r.title,
            "createdAt": r.created_at,
            "updatedAt": r.updated_at,
            "lastMessage": r.last_message,
        }
        for r in rows
    ]


def get_session(session_id: str) -> dict[str, Any] | None:
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


def delete_messages_after(session_id: str, message_id: str):
    db = get_db()
    msg = db.query(MessageModel).filter(
        MessageModel.id == message_id,
        MessageModel.session_id == session_id
    ).first()
    if not msg:
        db.close()
        return
    db.query(MessageModel).filter(
        MessageModel.session_id == session_id,
        MessageModel.created_at > msg.created_at
    ).delete()
    db.query(SessionModel).filter(SessionModel.id == session_id).update({"updated_at": now_beijing()})
    db.commit()
    db.close()


def delete_last_assistant_message(session_id: str):
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
    db.close()


def add_message(session_id: str, role: str, content: str, image_url: str | None = None) -> dict[str, Any]:
    db = get_db()
    now = now_beijing()
    msg = MessageModel(session_id=session_id, role=role, content=content, image_url=image_url, created_at=now)
    db.add(msg)
    db.query(SessionModel).filter(SessionModel.id == session_id).update({"updated_at": now})
    db.commit()
    result = {"id": msg.id, "role": msg.role, "content": msg.content, "imageUrl": msg.image_url, "createdAt": msg.created_at}
    db.close()
    return result
