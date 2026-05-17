import logging
from datetime import date, datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.security import create_access_token, decode_token
from app.models.module import Module, ModuleStatus, TopicType
from app.models.question import Question
from app.models.session import Session, SessionAnswer
from app.services.storage import get_file_path, object_exists, put_object

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sessions"])


class CreateSessionBody(BaseModel):
    module_id: str


class AnswerBody(BaseModel):
    question_id: str
    selection: dict
    time_spent_ms: int | None = None


class FinishBody(BaseModel):
    timezone: str | None = None


async def _get_owned_session(
    db: AsyncSession, session_id: UUID, user_id: UUID
) -> Session | None:
    result = await db.execute(
        select(Session).where(and_(Session.id == session_id, Session.user_id == user_id))
    )
    return result.scalar_one_or_none()


@router.post("/sessions", status_code=201)
async def create_session(
    body: CreateSessionBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Module).where(Module.id == UUID(body.module_id)))
    m = result.scalar_one_or_none()
    if not m or m.status != ModuleStatus.published:
        raise HTTPException(404, "Module not found")

    session = Session(
        user_id=user.id,
        module_id=UUID(body.module_id),
    )
    db.add(session)
    await db.flush()
    return {"id": str(session.id), "module_id": str(session.module_id)}


# NOTE: /sessions/me* routes must be registered BEFORE /sessions/{session_id}*
# so FastAPI does not capture "me" as a UUID parameter.

@router.get("/sessions/me")
async def my_sessions(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Session, Module)
        .join(Module, Session.module_id == Module.id)
        .where(and_(Session.user_id == user.id, Session.finished_at.isnot(None)))
        .order_by(Session.finished_at.desc())
        .limit(50)
    )
    rows = result.all()
    return [
        {
            "id": str(s.id),
            "module_id": str(s.module_id),
            "module_title": m.title,
            "module_topic": m.topic.value,
            "score_pct": s.score_pct,
            "correct_count": s.correct_count,
            "total": s.total,
            "xp_earned": s.xp_earned,
            "finished_at": s.finished_at.isoformat() if s.finished_at else None,
            "recording_blob": s.recording_blob,
            "flagged": s.flagged,
        }
        for s, m in rows
    ]


@router.get("/sessions/me/{session_id}/play-url")
async def get_my_session_play_url(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    s = await _get_owned_session(db, session_id, user.id)
    if not s or not s.recording_blob:
        raise HTTPException(404, "Recording not found")
    if not object_exists(s.recording_blob):
        raise HTTPException(404, "Recording file not found")
    stream_token = create_access_token(str(user.id), user.role.value)
    return {"url": f"/api/v1/sessions/{session_id}/stream?token={stream_token}"}


@router.get("/sessions/me/{session_id}")
async def get_my_session(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Session).where(
            and_(Session.id == session_id, Session.user_id == user.id, Session.finished_at.isnot(None))
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    ans_r = await db.execute(
        select(SessionAnswer).where(SessionAnswer.session_id == session_id)
    )
    answers = ans_r.scalars().all()

    qs_r = await db.execute(
        select(Question).where(Question.module_id == session.module_id).order_by(Question.position)
    )
    questions = {str(q.id): q for q in qs_r.scalars().all()}

    return {
        "id": str(session.id),
        "module_id": str(session.module_id),
        "score_pct": session.score_pct,
        "correct_count": session.correct_count,
        "total": session.total,
        "xp_earned": session.xp_earned,
        "finished_at": session.finished_at.isoformat() if session.finished_at else None,
        "recording_blob": session.recording_blob,
        "answers": [
            {
                "question_id": str(a.question_id),
                "selection": a.selection,
                "is_correct": a.is_correct,
                "time_spent_ms": a.time_spent_ms,
                "prompt": questions[str(a.question_id)].prompt if str(a.question_id) in questions else "",
                "kind": questions[str(a.question_id)].kind.value if str(a.question_id) in questions else "",
                "payload": questions[str(a.question_id)].payload if str(a.question_id) in questions else {},
            }
            for a in answers
        ],
    }


@router.patch("/sessions/{session_id}/answer")
async def submit_answer(
    session_id: UUID,
    body: AnswerBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    session = await _get_owned_session(db, session_id, user.id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session.finished_at:
        raise HTTPException(400, "Session already finished")

    q_r = await db.execute(select(Question).where(Question.id == UUID(body.question_id)))
    question = q_r.scalar_one_or_none()
    if not question:
        raise HTTPException(404, "Question not found")

    correct_answer = question.payload.get("answer", "")
    if question.kind.value == "match":
        pairs = question.payload.get("pairs", [])
        is_correct = all(
            body.selection.get(p["left"]) == p["right"] for p in pairs
        ) if pairs else False
    else:
        is_correct = body.selection.get("choice") == correct_answer

    existing = await db.execute(
        select(SessionAnswer).where(
            and_(SessionAnswer.session_id == session_id, SessionAnswer.question_id == UUID(body.question_id))
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Already answered")

    ans = SessionAnswer(
        session_id=session_id,
        question_id=UUID(body.question_id),
        selection=body.selection,
        is_correct=is_correct,
        time_spent_ms=body.time_spent_ms,
    )
    db.add(ans)
    return {"is_correct": is_correct}


@router.post("/sessions/{session_id}/finish")
async def finish_session(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: FinishBody | None = Body(default=None),
):
    session = await _get_owned_session(db, session_id, user.id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session.finished_at:
        raise HTTPException(400, "Already finished")

    ans_r = await db.execute(
        select(SessionAnswer).where(SessionAnswer.session_id == session_id)
    )
    answers = ans_r.scalars().all()
    total_r = await db.execute(
        select(Question).where(Question.module_id == session.module_id)
    )
    total_questions = len(total_r.scalars().all())

    correct_count = sum(1 for a in answers if a.is_correct)
    total = total_questions or len(answers)
    score_pct = round(correct_count / total * 100) if total > 0 else 0

    xp = correct_count * 40 + len(answers) * 10
    if score_pct == 100:
        xp += 60

    session.finished_at = datetime.now(timezone.utc)
    session.score_pct = score_pct
    session.correct_count = correct_count
    session.total = total
    session.xp_earned = xp

    await db.refresh(user)  # re-read latest xp_total before adding (avoids stale concurrent updates)
    user.xp_total += xp

    today = date.today()
    if user.last_seen_at:
        last_day = user.last_seen_at.date() if hasattr(user.last_seen_at, 'date') else today
        if last_day < today:
            user.streak = user.streak + 1 if (today - last_day).days == 1 else 1
    else:
        user.streak = 1

    user.last_seen_at = datetime.now(timezone.utc)

    await db.commit()

    try:
        from app.workers.tasks import check_achievements
        check_achievements.delay(str(user.id), str(session_id))
    except Exception:
        pass

    return {"score_pct": score_pct, "correct_count": correct_count, "total": total, "xp_earned": xp}


@router.post("/sessions/{session_id}/recording-chunk", status_code=204)
async def upload_recording_chunk(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    chunk: UploadFile = File(...),
):
    session = await _get_owned_session(db, session_id, user.id)
    if not session:
        raise HTTPException(404, "Session not found")

    data = await chunk.read()
    if not data:
        return

    key = f"recordings/{session_id}.webm"
    try:
        put_object(key, data, "video/webm")
    except Exception:
        logger.exception("Storage write failed for session %s", session_id)
        raise HTTPException(500, "Failed to save recording")
    session.recording_blob = key
    await db.commit()


@router.get("/sessions/{session_id}/stream")
async def stream_recording(
    session_id: UUID,
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")
    user_id = UUID(payload.get("sub"))

    s = await _get_owned_session(db, session_id, user_id)
    if not s or not s.recording_blob:
        raise HTTPException(404, "Recording not found")

    path = get_file_path(s.recording_blob)
    if not path.exists():
        raise HTTPException(404, "Recording file not found")
    return FileResponse(path, media_type="video/webm")


@router.get("/library")
async def get_library(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    topic: str | None = None,
    level: str | None = None,
):
    q = select(Module).where(Module.status == ModuleStatus.published)
    if topic and topic.lower() != "all":
        try:
            q = q.where(Module.topic == TopicType(topic.lower()))
        except ValueError:
            pass
    if level:
        q = q.where(Module.cefr_level == level)
    result = await db.execute(q)
    modules = result.scalars().all()

    out = []
    for m in modules:
        qc = await db.execute(select(func.count()).where(Question.module_id == m.id))
        questions_count = qc.scalar() or 0

        all_sessions = await db.execute(
            select(func.count(), func.avg(Session.score_pct))
            .where(and_(Session.module_id == m.id, Session.finished_at.isnot(None)))
        )
        row = all_sessions.one()
        attempts_total = row[0] or 0

        user_hs = await db.execute(
            select(func.max(Session.score_pct))
            .where(and_(Session.module_id == m.id, Session.user_id == user.id, Session.finished_at.isnot(None)))
        )
        high_score = user_hs.scalar()

        user_attempts = await db.execute(
            select(func.count())
            .where(and_(Session.module_id == m.id, Session.user_id == user.id, Session.finished_at.isnot(None)))
        )
        my_attempts = user_attempts.scalar() or 0

        lt_r = await db.execute(
            select(Session.finished_at)
            .where(and_(Session.module_id == m.id, Session.user_id == user.id, Session.finished_at.isnot(None)))
            .order_by(Session.finished_at.desc())
            .limit(1)
        )
        last_taken = lt_r.scalar()

        out.append({
            "id": str(m.id),
            "title": m.title,
            "topic": m.topic.value,
            "cefr_level": m.cefr_level.value,
            "questions_count": questions_count,
            "attempts_total": attempts_total,
            "my_attempts": my_attempts,
            "high_score": high_score,
            "last_taken": last_taken.isoformat() if last_taken else None,
        })
    return out
