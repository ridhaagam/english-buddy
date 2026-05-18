import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Session(Base):
    __tablename__ = "english_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_users.id"), nullable=False, index=True)
    module_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_modules.id"), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    score_pct: Mapped[int | None] = mapped_column(Integer, nullable=True)
    correct_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recording_blob: Mapped[str | None] = mapped_column(Text, nullable=True)
    recording_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    device_info: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    flag_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    admin_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    tab_switch_count: Mapped[int] = mapped_column(Integer, default=0)
    face_anomaly_count: Mapped[int] = mapped_column(Integer, default=0)
    resume_from_session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("english_sessions.id"), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="sessions", lazy="noload")
    module: Mapped["Module"] = relationship("Module", back_populates="sessions", lazy="noload")
    answers: Mapped[list["SessionAnswer"]] = relationship("SessionAnswer", back_populates="session", lazy="noload")


class SessionAnswer(Base):
    __tablename__ = "english_session_answers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_questions.id"), nullable=False)
    selection: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    time_spent_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    admin_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    tab_switch: Mapped[bool] = mapped_column(Boolean, default=False)
    face_anomaly: Mapped[bool] = mapped_column(Boolean, default=False)

    session: Mapped["Session"] = relationship("Session", back_populates="answers", lazy="noload")


class SessionEvent(Base):
    __tablename__ = "english_session_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    event_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


from app.models.user import User  # noqa: E402
from app.models.module import Module  # noqa: E402
