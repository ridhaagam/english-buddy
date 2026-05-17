"""Audio import — MP3/WAV/M4A → transcript → MCQ questions via Whisper."""
import io
import os
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser, require_role
from app.models.user import UserRole
from app.models.module import CefrLevel, Module, ModuleStatus, SourceKind, TopicType
from app.models.question import Question, QuestionKind

router = APIRouter(tags=["admin-import-audio"])

AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm"}


class AudioFinalizeBody(BaseModel):
    title: str
    cefr_level: str = "B1"
    questions: list[dict]
    transcript: str | None = None


def _transcribe(audio_bytes: bytes, filename: str) -> str:
    """Transcribe audio using faster-whisper if available, else openai-whisper."""
    import tempfile
    suffix = os.path.splitext(filename)[1] or ".mp3"
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    os.close(tmp_fd)
    with open(tmp_path, "wb") as f:
        f.write(audio_bytes)

    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
        segments, _ = model.transcribe(tmp_path, beam_size=1)
        text = " ".join(s.text.strip() for s in segments)
    except ImportError:
        try:
            import whisper
            model = whisper.load_model("tiny")
            result = model.transcribe(tmp_path)
            text = result.get("text", "")
        except ImportError:
            raise HTTPException(503, "Whisper not installed. Add faster-whisper to requirements.")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return text.strip()


def _build_questions_from_transcript(transcript: str) -> list[dict]:
    """Build simple listening comprehension questions from a transcript."""
    sentences = [s.strip() for s in transcript.split(".") if len(s.strip()) > 20]
    questions = []
    for i, sentence in enumerate(sentences[:5]):
        words = sentence.split()
        if len(words) < 6:
            continue
        # Pick a key word to blank
        blank_idx = len(words) // 2
        blank_word = words[blank_idx]
        if len(blank_word) < 4:
            blank_idx = min(blank_idx + 1, len(words) - 1)
            blank_word = words[blank_idx]

        sentence_with_blank = " ".join(
            "__" if j == blank_idx else w for j, w in enumerate(words)
        )
        choices = [
            {"id": "a", "label": blank_word},
            {"id": "b", "label": words[blank_idx - 1] if blank_idx > 0 else "the"},
            {"id": "c", "label": words[blank_idx + 1] if blank_idx < len(words) - 1 else "a"},
            {"id": "d", "label": "none of the above"},
        ]
        questions.append({
            "kind": "fill",
            "prompt": "Choose the word that best completes the sentence from the audio.",
            "sentence": sentence_with_blank,
            "payload": {"choices": choices, "answer": "a"},
            "explain": f'The correct word is "{blank_word}".',
        })

    if not questions:
        questions.append({
            "kind": "choice",
            "prompt": "What is the main topic discussed in this audio clip?",
            "payload": {
                "choices": [
                    {"id": "a", "label": "General information"},
                    {"id": "b", "label": "Technical details"},
                    {"id": "c", "label": "Personal story"},
                    {"id": "d", "label": "Historical events"},
                ],
                "answer": "a",
            },
            "explain": "Review the transcript to identify the main topic.",
        })

    return questions


@router.post("/admin/import/audio")
async def import_audio(
    file: Annotated[UploadFile, File(...)],
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[None, Depends(require_role(UserRole.editor, UserRole.admin, UserRole.owner))],
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in AUDIO_EXTS:
        raise HTTPException(400, f"Unsupported audio format. Allowed: {', '.join(AUDIO_EXTS)}")

    data = await file.read()

    # Archive original file to local storage for auditing
    source_blob = None
    try:
        from app.services.storage import put_object
        key = f"audio-imports/{uuid.uuid4()}/{file.filename}"
        put_object(key, data, file.content_type or "audio/mpeg")
        source_blob = key
    except Exception:
        pass

    # Transcribe
    try:
        transcript = _transcribe(data, file.filename or "audio.mp3")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {e}")

    questions = _build_questions_from_transcript(transcript)

    return {
        "title": (file.filename or "audio").rsplit(".", 1)[0].replace("_", " ").title(),
        "transcript": transcript,
        "question_count": len(questions),
        "questions": questions,
        "source_blob": source_blob,
    }


@router.post("/admin/import/audio/finalize", status_code=201)
async def finalize_audio_import(
    body: AudioFinalizeBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[None, Depends(require_role(UserRole.editor, UserRole.admin, UserRole.owner))],
):
    try:
        cefr = CefrLevel(body.cefr_level)
    except ValueError:
        cefr = CefrLevel.B1

    module = Module(
        title=body.title,
        topic=TopicType.listening,
        cefr_level=cefr,
        status=ModuleStatus.draft,
        created_by=user.id,
        source_kind=SourceKind.imported_audio,
    )
    db.add(module)
    await db.flush()

    for i, qdata in enumerate(body.questions):
        q = Question(
            module_id=module.id,
            position=i,
            kind=QuestionKind(qdata.get("kind", "choice")),
            prompt=qdata["prompt"],
            sentence=qdata.get("sentence"),
            payload=qdata["payload"],
            explain=qdata.get("explain"),
        )
        db.add(q)

    await db.commit()
    return {"module_id": str(module.id), "title": module.title, "questions": len(body.questions)}
