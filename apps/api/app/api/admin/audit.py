"""Audit log — read-only list for owners."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.deps import OwnerUser
from app.models.audit import AuditLog
from app.models.user import User

router = APIRouter(prefix="/admin/audit-log", tags=["admin-audit"])


async def write_log(
    db: AsyncSession,
    *,
    actor_id: UUID | None,
    action: str,
    target_kind: str | None = None,
    target_id: str | None = None,
    payload: dict | None = None,
) -> None:
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        target_kind=target_kind,
        target_id=target_id,
        payload=payload,
    )
    db.add(entry)


@router.get("")
async def list_audit_log(
    user: OwnerUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    result = await db.execute(
        select(AuditLog, User)
        .outerjoin(User, AuditLog.actor_id == User.id)
        .order_by(AuditLog.at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()

    return {
        "total": len(rows),
        "entries": [
            {
                "id": str(log.id),
                "actor_name": u.display_name if u else "System",
                "actor_email": u.email if u else None,
                "action": log.action,
                "target_kind": log.target_kind,
                "target_id": log.target_id,
                "payload": log.payload,
                "at": log.at.isoformat(),
            }
            for log, u in rows
        ]
    }
