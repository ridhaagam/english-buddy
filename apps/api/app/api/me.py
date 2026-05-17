from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.models.achievement import Achievement, UserAchievement
from app.models.session import Session
from app.models.user import User

router = APIRouter(tags=["me"])


class MeResponse(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    streak: int
    xp_total: int
    daily_goal_xp: int
    cefr_level: str | None


class PatchMeBody(BaseModel):
    display_name: str | None = None
    daily_goal_xp: int | None = None
    cefr_level: str | None = None


@router.get("/me", response_model=MeResponse)
async def get_me(user: CurrentUser):
    return MeResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        role=user.role.value,
        streak=user.streak,
        xp_total=user.xp_total,
        daily_goal_xp=user.daily_goal_xp,
        cefr_level=user.cefr_level.value if user.cefr_level else None,
    )


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
        from app.models.user import CefrLevel
        user.cefr_level = CefrLevel(body.cefr_level)
    await db.commit()
    return MeResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        role=user.role.value,
        streak=user.streak,
        xp_total=user.xp_total,
        daily_goal_xp=user.daily_goal_xp,
        cefr_level=user.cefr_level.value if user.cefr_level else None,
    )


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
