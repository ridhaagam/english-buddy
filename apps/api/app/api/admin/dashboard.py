from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AdminUser
from app.models.module import Module, ModuleStatus
from app.models.session import Session
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


def _time_ago(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    diff = now - dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else now - dt
    s = int(diff.total_seconds())
    if s < 60:
        return "just now"
    if s < 3600:
        return f"{s // 60}m ago"
    if s < 86400:
        return f"{s // 3600}h ago"
    return f"{s // 86400}d ago"


TOPIC_HUE = {"vocabulary": 158, "grammar": 65, "listening": 220, "speaking": 25, "writing": 300}


@router.get("/dashboard")
async def dashboard(user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    total_users = await db.execute(select(func.count()).select_from(User))
    active_today = await db.execute(
        select(func.count(func.distinct(Session.user_id))).where(Session.started_at >= today_start)
    )
    sessions_today = await db.execute(
        select(func.count()).select_from(Session).where(Session.started_at >= today_start)
    )
    total_modules = await db.execute(select(func.count()).select_from(Module))
    pub_modules = await db.execute(
        select(func.count()).select_from(Module).where(Module.status == ModuleStatus.published)
    )
    sessions_week = await db.execute(
        select(func.count()).select_from(Session).where(Session.started_at >= week_ago)
    )
    avg_score = await db.execute(
        select(func.avg(Session.score_pct)).where(Session.finished_at.isnot(None))
    )
    xp_today = await db.execute(
        select(func.coalesce(func.sum(Session.xp_earned), 0))
        .where(Session.finished_at >= today_start)
    )

    recent = await db.execute(
        select(Session, User, Module)
        .join(User, Session.user_id == User.id)
        .join(Module, Session.module_id == Module.id)
        .where(Session.finished_at.isnot(None))
        .order_by(Session.finished_at.desc())
        .limit(10)
    )

    return {
        "total_users": total_users.scalar() or 0,
        "active_today": active_today.scalar() or 0,
        "sessions_today": sessions_today.scalar() or 0,
        "total_modules": total_modules.scalar() or 0,
        "published_modules": pub_modules.scalar() or 0,
        "sessions_week": sessions_week.scalar() or 0,
        "avg_score": round(float(avg_score.scalar() or 0)),
        "xp_today": int(xp_today.scalar() or 0),
        "recent_activity": [
            {
                "session_id": str(s.id),
                "user_name": u.display_name,
                "module_title": m.title,
                "topic": m.topic.value,
                "score_pct": s.score_pct,
                "action": f"completed {m.title} with {s.score_pct}%",
                "time_ago": _time_ago(s.finished_at) if s.finished_at else "",
                "hue": TOPIC_HUE.get(m.topic.value, 158),
                "finished_at": s.finished_at.isoformat() if s.finished_at else None,
            }
            for s, u, m in recent.all()
        ],
    }
