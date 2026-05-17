import logging
from datetime import date, datetime, timezone
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.security import create_access_token, decode_token
from app.models.module import Module, ModuleStatus, TopicType
from app.models.question import Question
from app.models.session import Session, SessionAnswer, SessionEvent
from app.services.storage import append_object, get_file_path, object_exists, put_object

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sessions"])


class CreateSessionBody(BaseModel):
    module_id: str


class AnswerBody(BaseModel):
    question_id: str
    selection: dict
    time_spent_ms: int | None = None
    tab_switch: bool = False
    face_anomaly: bool = False


class FinishBody(BaseModel):
    timezone: str | None = None
    tab_switch_count: int = 0
    face_anomaly_count: int = 0


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

    if m.is_closed:
        raise HTTPException(403, "Module is closed")

    if m.deadline:
        if datetime.now(timezone.utc) > m.deadline:
            raise HTTPException(403, "Module deadline has passed")

    if m.max_attempts:
        attempts_r = await db.execute(
            select(func.count()).where(
                and_(Session.module_id == m.id, Session.user_id == user.id, Session.finished_at.isnot(None))
            )
        )
        if (attempts_r.scalar() or 0) >= m.max_attempts:
            raise HTTPException(403, "Maximum attempts reached")

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
    dedupe: bool = False,
):
    if dedupe:
        # Return only the most-recent session per module using a subquery
        sub = (
            select(
                Session.id,
                func.row_number().over(
                    partition_by=Session.module_id,
                    order_by=Session.finished_at.desc(),
                ).label("rn"),
            )
            .where(and_(Session.user_id == user.id, Session.finished_at.isnot(None)))
            .subquery()
        )
        result = await db.execute(
            select(Session, Module)
            .join(Module, Session.module_id == Module.id)
            .join(sub, Session.id == sub.c.id)
            .where(sub.c.rn == 1)
            .order_by(Session.finished_at.desc())
            .limit(50)
        )
    else:
        result = await db.execute(
            select(Session, Module)
            .join(Module, Session.module_id == Module.id)
            .where(and_(Session.user_id == user.id, Session.finished_at.isnot(None)))
            .order_by(Session.finished_at.desc())
            .limit(50)
        )
    rows = result.all()
    now = datetime.now(timezone.utc)
    out = []
    for s, m in rows:
        if m.reveal_at:
            revealed = now >= m.reveal_at
        elif m.show_answers_after_deadline and m.deadline:
            revealed = now >= m.deadline
        else:
            revealed = False
        out.append({
            "id": str(s.id),
            "module_id": str(s.module_id),
            "module_title": m.title,
            "module_topic": m.topic.value,
            "score_pct": s.score_pct if revealed else None,
            "correct_count": s.correct_count if revealed else None,
            "total": s.total,
            "xp_earned": s.xp_earned,
            "tab_switch_count": s.tab_switch_count,
            "face_anomaly_count": s.face_anomaly_count,
            "finished_at": s.finished_at.isoformat() if s.finished_at else None,
            "recording_blob": s.recording_blob,
            "flagged": s.flagged,
            "answers_revealed": revealed,
        })
    return out


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

    mod_r = await db.execute(select(Module).where(Module.id == session.module_id))
    module = mod_r.scalar_one_or_none()

    # Answers are hidden by default; only revealed when a past trigger exists.
    # Revealed when:
    #   a) reveal_at is set and has already passed
    #   b) show_answers_after_deadline=True and deadline is set and has passed
    answers_revealed = False
    effective_reveal_at = None
    if module:
        if module.reveal_at:
            effective_reveal_at = module.reveal_at
            answers_revealed = datetime.now(timezone.utc) >= module.reveal_at
        elif module.show_answers_after_deadline and module.deadline:
            effective_reveal_at = module.deadline
            answers_revealed = datetime.now(timezone.utc) >= module.deadline

    ans_r = await db.execute(
        select(SessionAnswer).where(SessionAnswer.session_id == session_id)
    )
    answers = ans_r.scalars().all()

    qs_r = await db.execute(
        select(Question).where(Question.module_id == session.module_id).order_by(Question.position)
    )
    questions = {str(q.id): q for q in qs_r.scalars().all()}

    def _public_payload(a: SessionAnswer, q) -> dict:
        if not q:
            return {}
        payload = dict(q.payload)
        # Only strip the correct answer key if results are still hidden
        if not answers_revealed:
            payload.pop("answer", None)
        return payload

    return {
        "id": str(session.id),
        "module_id": str(session.module_id),
        "module_title": module.title if module else "",
        "reveal_at": effective_reveal_at.isoformat() if effective_reveal_at else None,
        "answers_revealed": answers_revealed,
        "score_pct": session.score_pct if answers_revealed else None,
        "correct_count": session.correct_count if answers_revealed else None,
        "total": session.total,
        "xp_earned": session.xp_earned,
        "tab_switch_count": session.tab_switch_count,
        "face_anomaly_count": session.face_anomaly_count,
        "finished_at": session.finished_at.isoformat() if session.finished_at else None,
        "recording_blob": session.recording_blob,
        "answers": [
            {
                "question_id": str(a.question_id),
                # selection is always returned — it's the user's own answer
                "selection": a.selection,
                # is_correct is gated until answers are revealed
                "is_correct": a.is_correct if answers_revealed else None,
                "time_spent_ms": a.time_spent_ms,
                "flagged": a.flagged,
                "admin_comment": a.admin_comment,
                "tab_switch": a.tab_switch,
                "face_anomaly": a.face_anomaly,
                "question_prompt": questions[str(a.question_id)].prompt if str(a.question_id) in questions else "",
                "kind": questions[str(a.question_id)].kind.value if str(a.question_id) in questions else "",
                "payload": _public_payload(a, questions.get(str(a.question_id))),
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
        tab_switch=body.tab_switch,
        face_anomaly=body.face_anomaly,
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
        select(func.count()).where(Question.module_id == session.module_id)
    )
    total_questions = total_r.scalar() or 0

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
    if body:
        session.tab_switch_count = body.tab_switch_count
        session.face_anomaly_count = body.face_anomaly_count

    await db.refresh(user)  # avoid stale xp_total on concurrent sessions
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

    mod_r = await db.execute(select(Module).where(Module.id == session.module_id))
    module = mod_r.scalar_one_or_none()
    answers_revealed = False
    if module:
        if module.reveal_at:
            answers_revealed = datetime.now(timezone.utc) >= module.reveal_at
        elif module.show_answers_after_deadline and module.deadline:
            answers_revealed = datetime.now(timezone.utc) >= module.deadline

    return {"score_pct": score_pct, "correct_count": correct_count, "total": total, "xp_earned": xp, "answers_revealed": answers_revealed}


@router.post("/sessions/{session_id}/recording-chunk", status_code=204)
async def upload_recording_chunk(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    chunk: UploadFile = File(...),
    chunk_index: int = Form(0),
):
    session = await _get_owned_session(db, session_id, user.id)
    if not session:
        raise HTTPException(404, "Session not found")

    data = await chunk.read()
    if not data:
        return

    key = f"recordings/{session_id}.webm"
    try:
        # chunk_index 0 always overwrites — each MediaRecorder run produces a new
        # EBML init segment, so we must start fresh rather than appending to a
        # file that already has headers from a previous recorder instance.
        if chunk_index == 0:
            put_object(key, data, "video/webm")
        else:
            append_object(key, data, "video/webm")
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
        select(Session.module_id, func.count().label("attempts_total"))
        .where(and_(Session.module_id.in_(module_ids), Session.finished_at.isnot(None)))
        .group_by(Session.module_id)
    )
    global_stats = {row.module_id: row for row in sess_r}

    user_r = await db.execute(
        select(
            Session.module_id,
            func.max(Session.score_pct).label("high_score"),
            func.count().label("my_attempts"),
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
        out.append({
            "id": str(m.id),
            "title": m.title,
            "topic": m.topic.value,
            "cefr_level": m.cefr_level.value,
            "questions_count": question_counts.get(m.id, 0),
            "attempts_total": g.attempts_total if g else 0,
            "my_attempts": u.my_attempts if u else 0,
            "high_score": u.high_score if u else None,
            "last_taken": u.last_taken.isoformat() if u and u.last_taken else None,
        })
    return out


class SessionEventBody(BaseModel):
    event_type: Literal["open", "interrupt", "close", "resume"]
    event_data: dict | None = None


@router.post("/sessions/{session_id}/event", status_code=204)
async def log_session_event(
    session_id: UUID,
    body: SessionEventBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    session = await _get_owned_session(db, session_id, user.id)
    if not session:
        raise HTTPException(404, "Session not found")

    event = SessionEvent(
        session_id=session_id,
        user_id=user.id,
        event_type=body.event_type,
        event_data=body.event_data,
    )
    db.add(event)
    await db.commit()
