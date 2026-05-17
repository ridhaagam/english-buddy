from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AdminUser
from app.models.module import Module, ModuleStatus
from app.models.session import Session
from app.models.user import User

router = APIRouter(prefix="/admin/reports", tags=["admin-reports"])


@router.get("/kpi")
async def kpi(user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    avg_accuracy = await db.execute(
        select(func.avg(Session.score_pct)).where(Session.finished_at.isnot(None))
    )
    total_users = await db.execute(select(func.count()).select_from(User))
    users_started = await db.execute(
        select(func.count(func.distinct(Session.user_id)))
    )
    users_completed = await db.execute(
        select(func.count(func.distinct(Session.user_id))).where(Session.finished_at.isnot(None))
    )
    avg_xp = await db.execute(
        select(func.avg(Session.xp_earned)).where(Session.finished_at.isnot(None))
    )
    retained = await db.execute(
        select(func.count(func.distinct(Session.user_id))).where(Session.started_at >= week_ago)
    )

    total = total_users.scalar() or 0
    started = users_started.scalar() or 0
    completed = users_completed.scalar() or 0
    ret = retained.scalar() or 0

    completion_rate = round(completed / started * 100) if started else 0
    retention_7d = round(ret / total * 100) if total else 0

    return {
        "avg_accuracy": round(float(avg_accuracy.scalar() or 0)),
        "completion_rate": completion_rate,
        "avg_xp": round(float(avg_xp.scalar() or 0)),
        "retention_7d": retention_7d,
    }


@router.get("/daily")
async def daily(
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    range: str = Query("14d"),
):
    days = int(range.replace("d", ""))
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    result = await db.execute(
        select(
            func.date_trunc("day", Session.started_at).label("day"),
            func.count().label("count"),
        )
        .where(Session.started_at >= start)
        .group_by("day")
        .order_by("day")
    )
    rows = result.all()
    return [
        {
            "day": r.day.isoformat(),
            "label": f"{r.day.month}/{r.day.day}" if hasattr(r.day, "month") else str(r.day)[:10],
            "count": r.count,
        }
        for r in rows
    ]


@router.get("/topic-mix")
async def topic_mix(user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Module.topic, func.count().label("cnt"))
        .join(Session, Session.module_id == Module.id)
        .where(Session.finished_at.isnot(None))
        .group_by(Module.topic)
    )
    rows = result.all()
    total = sum(r.cnt for r in rows) or 1
    return [{"topic": r.topic.value, "pct": round(r.cnt / total * 100)} for r in rows]


@router.get("/accuracy-distribution")
async def accuracy_distribution(user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(Session.score_pct).where(Session.finished_at.isnot(None))
    )
    scores = [r[0] for r in result.all() if r[0] is not None]
    return [
        {"bucket": "0–49%", "count": sum(1 for s in scores if s < 50)},
        {"bucket": "50–69%", "count": sum(1 for s in scores if 50 <= s < 70)},
        {"bucket": "70–79%", "count": sum(1 for s in scores if 70 <= s < 80)},
        {"bucket": "80–89%", "count": sum(1 for s in scores if 80 <= s < 90)},
        {"bucket": "90–100%", "count": sum(1 for s in scores if s >= 90)},
    ]


@router.get("/funnel")
async def funnel(user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    total_users = await db.execute(select(func.count()).select_from(User))
    started = await db.execute(
        select(func.count(func.distinct(Session.user_id)))
    )
    completed = await db.execute(
        select(func.count(func.distinct(Session.user_id))).where(Session.finished_at.isnot(None))
    )
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    retained = await db.execute(
        select(func.count(func.distinct(Session.user_id))).where(Session.started_at >= week_ago)
    )
    return {
        "registered": total_users.scalar() or 0,
        "started": started.scalar() or 0,
        "completed": completed.scalar() or 0,
        "retained_7d": retained.scalar() or 0,
    }
