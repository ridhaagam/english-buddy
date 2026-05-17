from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.models.module import Module, ModuleStatus, TopicType
from app.models.session import Session

router = APIRouter(tags=["modules"])


class QuestionOut(BaseModel):
    id: str
    position: int
    kind: str
    prompt: str
    context: str | None
    sentence: str | None
    payload: dict
    explain: str | None


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

    from app.models.question import Question

    out = []
    for m in modules:
        q_count = await db.execute(
            select(func.count()).where(Question.module_id == m.id)
        )
        questions_count = q_count.scalar() or 0

        sess_r = await db.execute(
            select(func.count(), func.avg(Session.score_pct))
            .where(and_(Session.module_id == m.id, Session.finished_at.isnot(None)))
        )
        sess_row = sess_r.one()
        attempts = sess_row[0] or 0
        avg_score = round(float(sess_row[1] or 0))

        hs_r = await db.execute(
            select(func.max(Session.score_pct))
            .where(and_(Session.module_id == m.id, Session.user_id == user.id, Session.finished_at.isnot(None)))
        )
        high_score = hs_r.scalar()

        lt_r = await db.execute(
            select(Session.finished_at)
            .where(and_(Session.module_id == m.id, Session.user_id == user.id, Session.finished_at.isnot(None)))
            .order_by(Session.finished_at.desc())
            .limit(1)
        )
        last_taken_dt = lt_r.scalar()
        last_taken = last_taken_dt.isoformat() if last_taken_dt else None

        out.append(ModuleOut(
            id=str(m.id),
            title=m.title,
            topic=m.topic.value,
            cefr_level=m.cefr_level.value,
            status=m.status.value,
            questions_count=questions_count,
            attempts=attempts,
            avg_score=avg_score,
            high_score=high_score,
            last_taken=last_taken,
            created_at=m.created_at.isoformat(),
            updated_at=m.updated_at.isoformat(),
        ))
    return out


@router.get("/modules/{module_id}")
async def get_module(module_id: UUID, user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Module).where(Module.id == module_id))
    m = result.scalar_one_or_none()
    if not m or m.status != ModuleStatus.published:
        raise HTTPException(404, "Module not found")

    from app.models.question import Question
    q_r = await db.execute(
        select(Question).where(Question.module_id == module_id).order_by(Question.position)
    )
    questions = q_r.scalars().all()

    return {
        "id": str(m.id),
        "title": m.title,
        "topic": m.topic.value,
        "cefr_level": m.cefr_level.value,
        "status": m.status.value,
        "audio_blob": m.audio_blob,
        "audio_duration_seconds": m.audio_duration_seconds,
        "questions": [
            {
                "id": str(q.id),
                "position": q.position,
                "kind": q.kind.value,
                "prompt": q.prompt,
                "context": q.context,
                "sentence": q.sentence,
                "payload": q.payload,
            }
            for q in questions
        ],
    }
