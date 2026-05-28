"""Add exam mode, dictation question kind, and per-user camera requirement

Revision ID: 008
Revises: 007
Create Date: 2026-05-22
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Column additions (safe inside the Alembic transaction) ───────────────
    op.execute(
        "ALTER TABLE english_users "
        "ADD COLUMN IF NOT EXISTS require_camera BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE english_modules "
        "ADD COLUMN IF NOT EXISTS is_exam BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE english_modules "
        "ADD COLUMN IF NOT EXISTS exam_duration_minutes INTEGER"
    )

    # ── Enum value addition (MUST run outside any transaction in PostgreSQL) ──
    # autocommit_block() commits the current transaction, switches to autocommit
    # mode for the block, then starts a new transaction for the rest of the
    # migration (so alembic_version gets updated correctly).
    with op.get_context().autocommit_block():
        op.execute(sa.text("ALTER TYPE question_kind ADD VALUE IF NOT EXISTS 'dictation'"))


def downgrade() -> None:
    op.execute("ALTER TABLE english_modules DROP COLUMN IF EXISTS exam_duration_minutes")
    op.execute("ALTER TABLE english_modules DROP COLUMN IF EXISTS is_exam")
    op.execute("ALTER TABLE english_users DROP COLUMN IF EXISTS require_camera")
    # Note: removing enum values in PostgreSQL requires recreating the type;
    # skipping for safety — dictation values in production would need manual cleanup.
