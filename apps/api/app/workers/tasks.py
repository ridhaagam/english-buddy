from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.tasks.check_achievements")
def check_achievements(user_id: str, session_id: str):
    """Fired after a session finishes — awards achievements asynchronously.

    Pre-computes all stats in batched queries, then evaluates every un-earned
    achievement in a single pass to avoid N+1 database round-trips.
    """
    import asyncio
    from datetime import date, datetime, timedelta, timezone

    async def _run():
        from sqlalchemy import Date as SADate, and_, cast, func, select
        from app.core.database import AsyncSessionLocal
        from app.models.achievement import Achievement, UserAchievement
        from app.models.module import Module
        from app.models.session import Session
        from app.models.user import User
        import uuid

        async with AsyncSessionLocal() as db:
            uid = uuid.UUID(user_id)

            user_r = await db.execute(select(User).where(User.id == uid))
            user = user_r.scalar_one_or_none()
            if not user:
                return

            sess_r = await db.execute(select(Session).where(Session.id == uuid.UUID(session_id)))
            session = sess_r.scalar_one_or_none()
            if not session or not session.finished_at:
                return

            earned_r = await db.execute(
                select(UserAchievement.achievement_id).where(UserAchievement.user_id == uid)
            )
            earned_ids = {row[0] for row in earned_r.all()}

            ach_r = await db.execute(select(Achievement))
            achievements = ach_r.scalars().all()

            # ── Batch all stats queries upfront ───────────────────────────────────

            now = datetime.now(timezone.utc)
            today = now.date()  # use UTC date to match DB timestamps

            # Total finished sessions
            total_sess_r = await db.execute(
                select(func.count()).where(and_(Session.user_id == uid, Session.finished_at.isnot(None)))
            )
            total_sessions = total_sess_r.scalar() or 0

            # Sessions scoring 90%+
            perfect_90_r = await db.execute(
                select(func.count()).where(
                    and_(Session.user_id == uid, Session.score_pct >= 90, Session.finished_at.isnot(None))
                )
            )
            perfect_90_count = perfect_90_r.scalar() or 0

            # Distinct modules where user scored 80%+
            modules_80_r = await db.execute(
                select(func.count(Session.module_id.distinct())).where(
                    and_(Session.user_id == uid, Session.score_pct >= 80, Session.finished_at.isnot(None))
                )
            )
            modules_80plus = modules_80_r.scalar() or 0

            # Sessions finished today
            daily_r = await db.execute(
                select(func.count()).where(
                    and_(
                        Session.user_id == uid,
                        Session.finished_at.isnot(None),
                        cast(Session.finished_at, SADate) == today,
                    )
                )
            )
            daily_sessions = daily_r.scalar() or 0

            # Per-topic session counts
            topic_r = await db.execute(
                select(Module.topic, func.count().label("cnt"))
                .join(Session, Session.module_id == Module.id)
                .where(and_(Session.user_id == uid, Session.finished_at.isnot(None)))
                .group_by(Module.topic)
            )
            topic_counts: dict[str, int] = {row.topic.value: row.cnt for row in topic_r.all()}

            # Per-CEFR session counts
            cefr_r = await db.execute(
                select(Module.cefr_level, func.count().label("cnt"))
                .join(Session, Session.module_id == Module.id)
                .where(and_(Session.user_id == uid, Session.finished_at.isnot(None)))
                .group_by(Module.cefr_level)
            )
            cefr_counts: dict[str, int] = {row.cefr_level.value: row.cnt for row in cefr_r.all()}

            # Unflagged completed sessions
            unflagged_r = await db.execute(
                select(func.count()).where(
                    and_(Session.user_id == uid, Session.finished_at.isnot(None), Session.flagged == False)
                )
            )
            unflagged_sessions = unflagged_r.scalar() or 0

            # Session duration in seconds
            session_seconds = (
                (session.finished_at - session.started_at).total_seconds()
                if session.started_at and session.finished_at else None
            )

            # Goal-days streak: consecutive days with at least one completed session
            recent_days_r = await db.execute(
                select(cast(Session.finished_at, SADate).label("day"))
                .where(and_(
                    Session.user_id == uid,
                    Session.finished_at.isnot(None),
                    Session.finished_at >= now - timedelta(days=30),
                ))
                .distinct()
            )
            session_days = sorted({row.day for row in recent_days_r.all()}, reverse=True)
            goal_days_streak = 0
            prev = today
            for d in session_days:
                if (prev - d).days <= 1:
                    goal_days_streak += 1
                    prev = d
                else:
                    break

            # ── Evaluate each un-earned achievement ───────────────────────────────

            for a in achievements:
                if a.id in earned_ids:
                    continue
                c = a.criteria
                earned = False

                if "sessions" in c:
                    earned = total_sessions >= c["sessions"]
                elif "streak_days" in c:
                    earned = user.streak >= c["streak_days"]
                elif "session_xp" in c:
                    earned = session.xp_earned >= c["session_xp"]
                elif "total_xp" in c:
                    earned = user.xp_total >= c["total_xp"]
                elif "score_pct" in c:
                    earned = session.score_pct is not None and session.score_pct >= c["score_pct"]
                elif "perfect_90_count" in c:
                    earned = perfect_90_count >= c["perfect_90_count"]
                elif "modules_80plus" in c:
                    earned = modules_80plus >= c["modules_80plus"]
                elif "daily_sessions" in c:
                    earned = daily_sessions >= c["daily_sessions"]
                elif "topic_sessions" in c:
                    ts = c["topic_sessions"]
                    earned = topic_counts.get(ts["topic"], 0) >= ts["count"]
                elif "cefr_level" in c:
                    earned = cefr_counts.get(c["cefr_level"], 0) > 0
                elif "hour_before" in c:
                    earned = now.hour < c["hour_before"]
                elif "speed_seconds" in c:
                    min_q = c.get("min_questions", 1)
                    earned = (
                        session.total is not None
                        and session.total >= min_q
                        and session_seconds is not None
                        and session_seconds <= c["speed_seconds"]
                    )
                elif "tab_switches" in c:
                    earned = session.tab_switch_count <= c["tab_switches"]
                elif "unflagged_sessions" in c:
                    earned = unflagged_sessions >= c["unflagged_sessions"]
                elif "profile_fields" in c:
                    earned = all(getattr(user, f, None) is not None for f in c["profile_fields"])
                elif "unique_topics" in c:
                    earned = len(topic_counts) >= c["unique_topics"]
                elif "unique_cefr" in c:
                    earned = len(cefr_counts) >= c["unique_cefr"]
                elif "goal_days_streak" in c:
                    earned = goal_days_streak >= c["goal_days_streak"]

                if earned:
                    db.add(UserAchievement(
                        user_id=uid,
                        achievement_id=a.id,
                        progress_pct=100.0,
                        earned_at=now,
                    ))

            await db.commit()

    asyncio.run(_run())
