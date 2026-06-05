"""Typing trainer: per-learner deck assignments (deck hidden until assigned)

Revision ID: 012
Revises: 011
Create Date: 2026-06-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "english_deck_assignments",
        sa.Column("deck_id", UUID(as_uuid=True), sa.ForeignKey("english_word_decks.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("english_users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("assigned_by", UUID(as_uuid=True), sa.ForeignKey("english_users.id"), nullable=True),
    )
    op.create_index("ix_english_deck_assignments_user_id", "english_deck_assignments", ["user_id"])


def downgrade() -> None:
    op.drop_table("english_deck_assignments")
