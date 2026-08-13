import logging
from pathlib import Path
from typing import Any
import sqlite_vec
from sqlalchemy import create_engine, event, func, select, text
from sqlalchemy.orm import sessionmaker, Session

from .config import DB_PATH
from .models import Base, SessionModel, MessageModel, DocumentModel, ChunkModel, now_beijing

logger = logging.getLogger(__name__)

# 创建数据库引擎和会话工厂
Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
SessionLocal = sessionmaker(bind=engine)

# vec0 虚拟表的维度，首次创建时确定，后续所有向量必须一致
_VEC_DIM: int | None = None


def _get_vec_dim() -> int:
    """获取向量维度（首次调用时从已有数据推断或使用配置默认值）"""
    global _VEC_DIM
    if _VEC_DIM is not None:
        return _VEC_DIM
    from .config import EMBEDDING_DIM
    _VEC_DIM = EMBEDDING_DIM
    return _VEC_DIM


@event.listens_for(engine, "connect")
def _on_connect(dbapi_conn, _):
    # SQLite 默认不启用外键约束，这里在每个连接建立时显式开启
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
    # 加载 sqlite-vec 扩展
    conn = dbapi_conn
    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)
    # 确保 vec_chunks 虚拟表存在
    dim = _get_vec_dim()
    conn.execute(
        f"CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING "
        f"vec0(chunk_id TEXT PRIMARY KEY, embedding float[{dim}])"
    )


def get_db() -> Session:
    # 获取一个数据库会话实例
    return SessionLocal()


def init_db():
    # 根据模型定义创建所有数据库表（幂等操作）
    Base.metadata.create_all(engine)
    # 迁移：将 chunks 表中已有的 embedding 列数据导入 vec_chunks 虚拟表
    _migrate_embeddings_to_vec()
    logger.info("数据库表初始化完成")


def _migrate_embeddings_to_vec():
    """一次性迁移：把 chunks.embedding 列的旧数据写入 vec_chunks 虚拟表"""
    db = get_db()
    try:
        count = db.execute(text("SELECT COUNT(*) FROM vec_chunks")).scalar()
        if count and count > 0:
            db.close()
            return  # vec_chunks 已有数据，无需迁移
        rows = db.execute(text("SELECT id, embedding FROM chunks WHERE embedding IS NOT NULL")).fetchall()
        if not rows:
            db.close()
            return
        dim = _get_vec_dim()
        for chunk_id, raw_emb in rows:
            import struct
            floats = struct.unpack(f"{dim}f", raw_emb)
            vec_raw = sqlite_vec.serialize_float32(list(floats[:dim]))
            db.execute(text("INSERT INTO vec_chunks (chunk_id, embedding) VALUES (:cid, :emb)"), {"cid": chunk_id, "emb": vec_raw})
        db.commit()
        logger.info("旧 embedding 数据迁移到 vec_chunks 完成 | count=%d", len(rows))
    except Exception as e:
        logger.warning("embedding 迁移跳过（可能 vec_chunks 表不存在）: %s", e)
    finally:
        db.close()


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


def create_document(filename: str, file_type: str, chunk_count: int = 0) -> dict[str, Any]:
    db = get_db()
    now = now_beijing()
    doc = DocumentModel(filename=filename, file_type=file_type, chunk_count=chunk_count, created_at=now)
    db.add(doc)
    db.commit()
    result = {"id": doc.id, "filename": doc.filename, "fileType": doc.file_type, "chunkCount": doc.chunk_count, "createdAt": doc.created_at}
    db.close()
    logger.info("创建文档记录 | id=%s filename=%s", doc.id, filename)
    return result


def get_documents() -> list[dict[str, Any]]:
    db = get_db()
    rows = db.query(DocumentModel).order_by(DocumentModel.created_at.desc()).all()
    db.close()
    return [
        {"id": r.id, "filename": r.filename, "fileType": r.file_type, "chunkCount": r.chunk_count, "createdAt": r.created_at}
        for r in rows
    ]


def delete_document(doc_id: str) -> bool:
    db = get_db()
    doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
    if not doc:
        db.close()
        return False
    db.delete(doc)
    db.commit()
    db.close()
    logger.info("删除文档及切片 | id=%s filename=%s", doc_id, doc.filename)
    return True


def save_chunks(document_id: str, chunks: list[str], embeddings: list[list[float]]):
    db = get_db()
    dim = _get_vec_dim()
    for content, emb in zip(chunks, embeddings):
        chunk = ChunkModel(document_id=document_id, content=content)
        db.add(chunk)
        db.flush()
        raw = sqlite_vec.serialize_float32(emb[:dim])
        db.execute(text("INSERT INTO vec_chunks (chunk_id, embedding) VALUES (:cid, :emb)"), {"cid": chunk.id, "emb": raw})
    doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if doc:
        doc.chunk_count = len(chunks)
    db.commit()
    db.close()
    logger.debug("保存切片 | document=%s chunks=%d", document_id, len(chunks))


def search_chunks(query_embedding: list[float], top_k: int) -> list[dict[str, Any]]:
    """用 sqlite-vec 的 vec0 索引做 ANN 检索，替代 numpy 暴力扫描"""
    db = get_db()
    dim = _get_vec_dim()
    raw_query = sqlite_vec.serialize_float32(query_embedding[:dim])
    # vec0 MATCH 返回 (chunk_id, distance)，distance 越小越相似（L2 距离）
    rows = db.execute(
        text("SELECT chunk_id, distance FROM vec_chunks "
             "WHERE embedding MATCH :query ORDER BY distance LIMIT :k"),
        {"query": raw_query, "k": top_k},
    ).fetchall()
    if not rows:
        db.close()
        return []
    chunk_ids = [r[0] for r in rows]
    distance_map = {r[0]: r[1] for r in rows}
    # 批量查 chunk 内容（一次查询，避免 N+1）
    chunk_rows = db.query(ChunkModel).filter(ChunkModel.id.in_(chunk_ids)).all()
    db.close()
    chunk_map = {c.id: c for c in chunk_rows}
    # L2 距离转相似度分数（0~1，越大越相似），保持和旧接口兼容
    results = []
    for cid in chunk_ids:
        c = chunk_map.get(cid)
        if not c:
            continue
        dist = distance_map[cid]
        score = 1.0 / (1.0 + dist)
        results.append({"content": c.content, "documentId": c.document_id, "score": score})
    return results
