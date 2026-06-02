"""Shared logic for when a finished session's results become visible.

Used by every endpoint that returns a learner's own results so they can never
disagree about whether correct answers and scores are revealed.
"""
from datetime import datetime, timezone


def compute_reveal(module) -> tuple[bool, datetime | None]:
    """Return (revealed, effective_reveal_at) for a finished session's module.

    Precedence:
      1. reveal_at set        → revealed once that time passes (explicit override)
      2. exam                 → hidden until an explicit reveal_at is set
      3. closed               → revealed (the module is over)
      4. show-after-deadline  → revealed once the deadline passes
      5. show-after-deadline, no deadline → hidden until the module is closed
      6. otherwise            → revealed immediately (regular practice)
    """
    if not module:
        return True, None
    now = datetime.now(timezone.utc)
    if module.reveal_at:
        return now >= module.reveal_at, module.reveal_at
    if module.is_exam:
        return False, None
    if module.is_closed:
        return True, None
    if module.show_answers_after_deadline and module.deadline:
        return now >= module.deadline, module.deadline
    if module.show_answers_after_deadline:
        return False, None
    return True, None
