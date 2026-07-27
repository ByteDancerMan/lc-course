import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import String, Text, ForeignKey, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def now_beijing() -> str:
    # 获取东八区当前时间，格式化为字符串
    return datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d %H:%M:%S")


class Base(DeclarativeBase):
    pass


class SessionModel(Base):
    # 会话表 —— 每个对话窗口对应一条记录
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="新对话")
    created_at: Mapped[str] = mapped_column(String(19), nullable=False)
    updated_at: Mapped[str] = mapped_column(String(19), nullable=False)

    # 一对多关联：一个会话包含多条消息，删除会话时级联删除所有消息
    messages: Mapped[list["MessageModel"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="MessageModel.created_at"
    )

    __table_args__ = (
        Index("idx_sessions_updated_at", "updated_at"),
    )


class MessageModel(Base):
    # 消息表 —— 每条用户/AI 消息对应一条记录
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # 'user' 或 'assistant'
    content: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String(19), nullable=False)

    session: Mapped["SessionModel"] = relationship(back_populates="messages")

    __table_args__ = (
        Index("idx_messages_session_id", "session_id"),
    )
