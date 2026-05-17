import { useQuery } from "@tanstack/react-query";
import { AnimatedNumber, ProgressBar, ArrowRightIcon, SparkleIcon, AchGlyph, CheckIcon } from "../../components/ui";
import { api } from "../../lib/api";

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
    { label: "Day streak", value: stats?.streak ?? user.streak ?? 0, sub: "Keep it up", fmt: (n: number) => Math.round(n).toString() },
    { label: "Total XP", value: stats?.xp_total ?? user.xp_total ?? 0, sub: "+this week", fmt: (n: number) => Math.round(n).toLocaleString() },
    { label: "Accuracy", value: stats?.avg_accuracy ?? 0, sub: "last 7 days", fmt: (n: number) => Math.round(n) + "%" },
    { label: "XP this week", value: stats?.xp_this_week ?? 0, sub: "earned", fmt: (n: number) => Math.round(n).toLocaleString() },
  ];

  const achievements = stats?.achievements ?? [];

  return (
    <div className="container">
      <section className="hero fade-up">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1 className="serif" style={{ fontSize: 44, margin: "6px 0 6px", letterSpacing: "-0.02em" }}>
            Hello, <span className="serif-it">{user.display_name?.split(" ")[0] ?? "learner"}</span>.
          </h1>
          <p style={{ color: "var(--ink-2)", maxWidth: 560, margin: 0 }}>
            You're on a <strong>{user.streak ?? 0}-day</strong> streak. Today's 10-minute session is ready.
          </p>
        </div>
        <div className="hero-right">
          <div className="daily-goal" title="Daily XP goal">
            <svg viewBox="0 0 80 80" width="84" height="84">
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

      <section className="ach-strip fade-up" style={{ animationDelay: "160ms" }}>
        <div className="ach-strip-head">
          <h2 className="serif" style={{ margin: 0, fontSize: 20 }}>
            Achievements <span className="serif-it" style={{ color: "var(--ink-3)" }}>· {achievements.filter((a: any) => a.earned).length}/{achievements.length}</span>
          </h2>
          <span className="eyebrow">your trophy shelf</span>
        </div>
        <div className="ach-grid">
          {achievements.map((a: any, i: number) => (
            <div key={a.id} className={"ach-card" + (a.earned ? " earned" : "")} style={{ animationDelay: `${220 + i * 60}ms` }}>
              <div className="ach-glyph"><AchGlyph kind={a.id} /></div>
              <div className="ach-body">
                <strong>{a.title}</strong>
                <span>{a.sub}</span>
                {!a.earned && a.progress_pct > 0 && (
                  <div className="ach-prog"><span style={{ width: `${a.progress_pct}%` }} /></div>
                )}
              </div>
              {a.earned && <span className="ach-tick"><CheckIcon size={12} /></span>}
            </div>
          ))}
        </div>
      </section>

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
      </section>

      <style>{`
        .hero { display:grid; grid-template-columns:1.5fr 1fr; gap:28px; align-items:end; padding:24px 28px; background:linear-gradient(135deg,oklch(0.97 0.018 158) 0%,oklch(0.985 0.006 85) 60%); border:1px solid var(--line); border-radius:var(--r-xl); margin-bottom:24px; position:relative; overflow:hidden; }
        .hero::before { content:""; position:absolute; right:-120px;top:-80px; width:320px;height:320px; border-radius:50%; background:radial-gradient(closest-side,oklch(0.55 0.12 158/0.18),transparent 70%); pointer-events:none; }
        .hero-right { display:flex; flex-direction:column; align-items:flex-end; gap:14px; z-index:1; }
        .daily-goal { display:flex; flex-direction:column; align-items:center; gap:4px; position:relative; }
        .dg-text { position:absolute; top:50%; left:50%; transform:translate(-50%,-52%); display:flex; flex-direction:column; align-items:center; gap:0; }
        .dg-text strong { font-size:22px; letter-spacing:-0.02em; }
        .dg-text .mono { font-size:10px; color:var(--ink-3); }
        .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
        .stat-card { padding:18px 20px; display:flex; flex-direction:column; gap:4px; }
        .stat-val { font-size:32px; letter-spacing:-0.02em; }
        .ach-strip { margin-bottom:24px; }
        .ach-strip-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:14px; }
        .ach-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }
        .ach-card { background:var(--surface); border:1px solid var(--line); border-radius:var(--r-md); padding:14px; display:flex; align-items:center; gap:12px; opacity:0.6; animation:fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .ach-card.earned { opacity:1; }
        .ach-glyph { width:36px;height:36px; border-radius:10px; background:var(--bg-2); display:grid; place-items:center; color:var(--ink-2); flex-shrink:0; }
        .ach-card.earned .ach-glyph { background:var(--accent-soft); color:var(--accent-ink); }
        .ach-body { display:flex; flex-direction:column; gap:1px; min-width:0; flex:1; }
        .ach-body strong { font-size:13px; font-weight:600; }
        .ach-body span { font-size:12px; color:var(--ink-3); }
        .ach-prog { height:4px; background:var(--line-2); border-radius:999px; overflow:hidden; margin-top:6px; }
        .ach-prog span { display:block; height:100%; background:var(--accent); border-radius:999px; }
        .ach-tick { width:22px;height:22px; border-radius:50%; background:var(--accent); color:white; display:grid; place-items:center; flex-shrink:0; }
        .lower { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .panel { padding:22px 24px; display:flex; flex-direction:column; }
        .panel-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px; }
        .link-btn { background:none; border:0; padding:0; font-size:12px; letter-spacing:0.06em; text-transform:uppercase; color:var(--accent-ink); cursor:pointer; font-weight:600; }
        .link-btn:hover { color:var(--ink); }
        @media(max-width:920px) { .hero{grid-template-columns:1fr;align-items:start} .hero-right{align-items:stretch} .stat-grid{grid-template-columns:repeat(2,1fr)} .lower{grid-template-columns:1fr} }
        @media(max-width:520px) { .stat-grid{grid-template-columns:1fr 1fr} .stat-val{font-size:26px} }
      `}</style>
    </div>
  );
}
