from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

import random

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.security import decode_token
from app.models.module import Module, ModuleStatus, TopicType
from app.models.question import Question
from app.models.session import Session
from app.services.storage import get_file_path

router = APIRouter(tags=["modules"])


def _valid_audio_token(token: str) -> bool:
    """An access token, validated the same way as every other token consumer."""
    payload = decode_token(token)
    return bool(payload) and payload.get("type") == "access"


def _public_payload(payload: dict | None) -> dict:
    """Question payload safe to send during a live test.

    Drops `transcript` — it is only the seed-time TTS source for listening clips
    and must never reach the client, or a learner could read it instead of
    listening.
    """
    if not payload:
        return {}
    return {k: v for k, v in payload.items() if k != "transcript"}


class ModuleOut(BaseModel):
    id: str
    title: str
    topic: str
    cefr_level: str
    status: str
    questions_count: int
    attempts: int
    avg_score: int
    high_score: int | None
    last_taken: str | None
    created_at: str
    updated_at: str


@router.get("/modules", response_model=list[ModuleOut])
async def list_modules(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    topic: str | None = Query(None),
    level: str | None = Query(None),
    search: str | None = Query(None),
):
    q = select(Module).where(Module.status == ModuleStatus.published)
    if topic and topic.lower() != "all":
        try:
            q = q.where(Module.topic == TopicType(topic.lower()))
        except ValueError:
            pass
    if level:
        q = q.where(Module.cefr_level == level)
    if search:
        q = q.where(Module.title.ilike(f"%{search}%"))
    result = await db.execute(q)
    modules = result.scalars().all()

    if not modules:
        return []

    module_ids = [m.id for m in modules]

    qc_r = await db.execute(
        select(Question.module_id, func.count().label("cnt"))
        .where(Question.module_id.in_(module_ids))
        .group_by(Question.module_id)
    )
    question_counts = {row.module_id: row.cnt for row in qc_r}

    sess_r = await db.execute(
        select(
            Session.module_id,
            func.count().label("attempts"),
            func.avg(Session.score_pct).label("avg_score"),
        )
        .where(and_(Session.module_id.in_(module_ids), Session.finished_at.isnot(None)))
        .group_by(Session.module_id)
    )
    global_stats = {row.module_id: row for row in sess_r}

    user_r = await db.execute(
        select(
            Session.module_id,
            func.max(Session.score_pct).label("high_score"),
            func.max(Session.finished_at).label("last_taken"),
        )
        .where(and_(
            Session.module_id.in_(module_ids),
            Session.user_id == user.id,
            Session.finished_at.isnot(None),
        ))
        .group_by(Session.module_id)
    )
    user_stats = {row.module_id: row for row in user_r}

    out = []
    for m in modules:
        g = global_stats.get(m.id)
        u = user_stats.get(m.id)
        out.append(ModuleOut(
            id=str(m.id),
            title=m.title,
            topic=m.topic.value,
            cefr_level=m.cefr_level.value,
            status=m.status.value,
            questions_count=question_counts.get(m.id, 0),
            attempts=g.attempts if g else 0,
            avg_score=round(float(g.avg_score or 0)) if g else 0,
            high_score=u.high_score if u else None,
            last_taken=u.last_taken.isoformat() if u and u.last_taken else None,
            created_at=m.created_at.isoformat(),
            updated_at=m.updated_at.isoformat(),
        ))
    return out


@router.get("/modules/{module_id}")
async def get_module(
    module_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    session_id: str | None = Query(None),
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    m = result.scalar_one_or_none()
    if not m or m.status != ModuleStatus.published:
        raise HTTPException(404, "Module not found")

    q_r = await db.execute(
        select(Question).where(Question.module_id == module_id).order_by(Question.position)
    )
    questions = list(q_r.scalars().all())

    if session_id:
        rng = random.Random(session_id)
        rng.shuffle(questions)

    return {
        "id": str(m.id),
        "title": m.title,
        "topic": m.topic.value,
        "cefr_level": m.cefr_level.value,
        "status": m.status.value,
        "audio_blob": m.audio_blob,
        "audio_duration_seconds": m.audio_duration_seconds,
        "deadline": m.deadline.isoformat() if m.deadline else None,
        "is_closed": m.is_closed,
        "max_attempts": m.max_attempts,
        "show_live_feedback": m.show_live_feedback,
        "is_exam": m.is_exam,
        "exam_duration_minutes": m.exam_duration_minutes,
        "require_camera": user.require_camera,
        "questions": [
            {
                "id": str(q.id),
                "position": q.position,
                "kind": q.kind.value,
                "prompt": q.prompt,
                "context": q.context,
                "sentence": q.sentence,
                "payload": _public_payload(q.payload),
                "explain": q.explain,
            }
            for q in questions
        ],
    }


@router.get("/modules/{module_id}/audio")
async def stream_module_audio(
    module_id: UUID,
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Query-token auth: <audio> elements can't send an Authorization header.
    if not _valid_audio_token(token):
        raise HTTPException(401, "Invalid token")

    result = await db.execute(select(Module).where(Module.id == module_id))
    m = result.scalar_one_or_none()
    if not m or m.status != ModuleStatus.published:
        raise HTTPException(404, "Module not found")
    if not m.audio_blob:
        raise HTTPException(404, "No audio for this module")
    try:
        path = get_file_path(m.audio_blob)
    except ValueError:
        raise HTTPException(404, "Audio file not found")
    if not path.exists():
        raise HTTPException(404, "Audio file not found")
    return FileResponse(str(path), media_type="audio/mpeg")


@router.get("/modules/{module_id}/questions/{question_id}/audio")
async def stream_question_audio(
    module_id: UUID,
    question_id: UUID,
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Per-question audio (dictation sentence / listening clip). Query-token auth
    # because the browser's <audio> element can't attach a bearer header.
    if not _valid_audio_token(token):
        raise HTTPException(401, "Invalid token")

    q_r = await db.execute(
        select(Question)
        .join(Module, Question.module_id == Module.id)
        .where(
            Question.id == question_id,
            Question.module_id == module_id,
            Module.status == ModuleStatus.published,
        )
    )
    q = q_r.scalar_one_or_none()
    if not q:
        raise HTTPException(404, "Question not found")
    audio_key = (q.payload or {}).get("audio")
    if not audio_key:
        raise HTTPException(404, "No audio for this question")
    try:
        path = get_file_path(audio_key)
    except ValueError:
        raise HTTPException(404, "Audio file not found")
    if not path.exists():
        raise HTTPException(404, "Audio file not found")
    return FileResponse(str(path), media_type="audio/mpeg")
