"""Feature overhaul: proctoring flags, module close/deadline, user profile fields

Revision ID: 002
Revises: 001
Create Date: 2026-05-17

"""
from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # english_users: profile fields
    op.execute("ALTER TABLE english_users ADD COLUMN IF NOT EXISTS avatar_url TEXT")
    op.execute("ALTER TABLE english_users ADD COLUMN IF NOT EXISTS birthdate DATE")
    op.execute("ALTER TABLE english_users ADD COLUMN IF NOT EXISTS bio TEXT")
    op.execute("ALTER TABLE english_users ADD COLUMN IF NOT EXISTS native_language VARCHAR(60)")

    # english_modules: close / deadline / attempts
    op.execute("ALTER TABLE english_modules ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ")
    op.execute("ALTER TABLE english_modules ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE english_modules ADD COLUMN IF NOT EXISTS max_attempts INTEGER")
    op.execute("ALTER TABLE english_modules ADD COLUMN IF NOT EXISTS show_answers_after_deadline BOOLEAN NOT NULL DEFAULT true")

    # english_sessions: proctoring counters + admin comment
    op.execute("ALTER TABLE english_sessions ADD COLUMN IF NOT EXISTS admin_comment TEXT")
    op.execute("ALTER TABLE english_sessions ADD COLUMN IF NOT EXISTS tab_switch_count INTEGER NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE english_sessions ADD COLUMN IF NOT EXISTS face_anomaly_count INTEGER NOT NULL DEFAULT 0")

    # english_session_answers: per-question proctoring + admin flags
    op.execute("ALTER TABLE english_session_answers ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE english_session_answers ADD COLUMN IF NOT EXISTS admin_comment TEXT")
    op.execute("ALTER TABLE english_session_answers ADD COLUMN IF NOT EXISTS tab_switch BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE english_session_answers ADD COLUMN IF NOT EXISTS face_anomaly BOOLEAN NOT NULL DEFAULT false")


def downgrade() -> None:
    op.execute("ALTER TABLE english_session_answers DROP COLUMN IF EXISTS face_anomaly")
    op.execute("ALTER TABLE english_session_answers DROP COLUMN IF EXISTS tab_switch")
    op.execute("ALTER TABLE english_session_answers DROP COLUMN IF EXISTS admin_comment")
    op.execute("ALTER TABLE english_session_answers DROP COLUMN IF EXISTS flagged")

    op.execute("ALTER TABLE english_sessions DROP COLUMN IF EXISTS face_anomaly_count")
    op.execute("ALTER TABLE english_sessions DROP COLUMN IF EXISTS tab_switch_count")
    op.execute("ALTER TABLE english_sessions DROP COLUMN IF EXISTS admin_comment")

    op.execute("ALTER TABLE english_modules DROP COLUMN IF EXISTS show_answers_after_deadline")
    op.execute("ALTER TABLE english_modules DROP COLUMN IF EXISTS max_attempts")
    op.execute("ALTER TABLE english_modules DROP COLUMN IF EXISTS is_closed")
    op.execute("ALTER TABLE english_modules DROP COLUMN IF EXISTS deadline")

    op.execute("ALTER TABLE english_users DROP COLUMN IF EXISTS native_language")
    op.execute("ALTER TABLE english_users DROP COLUMN IF EXISTS bio")
    op.execute("ALTER TABLE english_users DROP COLUMN IF EXISTS birthdate")
    op.execute("ALTER TABLE english_users DROP COLUMN IF EXISTS avatar_url")
