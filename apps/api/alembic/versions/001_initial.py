"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-17

"""
from typing import Sequence, Union

from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    op.execute("DO $$ BEGIN CREATE TYPE user_role AS ENUM ('owner','admin','editor','learner'); EXCEPTION WHEN duplicate_object THEN null; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE cefr_level AS ENUM ('A1','A2','B1','B2','C1','C2'); EXCEPTION WHEN duplicate_object THEN null; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE topic_type AS ENUM ('vocabulary','grammar','listening','speaking','writing'); EXCEPTION WHEN duplicate_object THEN null; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE module_status AS ENUM ('draft','published','archived'); EXCEPTION WHEN duplicate_object THEN null; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE source_kind AS ENUM ('manual','imported_pdf','imported_docx','imported_audio'); EXCEPTION WHEN duplicate_object THEN null; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE question_kind AS ENUM ('choice','fill','match','listen_choice'); EXCEPTION WHEN duplicate_object THEN null; END $$")

    op.execute("""
        CREATE TABLE IF NOT EXISTS english_users (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email         TEXT NOT NULL UNIQUE,
            display_name  TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role          user_role NOT NULL DEFAULT 'learner',
            cefr_level    cefr_level,
            streak        INTEGER NOT NULL DEFAULT 0,
            xp_total      INTEGER NOT NULL DEFAULT 0,
            daily_goal_xp INTEGER NOT NULL DEFAULT 200,
            created_at    TIMESTAMPTZ DEFAULT now(),
            updated_at    TIMESTAMPTZ DEFAULT now(),
            last_seen_at  TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_english_users_email ON english_users(email)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS english_modules (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title                   TEXT NOT NULL,
            topic                   topic_type NOT NULL,
            cefr_level              cefr_level NOT NULL DEFAULT 'A2',
            status                  module_status NOT NULL DEFAULT 'draft',
            created_by              UUID REFERENCES english_users(id),
            source_kind             source_kind NOT NULL DEFAULT 'manual',
            description             TEXT,
            source_blob             TEXT,
            audio_blob              TEXT,
            audio_duration_seconds  INTEGER,
            created_at              TIMESTAMPTZ DEFAULT now(),
            updated_at              TIMESTAMPTZ DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS english_questions (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            module_id   UUID NOT NULL REFERENCES english_modules(id) ON DELETE CASCADE,
            position    INTEGER NOT NULL DEFAULT 0,
            kind        question_kind NOT NULL,
            prompt      TEXT NOT NULL,
            context     TEXT,
            sentence    TEXT,
            payload     JSONB NOT NULL DEFAULT '{}',
            explain     TEXT,
            created_at  TIMESTAMPTZ DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_english_questions_module_id ON english_questions(module_id, position)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS english_sessions (
            id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id                    UUID NOT NULL REFERENCES english_users(id),
            module_id                  UUID NOT NULL REFERENCES english_modules(id),
            started_at                 TIMESTAMPTZ DEFAULT now(),
            finished_at                TIMESTAMPTZ,
            score_pct                  INTEGER,
            correct_count              INTEGER,
            total                      INTEGER,
            recording_blob             TEXT,
            recording_duration_seconds INTEGER,
            device_info                JSONB,
            flagged                    BOOLEAN NOT NULL DEFAULT false,
            flag_reason                TEXT,
            xp_earned                  INTEGER NOT NULL DEFAULT 0
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_english_sessions_user_started ON english_sessions(user_id, started_at)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS english_session_answers (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id    UUID NOT NULL REFERENCES english_sessions(id) ON DELETE CASCADE,
            question_id   UUID NOT NULL REFERENCES english_questions(id),
            selection     JSONB NOT NULL,
            is_correct    BOOLEAN NOT NULL,
            time_spent_ms INTEGER
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS english_achievements (
            id       TEXT PRIMARY KEY,
            title    TEXT NOT NULL,
            sub      TEXT NOT NULL,
            criteria JSONB NOT NULL DEFAULT '{}'
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS english_user_achievements (
            user_id        UUID REFERENCES english_users(id),
            achievement_id TEXT REFERENCES english_achievements(id),
            earned_at      TIMESTAMPTZ DEFAULT now(),
            progress_pct   FLOAT NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, achievement_id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS english_audit_log (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            actor_id    UUID REFERENCES english_users(id),
            action      TEXT NOT NULL,
            target_kind TEXT,
            target_id   TEXT,
            payload     JSONB,
            at          TIMESTAMPTZ DEFAULT now()
        )
    """)


def downgrade() -> None:
    for t in ["english_audit_log", "english_user_achievements", "english_achievements",
              "english_session_answers", "english_sessions", "english_questions",
              "english_modules", "english_users"]:
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
    for t in ["question_kind", "source_kind", "module_status", "topic_type", "cefr_level", "user_role"]:
        op.execute(f"DROP TYPE IF EXISTS {t}")
