"""Typing trainer: word decks, words, typing sessions, and per-word progress

Revision ID: 009
Revises: 008
Create Date: 2026-06-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON, UUID

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "english_word_decks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(length=80), nullable=False, unique=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cefr_level", sa.String(length=8), nullable=True),
        sa.Column("accent", sa.String(length=8), nullable=False, server_default="us"),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("english_users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "english_words",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("deck_id", UUID(as_uuid=True), sa.ForeignKey("english_word_decks.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("word", sa.Text(), nullable=False),
        sa.Column("phonetic", sa.Text(), nullable=True),
        sa.Column("pos", sa.String(length=16), nullable=True),
        sa.Column("translation", sa.Text(), nullable=True),
        sa.Column("example", sa.Text(), nullable=True),
        sa.Column("example_translation", sa.Text(), nullable=True),
        sa.Column("audio_key", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "english_typing_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("english_users.id"), nullable=False, index=True),
        sa.Column("deck_id", UUID(as_uuid=True), sa.ForeignKey("english_word_decks.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("chapter_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mode", sa.String(length=16), nullable=False, server_default="type"),
        sa.Column("total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("wrong_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("accuracy", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("wpm", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("xp_earned", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "english_word_progress",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("english_users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("word_id", UUID(as_uuid=True), sa.ForeignKey("english_words.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("seen_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("wrong_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mastered", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_practiced_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "word_id", name="uq_word_progress_user_word"),
    )


def downgrade() -> None:
    op.drop_table("english_word_progress")
    op.drop_table("english_typing_sessions")
    op.drop_table("english_words")
    op.drop_table("english_word_decks")
