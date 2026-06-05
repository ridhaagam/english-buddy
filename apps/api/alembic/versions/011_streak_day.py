"""Add users.streak_day (decouples daily streak from last_seen_at)

Revision ID: 011
Revises: 010
Create Date: 2026-06-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("english_users", sa.Column("streak_day", sa.Date(), nullable=True))
    # Seed from the last day each user was active so current streaks aren't reset
    # to 1 on the first finish after this migration.
    op.execute(
        "UPDATE english_users SET streak_day = (last_seen_at AT TIME ZONE 'UTC')::date "
        "WHERE last_seen_at IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_column("english_users", "streak_day")
