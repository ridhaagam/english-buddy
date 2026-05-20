import { useQuery } from "@tanstack/react-query";
import { AnimatedNumber, AchGlyph, CheckIcon, ArrowRightIcon, SparkleIcon } from "../../components/ui";
import { api } from "../../lib/api";
import "./ProfileScreen.css";

type Props = {
  user: any;
  onStartTest: () => void;
  onNav: (r: string) => void;
};

export function ProfileScreen({ user, onStartTest, onNav }: Props) {
  const { data: stats } = useQuery({ queryKey: ["me-stats"], queryFn: api.me.stats });

  const dailyXP = stats?.xp_today ?? 0;
  const dailyGoal = user.daily_goal_xp ?? 200;
  const dailyPct = Math.min(1, dailyXP / dailyGoal);

  const statCards = [
    { label: "Day streak",    value: stats?.streak ?? user.streak ?? 0,         sub: "Keep it up",    fmt: (n: number) => Math.round(n).toString() },
    { label: "Total XP",     value: stats?.xp_total ?? user.xp_total ?? 0,     sub: "+this week",    fmt: (n: number) => Math.round(n).toLocaleString() },
    { label: "Accuracy",     value: stats?.avg_accuracy ?? 0,                   sub: "last 7 days",   fmt: (n: number) => Math.round(n) + "%" },
    { label: "XP this week", value: stats?.xp_this_week ?? 0,                  sub: "earned",        fmt: (n: number) => Math.round(n).toLocaleString() },
  ];

  const allAchievements = stats?.achievements ?? [];
  // Only show achievements earned in the last 48 hours on the dashboard
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recentAch = allAchievements.filter((a: any) => a.earned && a.earned_at && new Date(a.earned_at).getTime() >= cutoff);

  return (
    <div className="container">
      <section className="hero fade-up">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1 className="serif" style={{ fontSize: 44, margin: "6px 0 6px", letterSpacing: "-0.02em" }}>
            Hello, <span className="serif-it">{user.display_name?.split(" ")[0] ?? "learner"}</span>.
          </h1>
          <p style={{ color: "var(--ink-2)", maxWidth: 560, margin: 0 }}>
            You're on a <strong>{(stats?.streak ?? user.streak ?? 0)}-day</strong> streak. Today's session is ready.
          </p>
        </div>
        <div className="hero-right">
          <div className="daily-goal" title="Daily XP goal">
            <div className="dg-ring">
              <svg viewBox="0 0 80 80" width="84" height="84" style={{ position: "absolute", inset: 0 }}>
                <circle cx="40" cy="40" r="34" stroke="var(--line)" strokeWidth="7" fill="none" />
                <circle cx="40" cy="40" r="34" stroke="url(#dgGrad)" strokeWidth="7" fill="none" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - dailyPct)}
                  transform="rotate(-90 40 40)"
                  style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)" }} />
                <defs>
                  <linearGradient id="dgGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.14 145)" />
                    <stop offset="100%" stopColor="oklch(0.55 0.12 158)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="dg-text">
                <strong className="serif"><AnimatedNumber value={dailyXP} /></strong>
                <span className="mono">/ {dailyGoal} XP</span>
              </div>
            </div>
            <span className="eyebrow">Today's goal</span>
          </div>
          <button className="btn accent lg" onClick={onStartTest}>
            Start practice <ArrowRightIcon size={16} />
          </button>
        </div>
      </section>

      <section className="stat-grid">
        {statCards.map((s, i) => (
          <div className="card stat-card fade-up" style={{ animationDelay: `${i * 70}ms` }} key={s.label}>
            <span className="eyebrow">{s.label}</span>
            <div className="stat-val serif">
              <AnimatedNumber value={s.value} format={s.fmt} duration={950 + i * 80} />
            </div>
            <span style={{ color: "var(--ink-3)", fontSize: 13 }}>{s.sub}</span>
          </div>
        ))}
      </section>

      {/* Recent achievements (last 48h) */}
      {recentAch.length > 0 && (
        <section className="ach-strip fade-up" style={{ animationDelay: "160ms" }}>
          <div className="ach-strip-head">
            <h2 className="serif" style={{ margin: 0, fontSize: 20 }}>
              New achievements <span className="serif-it" style={{ color: "var(--ink-3)" }}>· {recentAch.length}</span>
            </h2>
            <button className="link-btn mono" onClick={() => onNav("profile-edit")} type="button">See all →</button>
          </div>
          <div className="ach-grid">
            {recentAch.map((a: any, i: number) => (
              <div key={a.id} className="ach-card earned" style={{ animationDelay: `${220 + i * 60}ms` }}>
                <div className="ach-glyph"><AchGlyph kind={a.id} /></div>
                <div className="ach-body">
                  <strong>{a.title}</strong>
                  <span>{a.sub}</span>
                </div>
                <span className="ach-tick"><CheckIcon size={12} /></span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="lower">
        <div className="card panel fade-up" style={{ animationDelay: "180ms" }}>
          <div className="panel-head">
            <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>Learning library</h2>
            <button className="link-btn mono" onClick={() => onNav("library")} type="button">See all →</button>
          </div>
          <p style={{ color: "var(--ink-2)", margin: 0 }}>Browse modules by topic and track your high scores.</p>
          <button className="btn ghost" style={{ marginTop: 16, alignSelf: "start" }} onClick={() => onNav("library")}>
            Open library <ArrowRightIcon size={14} />
          </button>
        </div>

        <div className="card panel fade-up" style={{ animationDelay: "240ms" }}>
          <div className="panel-head">
            <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>Practice history</h2>
            <button className="link-btn mono" onClick={() => onNav("practice")} type="button">See all →</button>
          </div>
          <p style={{ color: "var(--ink-2)", margin: 0 }}>Review your past sessions and watch your recordings.</p>
          <button className="btn ghost" style={{ marginTop: 16, alignSelf: "start" }} onClick={() => onNav("practice")}>
            View sessions <ArrowRightIcon size={14} />
          </button>
        </div>

        {/* Trophies teaser */}
        <div className="card panel fade-up" style={{ animationDelay: "300ms", gridColumn: "1 / -1" }}>
          <div className="panel-head">
            <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>
              Achievements <span className="serif-it" style={{ color: "var(--ink-3)", fontSize: 18 }}>· {allAchievements.filter((a: any) => a.earned).length}/{allAchievements.length}</span>
            </h2>
            <button className="link-btn mono" onClick={() => onNav("profile-edit")} type="button">See all →</button>
          </div>
          {allAchievements.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-3)" }}>
              <SparkleIcon size={20} />
              <p style={{ margin: 0, fontSize: 14 }}>Complete your first module to start earning trophies!</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allAchievements.slice(0, 8).map((a: any) => (
                <div key={a.id} title={a.title} style={{ width: 36, height: 36, borderRadius: 10, background: a.earned ? "var(--accent-soft)" : "var(--bg-2)", color: a.earned ? "var(--accent-ink)" : "var(--ink-3)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center", opacity: a.earned ? 1 : 0.5 }}>
                  <AchGlyph kind={a.id} />
                </div>
              ))}
              {allAchievements.length > 8 && (
                <button onClick={() => onNav("profile-edit")} style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--line)", fontSize: 11, color: "var(--ink-3)", cursor: "pointer" }}>
                  +{allAchievements.length - 8}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
