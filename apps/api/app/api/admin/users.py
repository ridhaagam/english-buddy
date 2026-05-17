from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AdminUser, OwnerUser
from app.core.security import hash_password
from app.models.session import Session
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


class InviteBody(BaseModel):
    email: EmailStr
    display_name: str
    role: str
    password: str = "changeme123"


class PatchRoleBody(BaseModel):
    role: str


class LearnerCreateBody(BaseModel):
    email: EmailStr
    display_name: str
    password: str = "changeme123"


# NOTE: /admin/users/learners must be registered BEFORE /admin/users/{user_id}
# so FastAPI does not capture "learners" as a UUID.

@router.get("/learners")
async def list_learners(
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
):
    q = select(User).where(User.role == UserRole.learner)
    if search:
        term = f"%{search}%"
        from sqlalchemy import or_
        q = q.where(or_(User.display_name.ilike(term), User.email.ilike(term)))
    q = q.order_by(User.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    users = result.scalars().all()

    out = []
    for u in users:
        stats = await db.execute(
            select(func.count(), func.avg(Session.score_pct))
            .where(and_(Session.user_id == u.id, Session.finished_at.isnot(None)))
        )
        srow = stats.one()
        out.append({
            "id": str(u.id),
            "email": u.email,
            "display_name": u.display_name,
            "role": u.role.value,
            "streak": u.streak,
            "xp_total": u.xp_total,
            "total_sessions": srow[0] or 0,
            "avg_score": round(float(srow[1] or 0)),
            "created_at": u.created_at.isoformat(),
            "last_seen_at": u.last_seen_at.isoformat() if u.last_seen_at else None,
        })
    return out


@router.post("/learners", status_code=201)
async def create_learner(
    body: LearnerCreateBody,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    new_user = User(
        email=body.email.lower(),
        display_name=body.display_name,
        password_hash=hash_password(body.password),
        role=UserRole.learner,
    )
    db.add(new_user)
    from app.api.admin.audit import write_log
    await write_log(db, actor_id=user.id, action="create_learner", target_kind="user", target_id=body.email.lower())
    await db.commit()
    await db.refresh(new_user)
    return {"id": str(new_user.id)}


@router.get("")
async def list_users(user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(User).where(User.role.in_([UserRole.owner, UserRole.admin, UserRole.editor]))
        .order_by(User.created_at)
    )
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "display_name": u.display_name,
            "role": u.role.value,
            "streak": u.streak,
            "xp_total": u.xp_total,
            "created_at": u.created_at.isoformat(),
            "last_seen_at": u.last_seen_at.isoformat() if u.last_seen_at else None,
        }
        for u in users
    ]


@router.post("", status_code=201)
async def invite_user(body: InviteBody, user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    try:
        role = UserRole(body.role)
    except ValueError:
        raise HTTPException(400, f"Invalid role: {body.role}")
    new_user = User(
        email=body.email.lower(),
        display_name=body.display_name,
        password_hash=hash_password(body.password),
        role=role,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return {"id": str(new_user.id)}


@router.patch("/{user_id}")
async def change_role(
    user_id: UUID,
    body: PatchRoleBody,
    current_user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "User not found")
    if target.role == UserRole.owner:
        raise HTTPException(403, "Cannot change owner role")
    old_role = target.role.value
    try:
        target.role = UserRole(body.role)
    except ValueError:
        raise HTTPException(400, f"Invalid role: {body.role}")
    from app.api.admin.audit import write_log
    await write_log(db, actor_id=current_user.id, action="change_user_role", target_kind="user", target_id=str(user_id), payload={"from": old_role, "to": body.role})
    await db.commit()
    return {"id": str(target.id), "role": target.role.value}


@router.delete("/{user_id}", status_code=204)
async def remove_user(
    user_id: UUID,
    current_user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "User not found")
    if target.role == UserRole.owner:
        raise HTTPException(403, "Cannot delete owner")
    await db.delete(target)
    await db.commit()
