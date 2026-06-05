"""Admin management for the typing trainer — full CRUD over word decks and words.

Decks own an ordered list of words; chapters are derived on read (every 10 words),
so admins only manage the flat word list here. Audio is synthesised on demand the
first time a word is played (content-addressed cache), so adding a word needs no
separate build step.
"""
import re
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AdminUser
from app.models.typing import DeckAssignment, TypingSession, Word, WordDeck
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin/typing", tags=["admin-typing"])

CHAPTER_SIZE = 10


def _slugify(title: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
    return s[:70] or "deck"


async def _unique_slug(db: AsyncSession, base: str, exclude_id: UUID | None = None) -> str:
    slug = base
    n = 1
    while True:
        q = select(WordDeck.id).where(WordDeck.slug == slug)
        if exclude_id:
            q = q.where(WordDeck.id != exclude_id)
        if (await db.execute(q)).first() is None:
            return slug
        n += 1
        slug = f"{base}-{n}"


# ── Pydantic bodies ───────────────────────────────────────────────────────────


class DeckIn(BaseModel):
    title: str
    description: str | None = None
    cefr_level: str | None = None
    accent: str = "us"
    is_published: bool = True


class DeckPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    cefr_level: str | None = None
    accent: str | None = None
    is_published: bool | None = None
    sort_order: int | None = None


class WordIn(BaseModel):
    word: str
    phonetic: str | None = None
    pos: str | None = None
    translation: str | None = None
    example: str | None = None
    example_translation: str | None = None


def _word_dict(w: Word) -> dict:
    return {
        "id": str(w.id),
        "position": w.position,
        "word": w.word,
        "phonetic": w.phonetic,
        "pos": w.pos,
        "translation": w.translation,
        "example": w.example,
        "example_translation": w.example_translation,
        "audio_url": f"/api/v1/typing/words/{w.id}/audio",
    }


# ── Decks ─────────────────────────────────────────────────────────────────────


@router.get("/decks")
async def list_decks(user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    decks_r = await db.execute(select(WordDeck).order_by(WordDeck.sort_order, WordDeck.created_at))
    decks = list(decks_r.scalars().all())
    if not decks:
        return []
    ids = [d.id for d in decks]

    counts = {row.deck_id: row.cnt for row in await db.execute(
        select(Word.deck_id, func.count().label("cnt")).where(Word.deck_id.in_(ids)).group_by(Word.deck_id)
    )}
    sessions = {row.deck_id: row.cnt for row in await db.execute(
        select(TypingSession.deck_id, func.count().label("cnt"))
        .where(TypingSession.deck_id.in_(ids), TypingSession.finished_at.isnot(None))
        .group_by(TypingSession.deck_id)
    )}
    assigned = {row.deck_id: row.cnt for row in await db.execute(
        select(DeckAssignment.deck_id, func.count().label("cnt"))
        .where(DeckAssignment.deck_id.in_(ids))
        .group_by(DeckAssignment.deck_id)
    )}

    return [
        {
            "id": str(d.id),
            "slug": d.slug,
            "title": d.title,
            "description": d.description,
            "cefr_level": d.cefr_level,
            "accent": d.accent,
            "is_published": d.is_published,
            "sort_order": d.sort_order,
            "word_count": counts.get(d.id, 0),
            "chapter_count": max(1, (counts.get(d.id, 0) + CHAPTER_SIZE - 1) // CHAPTER_SIZE) if counts.get(d.id, 0) else 0,
            "session_count": sessions.get(d.id, 0),
            "assigned_count": assigned.get(d.id, 0),
        }
        for d in decks
    ]


@router.get("/decks/{deck_id}")
async def get_deck(deck_id: UUID, user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    deck = (await db.execute(select(WordDeck).where(WordDeck.id == deck_id))).scalar_one_or_none()
    if not deck:
        raise HTTPException(404, "Deck not found")
    words_r = await db.execute(select(Word).where(Word.deck_id == deck_id).order_by(Word.position))
    return {
        "id": str(deck.id),
        "slug": deck.slug,
        "title": deck.title,
        "description": deck.description,
        "cefr_level": deck.cefr_level,
        "accent": deck.accent,
        "is_published": deck.is_published,
        "sort_order": deck.sort_order,
        "words": [_word_dict(w) for w in words_r.scalars().all()],
    }


@router.post("/decks", status_code=201)
async def create_deck(body: DeckIn, user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    max_sort = (await db.execute(select(func.coalesce(func.max(WordDeck.sort_order), 0)))).scalar() or 0
    deck = WordDeck(
        slug=await _unique_slug(db, _slugify(body.title)),
        title=body.title.strip(),
        description=(body.description or "").strip() or None,
        cefr_level=(body.cefr_level or "").strip() or None,
        accent=body.accent if body.accent in ("us", "uk") else "us",
        is_published=body.is_published,
        sort_order=max_sort + 1,
        created_by=user.id,
    )
    db.add(deck)
    await db.commit()
    return {"id": str(deck.id), "slug": deck.slug}


@router.patch("/decks/{deck_id}")
async def update_deck(deck_id: UUID, body: DeckPatch, user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    deck = (await db.execute(select(WordDeck).where(WordDeck.id == deck_id))).scalar_one_or_none()
    if not deck:
        raise HTTPException(404, "Deck not found")
    if body.title is not None and body.title.strip() and body.title.strip() != deck.title:
        deck.title = body.title.strip()
        deck.slug = await _unique_slug(db, _slugify(deck.title), exclude_id=deck.id)
    if body.description is not None:
        deck.description = body.description.strip() or None
    if body.cefr_level is not None:
        deck.cefr_level = body.cefr_level.strip() or None
    if body.accent is not None and body.accent in ("us", "uk"):
        deck.accent = body.accent
    if body.is_published is not None:
        deck.is_published = body.is_published
    if body.sort_order is not None:
        deck.sort_order = body.sort_order
    await db.commit()
    return {"id": str(deck.id), "is_published": deck.is_published}


@router.delete("/decks/{deck_id}", status_code=204)
async def delete_deck(deck_id: UUID, user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    deck = (await db.execute(select(WordDeck).where(WordDeck.id == deck_id))).scalar_one_or_none()
    if not deck:
        raise HTTPException(404, "Deck not found")
    await db.delete(deck)
    await db.commit()


# ── Words ─────────────────────────────────────────────────────────────────────


@router.post("/decks/{deck_id}/words", status_code=201)
async def add_word(deck_id: UUID, body: WordIn, user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    deck = (await db.execute(select(WordDeck.id).where(WordDeck.id == deck_id))).first()
    if not deck:
        raise HTTPException(404, "Deck not found")
    if not body.word.strip():
        raise HTTPException(400, "Word is required")
    # coalesce → -1 for an empty deck, so the first word lands at 0. (Plain `+ 1`,
    # not `max_pos or -1`: position 0 is falsy and would collide every word at 0.)
    max_pos = (await db.execute(
        select(func.coalesce(func.max(Word.position), -1)).where(Word.deck_id == deck_id)
    )).scalar()
    w = Word(
        deck_id=deck_id, position=max_pos + 1,
        word=body.word.strip(),
        phonetic=(body.phonetic or "").strip() or None,
        pos=(body.pos or "").strip() or None,
        translation=(body.translation or "").strip() or None,
        example=(body.example or "").strip() or None,
        example_translation=(body.example_translation or "").strip() or None,
    )
    db.add(w)
    await db.commit()
    return _word_dict(w)


@router.patch("/words/{word_id}")
async def update_word(word_id: UUID, body: WordIn, user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    w = (await db.execute(select(Word).where(Word.id == word_id))).scalar_one_or_none()
    if not w:
        raise HTTPException(404, "Word not found")
    if not body.word.strip():
        raise HTTPException(400, "Word is required")
    w.word = body.word.strip()
    w.phonetic = (body.phonetic or "").strip() or None
    w.pos = (body.pos or "").strip() or None
    w.translation = (body.translation or "").strip() or None
    w.example = (body.example or "").strip() or None
    w.example_translation = (body.example_translation or "").strip() or None
    await db.commit()
    return _word_dict(w)


@router.delete("/words/{word_id}", status_code=204)
async def delete_word(word_id: UUID, user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    w = (await db.execute(select(Word).where(Word.id == word_id))).scalar_one_or_none()
    if not w:
        raise HTTPException(404, "Word not found")
    await db.execute(sa_delete(Word).where(Word.id == word_id))
    await db.commit()


# ── Learner assignments ───────────────────────────────────────────────────────


class AssignBody(BaseModel):
    user_ids: list[str] = []


@router.get("/decks/{deck_id}/assignments")
async def get_deck_assignments(deck_id: UUID, user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    if not (await db.execute(select(WordDeck.id).where(WordDeck.id == deck_id))).first():
        raise HTTPException(404, "Deck not found")
    assigned_r = await db.execute(select(DeckAssignment.user_id).where(DeckAssignment.deck_id == deck_id))
    assigned = {row[0] for row in assigned_r}
    learners_r = await db.execute(
        select(User).where(User.role == UserRole.learner).order_by(User.display_name)
    )
    return {
        "learners": [
            {"id": str(u.id), "display_name": u.display_name, "email": u.email, "assigned": u.id in assigned}
            for u in learners_r.scalars()
        ]
    }


@router.put("/decks/{deck_id}/assignments")
async def set_deck_assignments(deck_id: UUID, body: AssignBody, user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    if not (await db.execute(select(WordDeck.id).where(WordDeck.id == deck_id))).first():
        raise HTTPException(404, "Deck not found")
    await db.execute(sa_delete(DeckAssignment).where(DeckAssignment.deck_id == deck_id))
    for uid_str in body.user_ids:
        try:
            db.add(DeckAssignment(deck_id=deck_id, user_id=UUID(uid_str), assigned_by=user.id))
        except ValueError:
            continue
    await db.commit()
    return {"ok": True, "assigned": len(body.user_ids)}
