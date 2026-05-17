import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Achievement(Base):
    __tablename__ = "english_achievements"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    sub: Mapped[str] = mapped_column(String, nullable=False)
    criteria: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class UserAchievement(Base):
    __tablename__ = "english_user_achievements"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_users.id"), primary_key=True)
    achievement_id: Mapped[str] = mapped_column(String, ForeignKey("english_achievements.id"), primary_key=True)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    progress_pct: Mapped[float] = mapped_column(Float, default=0.0)

    user: Mapped["User"] = relationship("User", back_populates="achievements", lazy="noload")
    achievement: Mapped[Achievement] = relationship("Achievement", lazy="noload")


from app.models.user import User  # noqa: E402
