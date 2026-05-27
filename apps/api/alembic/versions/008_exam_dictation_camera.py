"""Add exam mode, dictation question kind, and per-user camera requirement

Revision ID: 008
Revises: 007
Create Date: 2026-05-22
"""
from typing import Sequence, Union

from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Per-user camera requirement flag
    op.execute(
        "ALTER TABLE english_users "
        "ADD COLUMN IF NOT EXISTS require_camera BOOLEAN NOT NULL DEFAULT false"
    )

    # Exam mode on modules
    op.execute(
        "ALTER TABLE english_modules "
        "ADD COLUMN IF NOT EXISTS is_exam BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE english_modules "
        "ADD COLUMN IF NOT EXISTS exam_duration_minutes INTEGER"
    )

    # Add 'dictation' to the question_kind enum
    # PostgreSQL requires ALTER TYPE outside a transaction block;
    # using raw DDL with IF NOT EXISTS equivalent via exception suppression.
    op.execute("ALTER TYPE question_kind ADD VALUE IF NOT EXISTS 'dictation'")


def downgrade() -> None:
    op.execute("ALTER TABLE english_modules DROP COLUMN IF EXISTS exam_duration_minutes")
    op.execute("ALTER TABLE english_modules DROP COLUMN IF EXISTS is_exam")
    op.execute("ALTER TABLE english_users DROP COLUMN IF EXISTS require_camera")
    # Note: removing enum values in PostgreSQL requires recreating the type;
    # skipping for safety — dictation values in production would need manual cleanup.
