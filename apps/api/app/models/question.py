import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class QuestionKind(str, enum.Enum):
    choice = "choice"
    fill = "fill"
    match = "match"
    listen_choice = "listen_choice"
    dictation = "dictation"


class Question(Base):
    __tablename__ = "english_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    kind: Mapped[QuestionKind] = mapped_column(Enum(QuestionKind, name="question_kind", create_type=False), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    sentence: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    explain: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    module: Mapped["Module"] = relationship("Module", back_populates="questions", lazy="noload")


from app.models.module import Module  # noqa: E402
