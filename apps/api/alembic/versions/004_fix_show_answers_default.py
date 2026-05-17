"""Fix show_answers_after_deadline default to FALSE

Revision ID: 004
Revises: 003
Create Date: 2026-05-17

The column was created with DEFAULT TRUE, which caused all modules without
an explicit deadline/reveal_at to auto-reveal learner answers. This migration
resets affected rows to FALSE and corrects the column default.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Reset all modules that never had settings explicitly configured.
    # These have no deadline and no reveal_at, so the old TRUE default
    # was incorrectly making answers visible to learners immediately.
    op.execute("""
        UPDATE english_modules
        SET show_answers_after_deadline = FALSE
        WHERE deadline IS NULL AND reveal_at IS NULL
    """)

    # Correct the column default for all future rows.
    op.execute("""
        ALTER TABLE english_modules
        ALTER COLUMN show_answers_after_deadline SET DEFAULT FALSE
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE english_modules
        ALTER COLUMN show_answers_after_deadline SET DEFAULT TRUE
    """)
