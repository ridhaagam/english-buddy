from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(title="EnglishBuddy API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.auth import router as auth_router
from app.api.me import router as me_router
from app.api.modules import router as modules_router
from app.api.sessions import router as sessions_router
from app.api.admin.dashboard import router as admin_dashboard_router
from app.api.admin.modules import router as admin_modules_router
from app.api.admin.recordings import router as admin_recordings_router
from app.api.admin.reports import router as admin_reports_router
from app.api.admin.users import router as admin_users_router
from app.api.admin.import_doc import router as import_doc_router
from app.api.admin.import_audio import router as import_audio_router
from app.api.admin.audit import router as admin_audit_router

PREFIX = "/api/v1"

app.include_router(auth_router, prefix=PREFIX)
app.include_router(me_router, prefix=PREFIX)
app.include_router(modules_router, prefix=PREFIX)
app.include_router(sessions_router, prefix=PREFIX)
app.include_router(admin_dashboard_router, prefix=PREFIX)
app.include_router(admin_modules_router, prefix=PREFIX)
app.include_router(admin_recordings_router, prefix=PREFIX)
app.include_router(admin_reports_router, prefix=PREFIX)
app.include_router(admin_users_router, prefix=PREFIX)
app.include_router(import_doc_router, prefix=PREFIX)
app.include_router(import_audio_router, prefix=PREFIX)
app.include_router(admin_audit_router, prefix=PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok"}
