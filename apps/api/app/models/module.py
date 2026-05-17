import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TopicType(str, enum.Enum):
    vocabulary = "vocabulary"
    grammar = "grammar"
    listening = "listening"
    speaking = "speaking"
    writing = "writing"


class CefrLevel(str, enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class ModuleStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class SourceKind(str, enum.Enum):
    manual = "manual"
    imported_pdf = "imported_pdf"
    imported_docx = "imported_docx"
    imported_audio = "imported_audio"


class Module(Base):
    __tablename__ = "english_modules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    topic: Mapped[TopicType] = mapped_column(Enum(TopicType, name="topic_type", create_type=False), nullable=False)
    cefr_level: Mapped[CefrLevel] = mapped_column(Enum(CefrLevel, name="cefr_level", create_type=False), nullable=False, default=CefrLevel.A2)
    status: Mapped[ModuleStatus] = mapped_column(Enum(ModuleStatus, name="module_status", create_type=False), nullable=False, default=ModuleStatus.draft)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("english_users.id"), nullable=True)
    source_kind: Mapped[SourceKind] = mapped_column(Enum(SourceKind, name="source_kind", create_type=False), nullable=False, default=SourceKind.manual)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_blob: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_blob: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    questions: Mapped[list["Question"]] = relationship("Question", back_populates="module", order_by="Question.position", lazy="noload")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="module", lazy="noload")


from app.models.question import Question  # noqa: E402
from app.models.session import Session  # noqa: E402
