import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class WordDeck(Base):
    """A themed vocabulary list practised in the typing trainer.

    Words are split into fixed-size chapters on read; the deck itself just owns
    the ordered word rows.
    """

    __tablename__ = "english_word_decks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cefr_level: Mapped[str | None] = mapped_column(String(8), nullable=True)
    accent: Mapped[str] = mapped_column(String(8), nullable=False, default="us")
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("english_users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    words: Mapped[list["Word"]] = relationship("Word", back_populates="deck", lazy="noload", order_by="Word.position")


class Word(Base):
    __tablename__ = "english_words"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deck_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_word_decks.id", ondelete="CASCADE"), nullable=False, index=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    word: Mapped[str] = mapped_column(Text, nullable=False)
    phonetic: Mapped[str | None] = mapped_column(Text, nullable=True)
    pos: Mapped[str | None] = mapped_column(String(16), nullable=True)
    translation: Mapped[str | None] = mapped_column(Text, nullable=True)
    example: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_translation: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    deck: Mapped["WordDeck"] = relationship("WordDeck", back_populates="words", lazy="noload")


class TypingSession(Base):
    __tablename__ = "english_typing_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_users.id"), nullable=False, index=True)
    # nullable so a cross-deck "wrong-word book" review can run without one owning deck.
    deck_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("english_word_decks.id", ondelete="SET NULL"), nullable=True, index=True)
    chapter_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mode: Mapped[str] = mapped_column(String(16), nullable=False, default="type")
    total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wrong_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    accuracy: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wpm: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    xp_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DeckAssignment(Base):
    """Direct per-learner access to a typing deck.

    A deck with no assignment rows is visible to nobody (learners) — decks are
    hidden until explicitly assigned. Staff bypass this in the API.
    """

    __tablename__ = "english_deck_assignments"

    deck_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_word_decks.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_users.id", ondelete="CASCADE"), primary_key=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("english_users.id"), nullable=True)


class TypingAnswer(Base):
    """Per-word outcome of a single typing session — backs the practice-history detail.

    ``TypingSession`` only keeps aggregates; this records what happened to each word
    in that one run (typed clean? revealed/peeked?) so a learner can review a past
    session word by word. Written once when the session finishes.
    """

    __tablename__ = "english_typing_answers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_typing_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    word_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_words.id", ondelete="CASCADE"), nullable=False, index=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    revealed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WordProgress(Base):
    """Per-user, per-word mastery — backs the wrong-word book and mastered counts."""

    __tablename__ = "english_word_progress"
    __table_args__ = (UniqueConstraint("user_id", "word_id", name="uq_word_progress_user_word"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_users.id", ondelete="CASCADE"), nullable=False, index=True)
    word_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("english_words.id", ondelete="CASCADE"), nullable=False, index=True)
    seen_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wrong_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mastered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_practiced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
