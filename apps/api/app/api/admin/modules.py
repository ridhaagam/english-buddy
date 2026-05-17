from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser, require_role
from app.models.module import Module, ModuleStatus, SourceKind, TopicType
from app.models.question import Question, QuestionKind
from app.models.session import Session
from app.models.user import UserRole

router = APIRouter(prefix="/admin/modules", tags=["admin-modules"])


class QuestionIn(BaseModel):
    kind: str
    prompt: str
    context: str | None = None
    sentence: str | None = None
    payload: dict = {}
    explain: str | None = None


class ModuleIn(BaseModel):
    title: str
    topic: str
    cefr_level: str = "A2"
    status: str = "draft"
    description: str | None = None
    source_kind: str = "manual"
    questions: list[QuestionIn] = []


class ModuleOut(BaseModel):
    id: str
    title: str
    topic: str
    cefr_level: str
    status: str
    questions_count: int
    attempts: int
    avg_score: int
    updated_at: str
    created_by: str | None
    deadline: str | None = None
    is_closed: bool = False
    max_attempts: int | None = None
    reveal_at: str | None = None


class ModuleSettingsBody(BaseModel):
    deadline: str | None = None
    is_closed: bool = False
    max_attempts: int | None = None
    show_answers_after_deadline: bool = True
    reveal_at: str | None = None


@router.get("", response_model=list[ModuleOut])
async def list_all_modules(
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    status: str | None = None,
    topic: str | None = None,
):
    q = select(Module)
    if status:
        q = q.where(Module.status == ModuleStatus(status))
    if topic and topic.lower() != "all":
        try:
            q = q.where(Module.topic == TopicType(topic.lower()))
        except ValueError:
            pass
    q = q.order_by(Module.updated_at.desc())
    result = await db.execute(q)
    modules = result.scalars().all()

    out = []
    for m in modules:
        qc = await db.execute(select(func.count()).where(Question.module_id == m.id))
        questions_count = qc.scalar() or 0

        from sqlalchemy import and_
        sc = await db.execute(
            select(func.count(), func.avg(Session.score_pct))
            .where(and_(Session.module_id == m.id, Session.finished_at.isnot(None)))
        )
        srow = sc.one()

        out.append(ModuleOut(
            id=str(m.id),
            title=m.title,
            topic=m.topic.value,
            cefr_level=m.cefr_level.value,
            status=m.status.value,
            questions_count=questions_count,
            attempts=srow[0] or 0,
            avg_score=round(float(srow[1] or 0)),
            updated_at=m.updated_at.isoformat(),
            created_by=str(m.created_by) if m.created_by else None,
            deadline=m.deadline.isoformat() if m.deadline else None,
            is_closed=m.is_closed,
            max_attempts=m.max_attempts,
            reveal_at=m.reveal_at.isoformat() if m.reveal_at else None,
        ))
    return out


@router.post("", status_code=201)
async def create_module(
    body: ModuleIn,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    m = Module(
        title=body.title,
        topic=TopicType(body.topic.lower()),
        cefr_level=body.cefr_level,
        status=ModuleStatus(body.status),
        description=body.description,
        created_by=user.id,
        source_kind=SourceKind(body.source_kind) if body.source_kind else SourceKind.manual,
    )
    db.add(m)
    await db.flush()

    for i, q in enumerate(body.questions):
        question = Question(
            module_id=m.id,
            position=i,
            kind=QuestionKind(q.kind),
            prompt=q.prompt,
            context=q.context,
            sentence=q.sentence,
            payload=q.payload,
            explain=q.explain,
        )
        db.add(question)

    return {"id": str(m.id)}


@router.patch("/{module_id}/settings")
async def update_module_settings(
    module_id: UUID,
    body: ModuleSettingsBody,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(404, "Module not found")

    from datetime import datetime, timezone as _tz
    m.deadline = datetime.fromisoformat(body.deadline).replace(tzinfo=_tz.utc) if body.deadline else None
    m.reveal_at = datetime.fromisoformat(body.reveal_at).replace(tzinfo=_tz.utc) if body.reveal_at else None
    m.is_closed = body.is_closed
    m.max_attempts = body.max_attempts
    m.show_answers_after_deadline = body.show_answers_after_deadline

    from app.api.admin.audit import write_log
    await write_log(db, actor_id=user.id, action="update_module_settings", target_kind="module", target_id=str(module_id),
                    payload={"is_closed": body.is_closed, "max_attempts": body.max_attempts, "deadline": body.deadline})
    await db.commit()
    return {"id": str(m.id), "is_closed": m.is_closed, "max_attempts": m.max_attempts}


@router.patch("/{module_id}")
async def update_module(
    module_id: UUID,
    body: ModuleIn,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(404, "Module not found")

    m.title = body.title
    m.topic = TopicType(body.topic.lower())
    m.cefr_level = body.cefr_level
    m.status = ModuleStatus(body.status)
    m.description = body.description

    await db.execute(
        Question.__table__.delete().where(Question.module_id == module_id)
    )
    for i, q in enumerate(body.questions):
        question = Question(
            module_id=m.id,
            position=i,
            kind=QuestionKind(q.kind),
            prompt=q.prompt,
            context=q.context,
            sentence=q.sentence,
            payload=q.payload,
            explain=q.explain,
        )
        db.add(question)

    return {"id": str(m.id)}


@router.delete("/{module_id}", status_code=204)
async def delete_module(
    module_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(404, "Module not found")
    await db.delete(m)


@router.post("/{module_id}/publish")
async def publish_module(
    module_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(404, "Module not found")
    m.status = ModuleStatus.published
    from app.api.admin.audit import write_log
    await write_log(db, actor_id=user.id, action="publish_module", target_kind="module", target_id=str(module_id), payload={"title": m.title})
    await db.commit()
    return {"id": str(m.id), "status": "published"}


@router.get("/{module_id}")
async def get_module_detail(
    module_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(404, "Module not found")

    qs = await db.execute(
        select(Question).where(Question.module_id == module_id).order_by(Question.position)
    )
    questions = qs.scalars().all()

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
                "explain": q.explain,
            }
            for q in questions
        ],
    }
