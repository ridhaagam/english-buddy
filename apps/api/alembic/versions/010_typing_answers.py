"""Typing trainer: per-word answers for a session (history detail + peek flag)

Revision ID: 010
Revises: 009
Create Date: 2026-06-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "english_typing_answers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("english_typing_sessions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("word_id", UUID(as_uuid=True), sa.ForeignKey("english_words.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("correct", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("revealed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("english_typing_answers")
