"""Track resume_from_session_id on sessions

Revision ID: 006
Revises: 005
Create Date: 2026-05-18
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "english_sessions",
        sa.Column("resume_from_session_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("english_sessions.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("english_sessions", "resume_from_session_id")
