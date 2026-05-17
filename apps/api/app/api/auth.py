from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.models.user import User, UserRole

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupBody(BaseModel):
    email: EmailStr
    display_name: str
    password: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access: str
    refresh: str


class RefreshBody(BaseModel):
    refresh: str


@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(body: SignupBody, db: Annotated[AsyncSession, Depends(get_db)]):
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email.lower(),
        display_name=body.display_name,
        password_hash=hash_password(body.password),
        role=UserRole.learner,
    )
    db.add(user)
    await db.flush()
    access = create_access_token(str(user.id), user.role.value)
    refresh = create_refresh_token(str(user.id))
    return {"access": access, "refresh": refresh}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginBody, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user.last_seen_at = datetime.now(timezone.utc)
    await db.commit()
    access = create_access_token(str(user.id), user.role.value)
    refresh = create_refresh_token(str(user.id))
    return {"access": access, "refresh": refresh}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshBody, db: Annotated[AsyncSession, Depends(get_db)]):
    payload = decode_token(body.refresh)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    from uuid import UUID
    result = await db.execute(select(User).where(User.id == UUID(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(str(user.id), user.role.value)
    new_refresh = create_refresh_token(str(user.id))
    return {"access": access, "refresh": new_refresh}


@router.post("/logout")
async def logout(user: CurrentUser):
    return {"ok": True}
