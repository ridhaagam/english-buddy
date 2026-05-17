from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.tasks.check_achievements")
def check_achievements(user_id: str, session_id: str):
    """Fired after a session finishes — awards achievements asynchronously."""
    import asyncio
    from datetime import timezone, datetime
    from sqlalchemy import and_, func, select

    async def _run():
        from app.core.database import AsyncSessionLocal
        from app.models.user import User
        from app.models.session import Session
        from app.models.achievement import Achievement, UserAchievement
        import uuid

        async with AsyncSessionLocal() as db:
            uid = uuid.UUID(user_id)
            user_r = await db.execute(select(User).where(User.id == uid))
            user = user_r.scalar_one_or_none()
            if not user:
                return

            sess_r = await db.execute(select(Session).where(Session.id == uuid.UUID(session_id)))
            session = sess_r.scalar_one_or_none()
            if not session:
                return

            earned_r = await db.execute(
                select(UserAchievement.achievement_id).where(UserAchievement.user_id == uid)
            )
            earned_ids = {row[0] for row in earned_r.all()}

            ach_r = await db.execute(select(Achievement))
            achievements = ach_r.scalars().all()

            for a in achievements:
                if a.id in earned_ids:
                    continue
                criteria = a.criteria
                earned = False

                if "streak_days" in criteria and user.streak >= criteria["streak_days"]:
                    earned = True
                if "score" in criteria and session.score_pct is not None and session.score_pct >= criteria["score"]:
                    earned = True
                if "hour_ge" in criteria:
                    now = datetime.now(timezone.utc)
                    if now.hour >= criteria["hour_ge"]:
                        earned = True
                if "words" in criteria:
                    from app.models.session import SessionAnswer
                    words_r = await db.execute(
                        select(func.count(SessionAnswer.id)).where(
                            and_(
                                SessionAnswer.session_id.in_(
                                    select(Session.id).where(Session.user_id == uid)
                                ),
                                SessionAnswer.is_correct == True,
                            )
                        )
                    )
                    words_learned = words_r.scalar() or 0
                    if words_learned >= criteria["words"]:
                        earned = True

                if earned:
                    db.add(UserAchievement(
                        user_id=uid,
                        achievement_id=a.id,
                        progress_pct=100.0,
                        earned_at=datetime.now(timezone.utc),
                    ))

            await db.commit()

    asyncio.run(_run())
