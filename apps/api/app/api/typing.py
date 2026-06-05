"""Typing trainer API — TypeWords-style word drilling.

Decks are split into fixed-size chapters. A learner types each word letter by
letter (feedback is client-side); when a chapter finishes the client posts the
result, which awards XP through the same path as quiz sessions, updates the
streak, and records per-word mastery for the wrong-word book.
"""
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import and_, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.security import decode_token
from app.models.typing import TypingAnswer, TypingSession, Word, WordDeck, WordProgress
from app.models.user import User
from app.services.storage import get_file_path
from app.services.streak import apply_daily_streak
from app.services.word_audio import ensure_word_audio

router = APIRouter(tags=["typing"])

CHAPTER_SIZE = 10
REVIEW_LIMIT = 30


def _valid_audio_token(token: str) -> bool:
    payload = decode_token(token)
    return bool(payload) and payload.get("type") == "access"


def _word_dict(w: Word) -> dict:
    return {
        "id": str(w.id),
        "word": w.word,
        "phonetic": w.phonetic,
        "pos": w.pos,
        "translation": w.translation,
        "example": w.example,
        "example_translation": w.example_translation,
        "audio_url": f"/api/v1/typing/words/{w.id}/audio",
    }


# ── Decks ────────────────────────────────────────────────────────────────────


@router.get("/typing/decks")
async def list_decks(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    decks_r = await db.execute(
        select(WordDeck)
        .where(WordDeck.is_published.is_(True))
        .order_by(WordDeck.sort_order, WordDeck.created_at)
    )
    decks = list(decks_r.scalars().all())
    if not decks:
        return []

    deck_ids = [d.id for d in decks]

    counts_r = await db.execute(
        select(Word.deck_id, func.count().label("cnt"))
        .where(Word.deck_id.in_(deck_ids))
        .group_by(Word.deck_id)
    )
    word_counts = {row.deck_id: row.cnt for row in counts_r}

    # Mastered words per deck for this user (one grouped query — no N+1).
    mastered_r = await db.execute(
        select(Word.deck_id, func.count().label("cnt"))
        .join(WordProgress, WordProgress.word_id == Word.id)
        .where(and_(
            Word.deck_id.in_(deck_ids),
            WordProgress.user_id == user.id,
            WordProgress.mastered.is_(True),
        ))
        .group_by(Word.deck_id)
    )
    mastered_counts = {row.deck_id: row.cnt for row in mastered_r}

    best_r = await db.execute(
        select(TypingSession.deck_id, func.max(TypingSession.wpm).label("best_wpm"))
        .where(and_(
            TypingSession.user_id == user.id,
            TypingSession.deck_id.in_(deck_ids),
            TypingSession.finished_at.isnot(None),
        ))
        .group_by(TypingSession.deck_id)
    )
    best_wpm = {row.deck_id: row.best_wpm for row in best_r}

    out = []
    for d in decks:
        total = word_counts.get(d.id, 0)
        out.append({
            "id": str(d.id),
            "slug": d.slug,
            "title": d.title,
            "description": d.description,
            "cefr_level": d.cefr_level,
            "accent": d.accent,
            "word_count": total,
            "chapter_count": max(1, (total + CHAPTER_SIZE - 1) // CHAPTER_SIZE) if total else 0,
            "mastered_count": mastered_counts.get(d.id, 0),
            "best_wpm": best_wpm.get(d.id) or 0,
        })
    return out


@router.get("/typing/decks/{deck_id}")
async def get_deck(
    deck_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    deck_r = await db.execute(select(WordDeck).where(WordDeck.id == deck_id))
    deck = deck_r.scalar_one_or_none()
    if not deck or not deck.is_published:
        raise HTTPException(404, "Deck not found")

    words_r = await db.execute(
        select(Word).where(Word.deck_id == deck_id).order_by(Word.position)
    )
    words = list(words_r.scalars().all())
    word_ids = [w.id for w in words]

    mastered_ids: set[UUID] = set()
    if word_ids:
        m_r = await db.execute(
            select(WordProgress.word_id).where(and_(
                WordProgress.user_id == user.id,
                WordProgress.word_id.in_(word_ids),
                WordProgress.mastered.is_(True),
            ))
        )
        mastered_ids = {row[0] for row in m_r}

    chapters = []
    for ci in range(0, max(1, len(words)), CHAPTER_SIZE):
        chunk = words[ci:ci + CHAPTER_SIZE]
        chapters.append({
            "index": ci // CHAPTER_SIZE,
            "word_count": len(chunk),
            "mastered_count": sum(1 for w in chunk if w.id in mastered_ids),
            "preview": [w.word for w in chunk[:5]],
        })

    return {
        "id": str(deck.id),
        "slug": deck.slug,
        "title": deck.title,
        "description": deck.description,
        "cefr_level": deck.cefr_level,
        "accent": deck.accent,
        "word_count": len(words),
        "mastered_count": len(mastered_ids),
        "chapters": chapters,
    }


@router.get("/typing/decks/{deck_id}/chapters/{chapter_index}")
async def get_chapter(
    deck_id: UUID,
    chapter_index: int,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    deck_r = await db.execute(select(WordDeck).where(WordDeck.id == deck_id))
    deck = deck_r.scalar_one_or_none()
    if not deck or not deck.is_published:
        raise HTTPException(404, "Deck not found")

    words_r = await db.execute(
        select(Word).where(Word.deck_id == deck_id).order_by(Word.position)
    )
    words = list(words_r.scalars().all())
    start = chapter_index * CHAPTER_SIZE
    chunk = words[start:start + CHAPTER_SIZE]
    if not chunk:
        raise HTTPException(404, "Chapter not found")

    return {
        "deck_id": str(deck.id),
        "deck_title": deck.title,
        "chapter_index": chapter_index,
        "accent": deck.accent,
        "words": [_word_dict(w) for w in chunk],
    }


# ── Wrong-word book ──────────────────────────────────────────────────────────


@router.get("/typing/review")
async def review_words(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(REVIEW_LIMIT, ge=1, le=100),
):
    rows_r = await db.execute(
        select(Word, WordDeck.title)
        .join(WordProgress, WordProgress.word_id == Word.id)
        .join(WordDeck, WordDeck.id == Word.deck_id)
        .where(and_(
            WordProgress.user_id == user.id,
            WordProgress.mastered.is_(False),
            WordProgress.wrong_count > 0,
        ))
        .order_by(WordProgress.wrong_count.desc(), WordProgress.last_practiced_at.asc())
        .limit(limit)
    )
    out = []
    for word, deck_title in rows_r.all():
        d = _word_dict(word)
        d["deck_title"] = deck_title
        out.append(d)
    return out


# ── Sessions ─────────────────────────────────────────────────────────────────


class StartTypingBody(BaseModel):
    deck_id: str | None = None
    chapter_index: int = 0
    mode: str = "type"


class TypingResult(BaseModel):
    word_id: str
    correct: bool
    # Set when the learner peeked at the spelling in dictation mode. Self-reported —
    # lying only hurts the learner (no mastery, stays in review), so it isn't an
    # exploit surface like the scored fields are.
    revealed: bool = False


class FinishTypingBody(BaseModel):
    total: int
    correct: int
    wrong_count: int = 0
    accuracy: int = 0
    wpm: int = 0
    duration_ms: int = 0
    results: list[TypingResult] = []


@router.post("/typing/sessions")
async def start_typing_session(
    body: StartTypingBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    deck_uuid: UUID | None = None
    if body.deck_id:
        try:
            deck_uuid = UUID(body.deck_id)
        except ValueError:
            raise HTTPException(400, "Invalid deck id")
        deck_r = await db.execute(select(WordDeck).where(WordDeck.id == deck_uuid))
        if not deck_r.scalar_one_or_none():
            raise HTTPException(404, "Deck not found")

    session = TypingSession(
        user_id=user.id,
        deck_id=deck_uuid,
        chapter_index=max(0, body.chapter_index),
        mode=body.mode if body.mode in ("type", "dictation", "review") else "type",
    )
    db.add(session)
    await db.commit()
    return {"id": str(session.id)}


async def _allowed_word_ids(db: AsyncSession, user_id: UUID, session: TypingSession) -> set[UUID]:
    """The set of words this session may legitimately score — never the client's claim.

    For a chapter run it's the deck's words for that chapter; for a review run it's
    the user's current wrong-word book. Anything outside the set is ignored, so a
    forged ``results[]`` can't mint XP or master arbitrary words.
    """
    if session.mode == "review":
        r = await db.execute(
            select(Word.id)
            .join(WordProgress, WordProgress.word_id == Word.id)
            .where(and_(
                WordProgress.user_id == user_id,
                WordProgress.mastered.is_(False),
                WordProgress.wrong_count > 0,
            ))
        )
        return {row[0] for row in r}
    if session.deck_id:
        r = await db.execute(
            select(Word.id).where(Word.deck_id == session.deck_id).order_by(Word.position)
        )
        ids = [row[0] for row in r]
        start = session.chapter_index * CHAPTER_SIZE
        return set(ids[start:start + CHAPTER_SIZE])
    return set()


@router.post("/typing/sessions/{session_id}/finish")
async def finish_typing_session(
    session_id: UUID,
    body: FinishTypingBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Lock the session row so two concurrent finishes can't both pass the guard
    # and double-grant XP.
    s_r = await db.execute(
        select(TypingSession)
        .where(and_(TypingSession.id == session_id, TypingSession.user_id == user.id))
        .with_for_update()
    )
    session = s_r.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.finished_at:
        return {
            "xp_earned": session.xp_earned, "wpm": session.wpm,
            "accuracy": session.accuracy, "correct": session.correct, "total": session.total,
        }

    # ── Score server-side from validated outcomes (don't trust the body) ──────
    # Keep word order (for per-word answer rows) while de-duplicating: typing the
    # same word twice in one run collapses to one outcome (last typed wins; any
    # peek sticks). Words outside the session's legitimate set are ignored.
    allowed = await _allowed_word_ids(db, user.id, session)
    order: list[UUID] = []
    outcome: dict[UUID, dict] = {}
    for r in body.results:
        try:
            wid = UUID(r.word_id)
        except ValueError:
            continue
        if wid not in allowed:
            continue
        if wid not in outcome:
            outcome[wid] = {"correct": r.correct, "revealed": r.revealed}
            order.append(wid)
        else:
            outcome[wid]["correct"] = r.correct
            outcome[wid]["revealed"] = outcome[wid]["revealed"] or r.revealed

    total = len(order)
    # "clean" = typed with no errors AND not peeked. Mastery and the perfect bonus
    # require clean; a peeked word still earns its base XP but never counts as known.
    correct = sum(1 for v in outcome.values() if v["correct"])
    clean = sum(1 for v in outcome.values() if v["correct"] and not v["revealed"])
    word_accuracy = round(correct / total * 100) if total else 0
    xp = 8 * correct + 4 * total + (40 if total > 0 and clean == total else 0)

    session.total = total
    session.correct = correct
    session.wrong_count = total - correct
    session.accuracy = word_accuracy
    session.wpm = max(0, min(body.wpm, 400))  # vanity stat — clamp to a sane ceiling
    session.duration_ms = max(0, body.duration_ms)
    session.xp_earned = xp
    session.finished_at = datetime.now(timezone.utc)

    # ── Per-word answer rows (history detail) + mastery upsert ────────────────
    now = datetime.now(timezone.utc)
    for pos, wid in enumerate(order):
        v = outcome[wid]
        is_clean = v["correct"] and not v["revealed"]
        db.add(TypingAnswer(
            session_id=session.id, word_id=wid, position=pos,
            correct=v["correct"], revealed=v["revealed"],
        ))
        # Race-safe against the unique constraint; peeked words drop to the review book.
        stmt = pg_insert(WordProgress).values(
            user_id=user.id, word_id=wid, seen_count=1,
            wrong_count=0 if is_clean else 1,
            mastered=is_clean, last_practiced_at=now,
        ).on_conflict_do_update(
            constraint="uq_word_progress_user_word",
            set_={
                "seen_count": WordProgress.seen_count + 1,
                "wrong_count": WordProgress.wrong_count + (0 if is_clean else 1),
                "mastered": is_clean,
                "last_practiced_at": now,
            },
        )
        await db.execute(stmt)

    # ── Reward: atomic XP increment (no lost update) + streak ─────────────────
    if xp:
        await db.execute(update(User).where(User.id == user.id).values(xp_total=User.xp_total + xp))

    apply_daily_streak(user, now.date())  # UTC day; shared rule, decoupled from last_seen_at
    user.last_seen_at = now

    await db.commit()
    return {"xp_earned": xp, "wpm": session.wpm, "accuracy": word_accuracy, "correct": correct, "total": total}


# ── Practice history ─────────────────────────────────────────────────────────


@router.get("/typing/sessions/me")
async def my_typing_sessions(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, ge=1, le=200),
):
    rows_r = await db.execute(
        select(TypingSession, WordDeck.title)
        .join(WordDeck, WordDeck.id == TypingSession.deck_id, isouter=True)
        .where(and_(TypingSession.user_id == user.id, TypingSession.finished_at.isnot(None)))
        .order_by(TypingSession.finished_at.desc())
        .limit(limit)
    )
    out = []
    for s, deck_title in rows_r.all():
        out.append({
            "id": str(s.id),
            "deck_title": deck_title or ("Review" if s.mode == "review" else "Typing"),
            "mode": s.mode,
            "chapter_index": s.chapter_index,
            "total": s.total,
            "correct": s.correct,
            "accuracy": s.accuracy,
            "wpm": s.wpm,
            "xp_earned": s.xp_earned,
            "finished_at": s.finished_at.isoformat() if s.finished_at else None,
        })
    return out


@router.get("/typing/sessions/me/{session_id}")
async def my_typing_session_detail(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    s_r = await db.execute(
        select(TypingSession, WordDeck.title)
        .join(WordDeck, WordDeck.id == TypingSession.deck_id, isouter=True)
        .where(and_(TypingSession.id == session_id, TypingSession.user_id == user.id))
    )
    row = s_r.first()
    if not row:
        raise HTTPException(404, "Session not found")
    s, deck_title = row

    # Per-word answers — empty for sessions recorded before this feature existed,
    # in which case the client falls back to the aggregate stats below.
    ans_r = await db.execute(
        select(TypingAnswer, Word)
        .join(Word, Word.id == TypingAnswer.word_id)
        .where(TypingAnswer.session_id == session_id)
        .order_by(TypingAnswer.position)
    )
    words = [
        {
            "word": w.word,
            "phonetic": w.phonetic,
            "translation": w.translation,
            "correct": a.correct,
            "revealed": a.revealed,
            "audio_url": f"/api/v1/typing/words/{w.id}/audio",
        }
        for a, w in ans_r.all()
    ]
    return {
        "id": str(s.id),
        "deck_title": deck_title or ("Review" if s.mode == "review" else "Typing"),
        "mode": s.mode,
        "chapter_index": s.chapter_index,
        "total": s.total,
        "correct": s.correct,
        "accuracy": s.accuracy,
        "wpm": s.wpm,
        "duration_ms": s.duration_ms,
        "xp_earned": s.xp_earned,
        "finished_at": s.finished_at.isoformat() if s.finished_at else None,
        "words": words,
    }


# ── Stats ────────────────────────────────────────────────────────────────────


@router.get("/typing/stats")
async def typing_stats(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    agg_r = await db.execute(
        select(
            func.count().label("sessions"),
            func.coalesce(func.sum(TypingSession.total), 0).label("words"),
            func.coalesce(func.max(TypingSession.wpm), 0).label("best_wpm"),
            func.coalesce(func.avg(TypingSession.accuracy), 0).label("avg_acc"),
        ).where(and_(TypingSession.user_id == user.id, TypingSession.finished_at.isnot(None)))
    )
    agg = agg_r.one()

    mastered_r = await db.execute(
        select(func.count()).where(and_(WordProgress.user_id == user.id, WordProgress.mastered.is_(True)))
    )
    review_r = await db.execute(
        select(func.count()).where(and_(
            WordProgress.user_id == user.id,
            WordProgress.mastered.is_(False),
            WordProgress.wrong_count > 0,
        ))
    )
    return {
        "sessions": agg.sessions or 0,
        "words_typed": int(agg.words or 0),
        "best_wpm": int(agg.best_wpm or 0),
        "avg_accuracy": round(float(agg.avg_acc or 0)),
        "words_mastered": mastered_r.scalar() or 0,
        "review_count": review_r.scalar() or 0,
    }


# ── Audio ────────────────────────────────────────────────────────────────────


@router.get("/typing/words/{word_id}/audio")
async def stream_word_audio(
    word_id: UUID,
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Query-token auth: <audio> elements can't send an Authorization header.
    if not _valid_audio_token(token):
        raise HTTPException(401, "Invalid token")

    w_r = await db.execute(select(Word).where(Word.id == word_id))
    word = w_r.scalar_one_or_none()
    if not word:
        raise HTTPException(404, "Word not found")

    deck_r = await db.execute(select(WordDeck.accent).where(WordDeck.id == word.deck_id))
    accent = deck_r.scalar_one_or_none() or "us"
    voice = "uk" if accent == "uk" else "ana"

    # Synthesise-on-miss and cache to disk; the storage key is deterministic from
    # the word id, so there's nothing to persist back to the row (keeps this GET
    # side-effect free).
    key = await ensure_word_audio(word.id, word.word, voice=voice)

    try:
        path = get_file_path(key)
    except ValueError:
        raise HTTPException(404, "Audio file not found")
    if not path.exists():
        raise HTTPException(404, "Audio file not found")
    return FileResponse(str(path), media_type="audio/mpeg")
