"""Add reveal_at, session events, and 30+ achievement seeds

Revision ID: 003
Revises: 002
Create Date: 2026-05-17

"""
from typing import Sequence, Union

from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # english_modules: answer reveal time
    op.execute("ALTER TABLE english_modules ADD COLUMN IF NOT EXISTS reveal_at TIMESTAMPTZ")

    # english_session_events: track session open/pause/close for admin logs
    op.execute("""
        CREATE TABLE IF NOT EXISTS english_session_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES english_sessions(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES english_users(id) ON DELETE CASCADE,
            event_type VARCHAR(32) NOT NULL,
            event_data JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_session_events_session ON english_session_events(session_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_session_events_user ON english_session_events(user_id)")

    # Seed 30+ achievement types
    achievements = [
        # --- Streak achievements ---
        ("first_day",        "First Steps",       "Complete your first session",        '{"sessions": 1}'),
        ("week_streak",      "Week Warrior",       "Maintain a 7-day streak",            '{"streak_days": 7}'),
        ("fortnight_streak", "Fortnight Fighter",  "Maintain a 14-day streak",           '{"streak_days": 14}'),
        ("month_streak",     "Monthly Master",     "Maintain a 30-day streak",           '{"streak_days": 30}'),
        ("century_streak",   "Century Streak",     "Maintain a 100-day streak",          '{"streak_days": 100}'),
        # --- XP achievements ---
        ("centurion",        "Centurion",          "Earn 100 XP in a single session",    '{"session_xp": 100}'),
        ("xp_1000",          "XP Rookie",          "Earn 1,000 XP total",                '{"total_xp": 1000}'),
        ("xp_5000",          "XP Apprentice",      "Earn 5,000 XP total",                '{"total_xp": 5000}'),
        ("xp_10000",         "XP Knight",          "Earn 10,000 XP total",               '{"total_xp": 10000}'),
        ("xp_50000",         "XP Legend",          "Earn 50,000 XP total",               '{"total_xp": 50000}'),
        # --- Score achievements ---
        ("perfect_set",      "Perfect Set",        "Score 100% on any module",           '{"score_pct": 100}'),
        ("top_scorer",       "Top Scorer",         "Score 90%+ on 5 modules",            '{"perfect_90_count": 5}'),
        ("consistent",       "Consistent Learner", "Score 80%+ on 10 modules",           '{"modules_80plus": 10}'),
        # --- Session count achievements ---
        ("marathoner",       "Marathoner",         "Complete 50 sessions",               '{"sessions": 50}'),
        ("triathlete",       "Triathlete",         "Complete 10 sessions",               '{"sessions": 10}'),
        ("sprinter",         "Sprinter",           "Complete 3 sessions in one day",     '{"daily_sessions": 3}'),
        ("ultramarathoner",  "Ultramarathoner",    "Complete 200 sessions",              '{"sessions": 200}'),
        # --- Topic-specific achievements ---
        ("vocab_master",     "Vocab Master",       "Complete 10 vocabulary modules",     '{"topic_sessions": {"topic": "vocabulary", "count": 10}}'),
        ("grammar_guru",     "Grammar Guru",       "Complete 10 grammar modules",        '{"topic_sessions": {"topic": "grammar", "count": 10}}'),
        ("listening_ace",    "Listening Ace",      "Complete 5 listening modules",       '{"topic_sessions": {"topic": "listening", "count": 5}}'),
        ("speaking_star",    "Speaking Star",      "Complete 5 speaking modules",        '{"topic_sessions": {"topic": "speaking", "count": 5}}'),
        ("writing_wizard",   "Writing Wizard",     "Complete 5 writing modules",         '{"topic_sessions": {"topic": "writing", "count": 5}}'),
        # --- CEFR level achievements ---
        ("level_a1",         "A1 Starter",         "Complete any A1 module",             '{"cefr_level": "A1"}'),
        ("level_b1",         "B1 Intermediate",    "Complete any B1 module",             '{"cefr_level": "B1"}'),
        ("level_c1",         "C1 Advanced",        "Complete any C1 module",             '{"cefr_level": "C1"}'),
        # --- Behavioral achievements ---
        ("owl_mode",         "Night Owl",          "Complete a session after midnight",  '{"hour_before": 4}'),
        ("early_bird",       "Early Bird",         "Complete a session before 7am",      '{"hour_before": 7}'),
        ("speed_demon",      "Speed Demon",        "Finish a 10-question module in under 5 minutes", '{"speed_seconds": 300, "min_questions": 10}'),
        ("no_switch",        "Focused Mind",       "Complete a session with zero tab switches", '{"tab_switches": 0}'),
        ("clean_record",     "Clean Record",       "Complete 10 sessions with no flags", '{"unflagged_sessions": 10}'),
        # --- Social/profile achievements ---
        ("profile_complete", "Profile Complete",   "Fill in your bio and avatar",        '{"profile_fields": ["bio", "avatar_url"]}'),
        ("polyglot",         "Polyglot",           "Set your native language on profile", '{"profile_fields": ["native_language"]}'),
        # --- Milestone / explorer achievements ---
        ("explorer",         "Explorer",           "Try 5 different module topics",      '{"unique_topics": 5}'),
        ("level_explorer",   "Level Explorer",     "Complete modules across 4 CEFR levels", '{"unique_cefr": 4}'),
        ("daily_double",     "Daily Double",       "Hit your XP goal 2 days in a row",  '{"goal_days_streak": 2}'),
        ("goal_crusher",     "Goal Crusher",       "Hit your XP goal 7 days in a row",  '{"goal_days_streak": 7}'),
    ]

    for slug, title, sub, criteria in achievements:
        op.execute(
            f"INSERT INTO english_achievements (id, title, sub, criteria) "
            f"VALUES ('{slug}', '{title}', '{sub}', '{criteria}'::jsonb) "
            f"ON CONFLICT (id) DO NOTHING"
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS english_session_events")
    op.execute("ALTER TABLE english_modules DROP COLUMN IF EXISTS reveal_at")
    # Note: achievements seeded by upgrade are NOT removed on downgrade to preserve user_achievement records
