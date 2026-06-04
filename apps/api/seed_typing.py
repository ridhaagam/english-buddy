"""Seed the typing-trainer word decks. Idempotent — upserts by slug/position so
re-running never wipes a learner's word progress, and pre-renders neural audio
(best-effort) so words sound human from the first play.

Word content lives in data/typing_decks.json (generated + verified out of band);
per-deck presentation metadata lives in DECK_META below.

Run standalone inside Docker:  docker compose exec api python seed_typing.py
Also invoked by seed.py on a fresh install.
"""
import asyncio
import json
import os

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.typing import Word, WordDeck
from app.models.user import User, UserRole

_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "typing_decks.json")

# Presentation metadata per deck, in display order. Words come from the JSON.
DECK_META: list[dict] = [
    {"slug": "everyday-a1", "title": "Everyday Essentials",
     "description": "The words you reach for every single day. A gentle warm-up.",
     "level": "A1", "accent": "us"},
    {"slug": "travel-a2", "title": "Travel & Directions",
     "description": "Airports, hotels and getting around: vocabulary for the road.",
     "level": "A2", "accent": "us"},
    {"slug": "work-b1", "title": "Work & Office",
     "description": "Email, meetings and deadlines: the language of the workplace.",
     "level": "B1", "accent": "us"},
    {"slug": "phrasal-b1", "title": "Phrasal Verbs",
     "description": "The most common two-word verbs in everyday spoken English.",
     "level": "B1", "accent": "uk"},
    {"slug": "academic-b2", "title": "Academic Word List",
     "description": "Essential vocabulary for essays, research and university study.",
     "level": "B2", "accent": "uk"},
    {"slug": "business-b2", "title": "Business English",
     "description": "Finance, strategy and negotiation for the modern office.",
     "level": "B2", "accent": "uk"},
]


def _load_decks() -> list[dict]:
    with open(_DATA_PATH, encoding="utf-8") as f:
        raw = json.load(f)
    by_slug = {d["slug"]: d.get("words", []) for d in raw}
    decks = []
    for meta in DECK_META:
        words = by_slug.get(meta["slug"], [])
        if not words:
            continue
        decks.append({**meta, "words": words})
    return decks


async def _upsert_deck(db, owner_id, dspec, sort_order, render_audio=True):
    res = await db.execute(select(WordDeck).where(WordDeck.slug == dspec["slug"]))
    deck = res.scalar_one_or_none()
    if deck is None:
        deck = WordDeck(slug=dspec["slug"], created_by=owner_id)
        db.add(deck)
    deck.title = dspec["title"]
    deck.description = dspec.get("description")
    deck.cefr_level = dspec.get("level")
    deck.accent = dspec.get("accent", "us")
    deck.is_published = True
    deck.sort_order = sort_order
    await db.flush()

    # Existing words by position — update in place so ids (and progress) survive.
    ex_res = await db.execute(select(Word).where(Word.deck_id == deck.id).order_by(Word.position))
    existing = {w.position: w for w in ex_res.scalars().all()}

    voice = "uk" if deck.accent == "uk" else "ana"
    for i, wspec in enumerate(dspec["words"]):
        w = existing.get(i)
        if w is None:
            w = Word(deck_id=deck.id, position=i)
            db.add(w)
        w.word = wspec["word"]
        w.phonetic = wspec.get("phonetic")
        w.pos = wspec.get("pos")
        w.translation = wspec.get("translation")
        w.example = wspec.get("example")
        w.example_translation = wspec.get("example_translation")
        await db.flush()

        if render_audio:
            try:
                from app.services.word_audio import ensure_word_audio
                w.audio_key = await ensure_word_audio(w.id, w.word, voice=voice)
            except Exception as exc:  # network/TTS hiccup — endpoint will retry on demand
                print(f"  ! audio skipped for '{w.word}': {exc}")

    # Trim words removed from the spec (cascades their progress, which is correct).
    for pos, w in existing.items():
        if pos >= len(dspec["words"]):
            await db.delete(w)

    await db.flush()
    return deck


async def seed_typing(db, owner_id=None, render_audio=True):
    if owner_id is None:
        r = await db.execute(select(User).where(User.role == UserRole.owner).order_by(User.created_at))
        owner = r.scalars().first()
        owner_id = owner.id if owner else None

    decks = _load_decks()
    for i, dspec in enumerate(decks):
        deck = await _upsert_deck(db, owner_id, dspec, sort_order=i, render_audio=render_audio)
        print(f"✓ deck '{deck.slug}' — {len(dspec['words'])} words")
    await db.commit()


async def _main():
    async with AsyncSessionLocal() as db:
        await seed_typing(db)
    print("✓ Typing decks seeded.")


if __name__ == "__main__":
    asyncio.run(_main())
