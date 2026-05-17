import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.security import hash_password, verify_password
from app.models.achievement import Achievement, UserAchievement
from app.models.session import Session
from app.models.user import CefrLevel, User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["me"])

_AVATAR_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
_AVATAR_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


class MeResponse(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    streak: int
    xp_total: int
    daily_goal_xp: int
    cefr_level: str | None
    avatar_url: str | None = None
    birthdate: str | None = None
    bio: str | None = None
    native_language: str | None = None


class PatchMeBody(BaseModel):
    display_name: str | None = None
    daily_goal_xp: int | None = None
    cefr_level: str | None = None
    birthdate: str | None = None
    bio: str | None = None
    native_language: str | None = None


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str


def _me_response(user: User) -> MeResponse:
    return MeResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        role=user.role.value,
        streak=user.streak,
        xp_total=user.xp_total,
        daily_goal_xp=user.daily_goal_xp,
        cefr_level=user.cefr_level.value if user.cefr_level else None,
        avatar_url=user.avatar_url,
        birthdate=user.birthdate.isoformat() if user.birthdate else None,
        bio=user.bio,
        native_language=user.native_language,
    )


@router.get("/me", response_model=MeResponse)
async def get_me(user: CurrentUser):
    return _me_response(user)


@router.patch("/me", response_model=MeResponse)
async def patch_me(
    body: PatchMeBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.daily_goal_xp is not None:
        user.daily_goal_xp = body.daily_goal_xp
    if body.cefr_level is not None:
        user.cefr_level = CefrLevel(body.cefr_level)
    if body.birthdate is not None:
        from datetime import date
        user.birthdate = date.fromisoformat(body.birthdate) if body.birthdate else None
    if body.bio is not None:
        user.bio = body.bio
    if body.native_language is not None:
        user.native_language = body.native_language
    await db.commit()
    return _me_response(user)


@router.post("/me/password")
async def change_password(
    body: ChangePasswordBody,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    user.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"ok": True}


@router.post("/me/avatar")
async def upload_avatar(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
):
    if file.content_type not in _AVATAR_ALLOWED_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, and WebP images are allowed")
    data = await file.read()
    if len(data) > _AVATAR_MAX_BYTES:
        raise HTTPException(400, "Image must be under 2 MB")

    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[file.content_type]
    key = f"avatars/{user.id}.{ext}"

    from app.services.storage import put_object
    put_object(key, data, file.content_type)

    user.avatar_url = f"/api/v1/me/avatar"
    await db.commit()
    return {"avatar_url": user.avatar_url}


@router.get("/me/avatar")
async def get_avatar(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from app.services.storage import get_file_path, object_exists
    import pathlib

    # Try all extensions
    for ext in ("jpg", "png", "webp"):
        key = f"avatars/{user.id}.{ext}"
        if object_exists(key):
            path = get_file_path(key)
            media = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[ext]
            return FileResponse(str(path), media_type=media)
    raise HTTPException(404, "No avatar set")


@router.get("/me/stats")
async def get_stats(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    result = await db.execute(
        select(func.count(), func.avg(Session.score_pct))
        .where(and_(Session.user_id == user.id, Session.finished_at.isnot(None)))
    )
    row = result.one()
    total_sessions = row[0] or 0
    avg_accuracy = round(float(row[1] or 0))

    result2 = await db.execute(
        select(func.sum(Session.xp_earned))
        .where(and_(Session.user_id == user.id, Session.started_at >= week_ago))
    )
    xp_this_week = int(result2.scalar() or 0)

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result3 = await db.execute(
        select(func.sum(Session.xp_earned))
        .where(and_(Session.user_id == user.id, Session.started_at >= today_start))
    )
    xp_today = int(result3.scalar() or 0)

    ach_result = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == user.id)
    )
    earned_achievements = ach_result.scalars().all()

    all_ach = await db.execute(select(Achievement))
    all_achievements = all_ach.scalars().all()

    earned_ids = {a.achievement_id for a in earned_achievements}

    return {
        "streak": user.streak,
        "xp_today": xp_today,
        "xp_this_week": xp_this_week,
        "daily_goal_xp": user.daily_goal_xp,
        "total_sessions": total_sessions,
        "avg_accuracy": avg_accuracy,
        "xp_total": user.xp_total,
        "achievements": [
            {
                "id": a.id,
                "title": a.title,
                "sub": a.sub,
                "earned": a.id in earned_ids,
                "progress_pct": next((ua.progress_pct for ua in earned_achievements if ua.achievement_id == a.id), 0.0),
                "earned_at": next((ua.earned_at.isoformat() for ua in earned_achievements if ua.achievement_id == a.id), None),
            }
            for a in all_achievements
        ],
    }
