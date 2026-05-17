from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AdminUser
from app.models.module import Module
from app.models.session import Session, SessionAnswer, SessionEvent
from app.models.user import User

router = APIRouter(prefix="/admin/recordings", tags=["admin-recordings"])


class FlagBody(BaseModel):
    reason: str | None = None


class AnswerFlagBody(BaseModel):
    flagged: bool
    admin_comment: str | None = None


@router.get("")
async def list_recordings(
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    topic: str | None = Query(None),
    flagged: bool | None = Query(None),
    user_id: str | None = Query(None, alias="user"),
    module_id: str | None = Query(None, alias="module"),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
):
    q = (
        select(Session, User, Module)
        .join(User, Session.user_id == User.id)
        .join(Module, Session.module_id == Module.id)
        .where(Session.finished_at.isnot(None))
    )
    if flagged is not None:
        q = q.where(Session.flagged == flagged)
    if user_id:
        q = q.where(Session.user_id == UUID(user_id))
    if module_id:
        q = q.where(Session.module_id == UUID(module_id))
    if topic:
        from app.models.module import TopicType
        try:
            q = q.where(Module.topic == TopicType(topic.lower()))
        except ValueError:
            pass
    q = q.order_by(Session.finished_at.desc()).limit(limit).offset(offset)

    result = await db.execute(q)
    rows = result.all()

    return [
        {
            "id": str(s.id),
            "user_name": u.display_name,
            "user_email": u.email,
            "user_id": str(u.id),
            "module_id": str(m.id),
            "module_title": m.title,
            "topic": m.topic.value,
            "score_pct": s.score_pct,
            "correct_count": s.correct_count,
            "total": s.total,
            "recording_blob": s.recording_blob,
            "flagged": s.flagged,
            "flag_reason": s.flag_reason,
            "tab_switch_count": s.tab_switch_count,
            "face_anomaly_count": s.face_anomaly_count,
            "finished_at": s.finished_at.isoformat() if s.finished_at else None,
        }
        for s, u, m in rows
    ]


@router.get("/export/csv")
async def export_recordings_csv(
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from fastapi.responses import StreamingResponse
    import csv
    import io

    result = await db.execute(
        select(Session, User, Module)
        .join(User, Session.user_id == User.id)
        .join(Module, Session.module_id == Module.id)
        .where(Session.finished_at.isnot(None))
        .order_by(Session.finished_at.desc())
        .limit(5000)
    )
    rows = result.all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["session_id", "user_name", "user_email", "module_title", "topic", "score_pct", "correct", "total", "flagged", "recording_blob", "finished_at"])
    for s, u, m in rows:
        writer.writerow([str(s.id), u.display_name, u.email, m.title, m.topic.value, s.score_pct, s.correct_count, s.total, s.flagged, s.recording_blob or "", s.finished_at.isoformat() if s.finished_at else ""])

    buf.seek(0)
    return StreamingResponse(
        iter([buf.read()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=recordings.csv"},
    )


@router.get("/{recording_id}")
async def get_recording(
    recording_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Session, User, Module)
        .join(User, Session.user_id == User.id)
        .join(Module, Session.module_id == Module.id)
        .where(Session.id == recording_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(404, "Recording not found")
    s, u, m = row

    from app.models.question import Question
    ans_r = await db.execute(
        select(SessionAnswer, Question)
        .join(Question, SessionAnswer.question_id == Question.id)
        .where(SessionAnswer.session_id == recording_id)
        .order_by(Question.position)
    )
    answers = ans_r.all()

    return {
        "id": str(s.id),
        "user": {"id": str(u.id), "name": u.display_name, "email": u.email},
        "user_name": u.display_name,
        "module_id": str(m.id),
        "module_title": m.title,
        "topic": m.topic.value,
        "score_pct": s.score_pct,
        "correct_count": s.correct_count,
        "total": s.total,
        "recording_blob": s.recording_blob,
        "flagged": s.flagged,
        "flag_reason": s.flag_reason,
        "admin_comment": s.admin_comment,
        "tab_switch_count": s.tab_switch_count,
        "face_anomaly_count": s.face_anomaly_count,
        "finished_at": s.finished_at.isoformat() if s.finished_at else None,
        "answers": [
            {
                "question_id": str(a.question_id),
                "question_prompt": q.prompt,
                "question_kind": q.kind.value,
                "payload": q.payload,
                "selection": a.selection,
                "is_correct": a.is_correct,
                "time_spent_ms": a.time_spent_ms,
                "flagged": a.flagged,
                "admin_comment": a.admin_comment,
                "tab_switch": a.tab_switch,
                "face_anomaly": a.face_anomaly,
            }
            for a, q in answers
        ],
    }


@router.get("/{recording_id}/play-url")
async def get_play_url(
    recording_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Session).where(Session.id == recording_id))
    s = result.scalar_one_or_none()
    if not s or not s.recording_blob:
        raise HTTPException(404, "Recording not found")
    from app.services.storage import object_exists
    if not object_exists(s.recording_blob):
        raise HTTPException(404, "Recording file not found on disk")
    from app.core.security import create_access_token
    stream_token = create_access_token(str(user.id), user.role.value)
    return {"url": f"/api/v1/admin/recordings/{recording_id}/stream?token={stream_token}"}


@router.get("/{recording_id}/stream")
async def stream_recording(
    recording_id: UUID,
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from fastapi.responses import FileResponse
    from uuid import UUID as _UUID
    from app.core.security import decode_token
    from app.services.storage import get_file_path
    from app.models.user import UserRole

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(401, "Invalid token")
    role_str = payload.get("role", "")
    try:
        role = UserRole(role_str)
    except ValueError:
        raise HTTPException(403, "Insufficient permissions")
    if role not in (UserRole.admin, UserRole.owner):
        raise HTTPException(403, "Admin access required")

    result = await db.execute(select(Session).where(Session.id == recording_id))
    s = result.scalar_one_or_none()
    if not s or not s.recording_blob:
        raise HTTPException(404, "Recording not found")
    path = get_file_path(s.recording_blob)
    if not path.exists():
        raise HTTPException(404, "Recording file not found")
    return FileResponse(path, media_type="video/webm")


@router.patch("/{recording_id}/answers/{question_id}/flag")
async def flag_answer(
    recording_id: UUID,
    question_id: UUID,
    body: AnswerFlagBody,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from sqlalchemy import and_
    result = await db.execute(
        select(SessionAnswer).where(
            and_(SessionAnswer.session_id == recording_id, SessionAnswer.question_id == question_id)
        )
    )
    ans = result.scalar_one_or_none()
    if not ans:
        raise HTTPException(404, "Answer not found")
    ans.flagged = body.flagged
    ans.admin_comment = body.admin_comment
    from app.api.admin.audit import write_log
    await write_log(
        db, actor_id=user.id, action="flag_answer", target_kind="session_answer",
        target_id=f"{recording_id}/{question_id}",
        payload={"flagged": body.flagged, "comment": body.admin_comment},
    )
    await db.commit()
    return {"ok": True}


@router.post("/{recording_id}/flag")
async def flag_recording(
    recording_id: UUID,
    body: FlagBody,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Session).where(Session.id == recording_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Recording not found")
    s.flagged = True
    s.flag_reason = body.reason
    from app.api.admin.audit import write_log
    await write_log(db, actor_id=user.id, action="flag_recording", target_kind="session", target_id=str(recording_id), payload={"reason": body.reason})
    await db.commit()
    return {"ok": True}


@router.get("/{recording_id}/events")
async def get_session_events(
    recording_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return admin log of open/interrupt/close events for a session."""
    result = await db.execute(
        select(SessionEvent)
        .where(SessionEvent.session_id == recording_id)
        .order_by(SessionEvent.created_at.asc())
    )
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "event_type": e.event_type,
            "event_data": e.event_data,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]


@router.delete("/{recording_id}/flag")
async def unflag_recording(
    recording_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Session).where(Session.id == recording_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Recording not found")
    s.flagged = False
    s.flag_reason = None
    from app.api.admin.audit import write_log
    await write_log(db, actor_id=user.id, action="unflag_recording", target_kind="session", target_id=str(recording_id))
    await db.commit()
    return {"ok": True}
