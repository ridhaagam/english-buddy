"""Daily-streak bookkeeping, shared by every "finish" path.

Pulled into one pure function so the rule is testable with injected dates — the
increment path can't be exercised over HTTP (it needs a real day boundary), so the
correctness lives here, not in an endpoint.
"""
from datetime import date


def apply_daily_streak(user, today: date) -> None:
    """Advance ``user.streak`` at most once per calendar day.

    - first activity ever (``streak_day is None``) → streak = 1
    - already counted today → no-op (so a second session/login can't bump it)
    - exactly the next day → +1
    - any gap of 2+ days → reset to 1

    Keyed on ``user.streak_day`` (the day the streak last moved), NOT on
    ``last_seen_at`` — login updates last_seen_at to today and would otherwise make
    the "did we already advance today?" check always true, freezing the streak.
    """
    if user.streak_day == today:
        return
    if user.streak_day is not None and (today - user.streak_day).days == 1:
        user.streak += 1
    else:
        user.streak = 1
    user.streak_day = today
