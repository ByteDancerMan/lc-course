import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import DB_PATH


def get_db() -> sqlite3.Connection:
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '新对话',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user','assistant')),
            content TEXT NOT NULL,
            image_url TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);
    """)
    conn.close()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_session(title: str = "新对话") -> dict[str, Any]:
    conn = get_db()
    session_id = str(uuid.uuid4())
    now = now_iso()
    conn.execute(
        "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (session_id, title, now, now),
    )
    conn.commit()
    conn.close()
    return {"id": session_id, "title": title, "createdAt": now, "updatedAt": now}


def update_session_title(session_id: str, title: str):
    conn = get_db()
    conn.execute("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?",
                 (title, now_iso(), session_id))
    conn.commit()
    conn.close()


def delete_session(session_id: str):
    conn = get_db()
    conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()


def get_sessions() -> list[dict[str, Any]]:
    conn = get_db()
    rows = conn.execute("""
        SELECT s.id, s.title, s.created_at, s.updated_at,
               COALESCE(
                   (SELECT content FROM messages WHERE session_id = s.id ORDER BY created_at DESC LIMIT 1),
                   ''
               ) AS last_message
        FROM sessions s
        ORDER BY s.updated_at DESC
    """).fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "createdAt": r["created_at"],
            "updatedAt": r["updated_at"],
            "lastMessage": r["last_message"],
        }
        for r in rows
    ]


def get_session(session_id: str) -> dict[str, Any] | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        conn.close()
        return None
    messages = [
        {
            "id": m["id"],
            "role": m["role"],
            "content": m["content"],
            "imageUrl": m["image_url"],
            "createdAt": m["created_at"],
        }
        for m in conn.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC",
            (session_id,),
        ).fetchall()
    ]
    conn.close()
    return {
        "id": row["id"],
        "title": row["title"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "messages": messages,
    }


def add_message(session_id: str, role: str, content: str, image_url: str | None = None) -> dict[str, Any]:
    conn = get_db()
    msg_id = str(uuid.uuid4())
    now = now_iso()
    conn.execute(
        "INSERT INTO messages (id, session_id, role, content, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (msg_id, session_id, role, content, image_url, now),
    )
    conn.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id))
    conn.commit()
    conn.close()
    return {"id": msg_id, "role": role, "content": content, "imageUrl": image_url, "createdAt": now}
