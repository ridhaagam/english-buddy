"""Text-to-speech using Microsoft neural voices (edge-tts).

Produces natural, human-sounding narration that is rendered once to MP3 and then
served as a static file. Used to attach audio to dictation and listening
questions so learners hear a real voice rather than the robotic browser
SpeechSynthesis fallback.
"""
from __future__ import annotations

import edge_tts

# Warm, natural voices. Pick by name so a two-person listening clip can use
# distinct speakers and still sound human.
VOICES: dict[str, str] = {
    "aria": "en-US-AriaNeural",      # warm female — default narrator
    "jenny": "en-US-JennyNeural",    # friendly female
    "guy": "en-US-GuyNeural",        # natural male
    "ana": "en-US-AnaNeural",        # younger, clear — good for single words
    "uk": "en-GB-SoniaNeural",       # British female
}

DEFAULT_VOICE = "aria"


def resolve_voice(name: str | None) -> str:
    """Map a short key (e.g. 'guy') to a full edge-tts voice id."""
    if not name:
        return VOICES[DEFAULT_VOICE]
    return VOICES.get(name, name if "-" in name else VOICES[DEFAULT_VOICE])


async def synthesize(text: str, voice: str | None = None, rate: str = "-6%") -> bytes:
    """Render text to MP3 bytes.

    rate is an edge-tts percentage string; a slightly slower default keeps
    dictation clear without sounding unnatural.
    """
    communicate = edge_tts.Communicate(text, resolve_voice(voice), rate=rate)
    buf = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.extend(chunk["data"])
    if not buf:
        raise RuntimeError(f"TTS produced no audio for: {text!r}")
    return bytes(buf)
