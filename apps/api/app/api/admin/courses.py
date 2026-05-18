from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AdminUser
from app.models.course import Course, CourseModule, CourseUser, ModuleAssignment
from app.models.module import Module, ModuleStatus
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin/courses", tags=["admin-courses"])


class CourseBody(BaseModel):
    title: str
    description: str | None = None


# ──────────────────────────────────────────────
# Course CRUD
# ──────────────────────────────────────────────

@router.get("")
async def list_courses(user: AdminUser, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(Course).order_by(Course.created_at.desc()))
    courses = result.scalars().all()

    out = []
    for c in courses:
        # Module count
        mc = await db.execute(
            select(func.count()).where(CourseModule.course_id == c.id)
        )
        # User (learner) count
        uc = await db.execute(
            select(func.count()).where(CourseUser.course_id == c.id)
        )
        out.append({
            "id": str(c.id),
            "title": c.title,
            "description": c.description,
            "module_count": mc.scalar() or 0,
            "user_count": uc.scalar() or 0,
            "created_at": c.created_at.isoformat(),
        })
    return out


@router.post("", status_code=201)
async def create_course(
    body: CourseBody,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    course = Course(title=body.title, description=body.description, created_by=user.id)
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return {"id": str(course.id), "title": course.title}


@router.patch("/{course_id}")
async def update_course(
    course_id: UUID,
    body: CourseBody,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Course not found")
    course.title = body.title
    course.description = body.description
    await db.commit()
    return {"id": str(course.id), "title": course.title}


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Course not found")
    await db.delete(course)
    await db.commit()


@router.get("/{course_id}")
async def get_course(
    course_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Course not found")

    # Modules in this course
    mods_r = await db.execute(
        select(Module, CourseModule.added_at)
        .join(CourseModule, CourseModule.module_id == Module.id)
        .where(CourseModule.course_id == course_id)
        .order_by(CourseModule.added_at)
    )
    modules = [
        {"id": str(m.id), "title": m.title, "topic": m.topic.value, "cefr_level": m.cefr_level.value, "status": m.status.value}
        for m, _ in mods_r
    ]

    # Enrolled users
    users_r = await db.execute(
        select(User, CourseUser.assigned_at)
        .join(CourseUser, CourseUser.user_id == User.id)
        .where(CourseUser.course_id == course_id)
        .order_by(CourseUser.assigned_at)
    )
    users = [
        {"id": str(u.id), "display_name": u.display_name, "email": u.email}
        for u, _ in users_r
    ]

    return {
        "id": str(course.id),
        "title": course.title,
        "description": course.description,
        "modules": modules,
        "users": users,
        "created_at": course.created_at.isoformat(),
    }


# ──────────────────────────────────────────────
# Course ↔ modules
# ──────────────────────────────────────────────

class ModuleIdsBody(BaseModel):
    module_ids: list[str]


@router.post("/{course_id}/modules", status_code=201)
async def add_modules_to_course(
    course_id: UUID,
    body: ModuleIdsBody,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Course not found")

    # Fetch existing to avoid duplicates
    existing_r = await db.execute(
        select(CourseModule.module_id).where(CourseModule.course_id == course_id)
    )
    existing = {row for row in existing_r.scalars()}

    for mid_str in body.module_ids:
        mid = UUID(mid_str)
        if mid not in existing:
            db.add(CourseModule(course_id=course_id, module_id=mid))

    await db.commit()
    return {"ok": True}


@router.delete("/{course_id}/modules/{module_id}", status_code=204)
async def remove_module_from_course(
    course_id: UUID,
    module_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await db.execute(
        delete(CourseModule).where(
            CourseModule.course_id == course_id,
            CourseModule.module_id == module_id,
        )
    )
    await db.commit()


# ──────────────────────────────────────────────
# Course ↔ users (enroll / unenroll)
# ──────────────────────────────────────────────

class UserIdsBody(BaseModel):
    user_ids: list[str]


@router.post("/{course_id}/users", status_code=201)
async def enroll_users_in_course(
    course_id: UUID,
    body: UserIdsBody,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Course not found")

    existing_r = await db.execute(
        select(CourseUser.user_id).where(CourseUser.course_id == course_id)
    )
    existing = {row for row in existing_r.scalars()}

    for uid_str in body.user_ids:
        uid = UUID(uid_str)
        if uid not in existing:
            db.add(CourseUser(course_id=course_id, user_id=uid, assigned_by=user.id))

    await db.commit()
    return {"ok": True}


@router.delete("/{course_id}/users/{target_user_id}", status_code=204)
async def unenroll_user_from_course(
    course_id: UUID,
    target_user_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await db.execute(
        delete(CourseUser).where(
            CourseUser.course_id == course_id,
            CourseUser.user_id == target_user_id,
        )
    )
    await db.commit()


# ──────────────────────────────────────────────
# Direct module ↔ user assignments
# ──────────────────────────────────────────────

@router.get("/module-assignments/{module_id}")
async def get_module_assignments(
    module_id: UUID,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return all users who have direct access to this module (direct + course)."""
    # Direct assignments
    direct_r = await db.execute(
        select(User, ModuleAssignment.assigned_at)
        .join(ModuleAssignment, ModuleAssignment.user_id == User.id)
        .where(ModuleAssignment.module_id == module_id)
    )
    direct = {str(u.id): {"id": str(u.id), "display_name": u.display_name, "email": u.email, "via": "direct"}
              for u, _ in direct_r}

    # Via course enrollment
    course_r = await db.execute(
        select(User)
        .join(CourseUser, CourseUser.user_id == User.id)
        .join(CourseModule, CourseModule.course_id == CourseUser.course_id)
        .where(CourseModule.module_id == module_id)
        .distinct()
    )
    for u in course_r.scalars():
        uid = str(u.id)
        if uid not in direct:
            direct[uid] = {"id": uid, "display_name": u.display_name, "email": u.email, "via": "course"}

    # All learners for the checkbox list
    all_learners_r = await db.execute(
        select(User).where(User.role == UserRole.learner).order_by(User.display_name)
    )
    all_learners = [
        {
            "id": str(u.id),
            "display_name": u.display_name,
            "email": u.email,
            "access": direct.get(str(u.id), {}).get("via"),
        }
        for u in all_learners_r.scalars()
    ]

    return {"learners": all_learners}


class AssignUsersBody(BaseModel):
    user_ids: list[str]


@router.put("/module-assignments/{module_id}")
async def set_module_assignments(
    module_id: UUID,
    body: AssignUsersBody,
    user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Replace direct assignments for a module (does not touch course-based access)."""
    await db.execute(
        delete(ModuleAssignment).where(ModuleAssignment.module_id == module_id)
    )
    for uid_str in body.user_ids:
        db.add(ModuleAssignment(module_id=module_id, user_id=UUID(uid_str), assigned_by=user.id))
    await db.commit()
    return {"ok": True, "assigned": len(body.user_ids)}
