"""Per-word pronunciation audio for the typing trainer.

Words get real, human-sounding neural audio (edge-tts) rather than the robotic
browser SpeechSynthesis fallback. Audio is rendered once to an MP3 in the
``filedata`` volume and reused. Built-in decks are pre-rendered at seed time, but
any word missing a file is synthesised on first request and cached — so
admin-added words work without a separate build step.
"""
from __future__ import annotations

import asyncio
import os
import uuid

from app.services.storage import get_file_path, object_exists, put_object
from app.services.tts import synthesize

# Slower, clearer reading for single words/phrases.
WORD_RATE = "-8%"

# Guards against two concurrent requests synthesising the same word at once.
_locks: dict[str, asyncio.Lock] = {}


def audio_key_for_word(word_id: uuid.UUID | str) -> str:
    return f"word_audio/{word_id}.mp3"


async def ensure_word_audio(word_id: uuid.UUID | str, text: str, voice: str | None = None) -> str:
    """Return the storage key for a word's audio, synthesising + caching if absent.

    The write is atomic (temp file + ``os.replace``) so a concurrent reader never
    sees a half-written MP3, and a per-key lock avoids duplicate synthesis.
    """
    key = audio_key_for_word(word_id)
    if object_exists(key):
        return key

    lock = _locks.setdefault(str(word_id), asyncio.Lock())
    async with lock:
        if object_exists(key):  # another coroutine finished while we waited
            return key
        data = await synthesize(text, voice=voice, rate=WORD_RATE)
        path = get_file_path(key)
        tmp = path.with_suffix(f".{uuid.uuid4().hex}.tmp")
        tmp.write_bytes(data)
        os.replace(tmp, path)
    return key


def ensure_word_audio_sync(word_id: uuid.UUID | str, text: str, voice: str | None = None) -> str:
    """Blocking variant for the seed script (no running event loop required)."""
    key = audio_key_for_word(word_id)
    if object_exists(key):
        return key
    data = asyncio.run(synthesize(text, voice=voice, rate=WORD_RATE))
    put_object(key, data, "audio/mpeg")
    return key
