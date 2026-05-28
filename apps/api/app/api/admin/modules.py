from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser, require_role
from app.models.module import Module, ModuleStatus, SourceKind, TopicType
from app.models.question import Question, QuestionKind
from app.models.session import Session
from app.models.user import UserRole

router = APIRouter(prefix="/admin/modules", tags=["admin-modules"])


class QuestionIn(BaseModel):
    id: str | None = None
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
    show_answers_after_deadline: bool = False
    show_live_feedback: bool = False
    is_exam: bool = False
    exam_duration_minutes: int | None = None


class ModuleSettingsBody(BaseModel):
    deadline: str | None = None
    is_closed: bool = False
    max_attempts: int | None = None
    show_answers_after_deadline: bool = False
    reveal_at: str | None = None
    show_live_feedback: bool = False
    is_exam: bool = False
    exam_duration_minutes: int | None = None


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

    if not modules:
        return []

    module_ids = [m.id for m in modules]

    qc_r = await db.execute(
        select(Question.module_id, func.count().label("cnt"))
        .where(Question.module_id.in_(module_ids))
        .group_by(Question.module_id)
    )
    question_counts = {row.module_id: row.cnt for row in qc_r}

    sc_r = await db.execute(
        select(
            Session.module_id,
            func.count().label("attempts"),
            func.avg(Session.score_pct).label("avg_score"),
        )
        .where(and_(Session.module_id.in_(module_ids), Session.finished_at.isnot(None)))
        .group_by(Session.module_id)
    )
    session_stats = {row.module_id: row for row in sc_r}

    out = []
    for m in modules:
        s = session_stats.get(m.id)
        out.append(ModuleOut(
            id=str(m.id),
            title=m.title,
            topic=m.topic.value,
            cefr_level=m.cefr_level.value,
            status=m.status.value,
            questions_count=question_counts.get(m.id, 0),
            attempts=s.attempts if s else 0,
            avg_score=round(float(s.avg_score or 0)) if s else 0,
            updated_at=m.updated_at.isoformat(),
            created_by=str(m.created_by) if m.created_by else None,
            deadline=m.deadline.isoformat() if m.deadline else None,
            is_closed=m.is_closed,
            max_attempts=m.max_attempts,
            reveal_at=m.reveal_at.isoformat() if m.reveal_at else None,
            show_answers_after_deadline=m.show_answers_after_deadline,
            show_live_feedback=m.show_live_feedback,
            is_exam=m.is_exam,
            exam_duration_minutes=m.exam_duration_minutes,
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
    m.show_live_feedback = body.show_live_feedback
    m.is_exam = body.is_exam
    m.exam_duration_minutes = body.exam_duration_minutes

    from app.api.admin.audit import write_log
    await write_log(db, actor_id=user.id, action="update_module_settings", target_kind="module", target_id=str(module_id),
                    payload={"is_closed": body.is_closed, "max_attempts": body.max_attempts, "deadline": body.deadline})
    await db.commit()
    return {
        "id": str(m.id),
        "is_closed": m.is_closed,
        "max_attempts": m.max_attempts,
        "is_exam": m.is_exam,
        "exam_duration_minutes": m.exam_duration_minutes,
        "show_live_feedback": m.show_live_feedback,
    }


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

    from app.models.session import SessionAnswer

    # Load existing questions into ORM identity map
    existing_result = await db.execute(
        select(Question).where(Question.module_id == module_id)
    )
    existing_qs: dict = {q.id: q for q in existing_result.scalars()}

    # Determine which question IDs the body wants to keep/update
    body_ids: set = set()
    for q in body.questions:
        if q.id:
            try:
                body_ids.add(UUID(q.id))
            except (ValueError, AttributeError):
                pass

    # Delete questions removed from the body — skip those referenced by session answers
    removed_ids = set(existing_qs.keys()) - body_ids
    if removed_ids:
        ans_result = await db.execute(
            select(SessionAnswer.question_id)
            .where(SessionAnswer.question_id.in_(list(removed_ids)))
            .distinct()
        )
        ids_with_answers = set(ans_result.scalars())
        for qid in removed_ids:
            if qid not in ids_with_answers:
                await db.delete(existing_qs[qid])

    # Upsert: update existing questions in-place, insert new ones
    for i, q in enumerate(body.questions):
        q_uuid = None
        if q.id:
            try:
                q_uuid = UUID(q.id)
            except (ValueError, AttributeError):
                pass

        if q_uuid and q_uuid in existing_qs:
            eq = existing_qs[q_uuid]
            eq.position = i
            eq.kind = QuestionKind(q.kind)
            eq.prompt = q.prompt
            eq.context = q.context
            eq.sentence = q.sentence
            eq.payload = q.payload
            eq.explain = q.explain
        else:
            db.add(Question(
                module_id=m.id,
                position=i,
                kind=QuestionKind(q.kind),
                prompt=q.prompt,
                context=q.context,
                sentence=q.sentence,
                payload=q.payload,
                explain=q.explain,
            ))

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
        "description": m.description,
        "source_kind": m.source_kind.value,
        "audio_blob": m.audio_blob,
        "audio_duration_seconds": m.audio_duration_seconds,
        # Settings fields — needed by the frontend edit drawer
        "deadline": m.deadline.isoformat() if m.deadline else None,
        "is_closed": m.is_closed,
        "max_attempts": m.max_attempts,
        "reveal_at": m.reveal_at.isoformat() if m.reveal_at else None,
        "show_answers_after_deadline": m.show_answers_after_deadline,
        "show_live_feedback": m.show_live_feedback,
        "is_exam": m.is_exam,
        "exam_duration_minutes": m.exam_duration_minutes,
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
