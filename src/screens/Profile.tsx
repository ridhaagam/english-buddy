// src/screens/Profile.tsx
const { useMemo: useMemo_P } = React;

type ProfileProps = {
  user: { name: string; email: string; streak: number };
  onStartTest: () => void;
  onNav: (r: string) => void;
};

function ProfileScreen({ user, onStartTest, onNav }: ProfileProps) {
  const stats = [
    { label: "Day streak", value: user.streak, sub: "Keep it up", fmt: (n: number) => Math.round(n).toString() },
    { label: "Words learned", value: 184, sub: "+12 this week", fmt: (n: number) => Math.round(n).toString() },
    { label: "Accuracy", value: 87, sub: "last 7 days", fmt: (n: number) => Math.round(n) + "%" },
    { label: "XP this week", value: 1240, sub: "+18% vs last", fmt: (n: number) => Math.round(n).toLocaleString() },
  ];

  // daily goal — XP today vs goal
  const dailyXP = 180;
  const dailyGoal = 240;
  const dailyPct = Math.min(1, dailyXP / dailyGoal);

  const achievements = [
    { id: "a1", title: "Week-long streak", sub: "7 days in a row", icon: "flame", earned: true },
    { id: "a2", title: "Centurion", sub: "100 words learned", earned: true },
    { id: "a3", title: "Perfect set", sub: "100% on a module", earned: true },
    { id: "a4", title: "Owl mode", sub: "Practice after 10 PM", earned: false },
    { id: "a5", title: "Marathoner", sub: "30 day streak", earned: false, progress: user.streak / 30 },
  ];

  const tracks = [
    {
      title: "Everyday vocabulary",
      progress: 0.62,
      meta: "120 words · 24 quick drills",
      tag: "current",
    },
    {
      title: "Grammar essentials",
      progress: 0.34,
      meta: "Tenses, prepositions, articles",
      tag: "next",
    },
    {
      title: "Speaking & pronunciation",
      progress: 0.08,
      meta: "Camera-assisted practice",
      tag: "locked",
    },
  ];

  const week = [0.2, 0.55, 0.35, 0.78, 0.4, 0.92, 0.6];
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  const staggers = (useStagger as any)(stats.length, 70) as React.CSSProperties[];

  return (
    <div className="container">
      <section className="hero fade-up">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1 className="serif" style={{ fontSize: 44, margin: "6px 0 6px", letterSpacing: "-0.02em" }}>
            Hello, <span className="serif-it">{user.name.split(" ")[0]}</span>.
          </h1>
          <p style={{ color: "var(--ink-2)", maxWidth: 560, margin: 0 }}>
            You're on a <strong>{user.streak}-day</strong> streak. Today's 10-minute
            session mixes <em>vocabulary</em> with <em>simple present tense</em>.
          </p>
        </div>
        <div className="hero-right">
          <div className="daily-goal" title="Daily XP goal">
            <svg viewBox="0 0 80 80" width="84" height="84">
              <circle cx="40" cy="40" r="34" stroke="var(--line)" strokeWidth="7" fill="none" />
              <circle
                cx="40" cy="40" r="34"
                stroke="url(#dgGrad)"
                strokeWidth="7" fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - dailyPct)}
                transform="rotate(-90 40 40)"
                style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)" }}
              />
              <defs>
                <linearGradient id="dgGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.14 145)" />
                  <stop offset="100%" stopColor="oklch(0.55 0.12 158)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="dg-text">
              <strong className="serif">
                <AnimatedNumber value={dailyXP} />
              </strong>
              <span className="mono">/ {dailyGoal} XP</span>
            </div>
            <span className="eyebrow">Today's goal</span>
          </div>
          <button className="btn accent lg" onClick={onStartTest}>
            Start practice
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </section>

      <section className="stat-grid">
        {stats.map((s, i) => (
          <div className="card stat-card fade-up" style={staggers[i]} key={s.label}>
            <span className="eyebrow">{s.label}</span>
            <div className="stat-val serif">
              <AnimatedNumber value={s.value} format={s.fmt} duration={950 + i * 80} />
            </div>
            <span style={{ color: "var(--ink-3)", fontSize: 13 }}>{s.sub}</span>
          </div>
        ))}
      </section>

      {/* Achievements strip */}
      <section className="ach-strip fade-up" style={{ animationDelay: "160ms" }}>
        <div className="ach-strip-head">
          <h2 className="serif" style={{ margin: 0, fontSize: 20 }}>
            Achievements <span className="serif-it" style={{ color: "var(--ink-3)" }}>· {achievements.filter((a) => a.earned).length}/{achievements.length}</span>
          </h2>
          <span className="eyebrow">your trophy shelf</span>
        </div>
        <div className="ach-grid">
          {achievements.map((a, i) => (
            <div
              key={a.id}
              className={"ach-card" + (a.earned ? " earned" : "")}
              style={{ animationDelay: `${220 + i * 60}ms` }}
            >
              <div className="ach-glyph"><AchGlyph kind={a.id} /></div>
              <div className="ach-body">
                <strong>{a.title}</strong>
                <span>{a.sub}</span>
                {!a.earned && a.progress !== undefined && (
                  <div className="ach-prog">
                    <span style={{ width: `${Math.round(a.progress * 100)}%` }} />
                  </div>
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
            <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>
              Your learning tracks
            </h2>
            <button
              className="link-btn mono"
              onClick={() => onNav("library")}
              type="button"
            >
              See library →
            </button>
          </div>
          <ul className="track-list">
            {tracks.map((t, i) => (
              <li className="track" key={t.title} style={{ animationDelay: `${260 + i * 70}ms` }}>
                <div className="track-head">
                  <span className="serif" style={{ fontSize: 18 }}>{t.title}</span>
                  <span className="mono pill" data-state={t.tag}>
                    {t.tag}
                  </span>
                </div>
                <ProgressBar value={t.progress} />
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-3)", fontSize: 13 }}>
                  <span>{t.meta}</span>
                  <span>{Math.round(t.progress * 100)}%</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card panel fade-up" style={{ animationDelay: "240ms" }}>
          <div className="panel-head">
            <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>
              This week
            </h2>
            <span className="eyebrow">activity</span>
          </div>
          <div className="bars">
            {week.map((v, i) => (
              <div key={i} className="bar-col">
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ height: `${v * 100}%`, animationDelay: `${300 + i * 60}ms` }}
                  />
                </div>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  {days[i]}
                </span>
              </div>
            ))}
          </div>
          <div className="callout">
            <SparkleIcon size={14} />
            <span>
              Best day: <strong>Saturday</strong> — 92% accuracy across 14 questions.
            </span>
          </div>
        </div>
      </section>

      <style>{`
        .hero {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 28px;
          align-items: end;
          padding: 24px 28px;
          background: linear-gradient(135deg, oklch(0.97 0.018 158) 0%, oklch(0.985 0.006 85) 60%);
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: "";
          position: absolute;
          right: -120px; top: -80px;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(closest-side, oklch(0.55 0.12 158 / 0.18), transparent 70%);
          pointer-events: none;
        }
        .hero-cta { display: flex; flex-direction: column; gap: 12px; align-items: flex-end; z-index: 1; }
        .hero-cta-meta { display: flex; flex-direction: column; gap: 2px; text-align: right; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card { padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; }
        .stat-val { font-size: 32px; letter-spacing: -0.02em; }
        .lower { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
        .panel { padding: 22px 24px; }
        .panel-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 18px; }
        .link-btn {
          background: none; border: 0; padding: 0;
          font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--accent-ink);
          cursor: pointer;
          font-weight: 600;
        }
        .link-btn:hover { color: var(--ink); }
        .track-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 18px; }
        .track { display: grid; gap: 8px; animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .track-head { display: flex; justify-content: space-between; align-items: center; }
        .pill { font-size: 11px; padding: 3px 8px; border-radius: 999px; }
        .pill[data-state="current"] {
          background: var(--accent-soft); color: var(--accent-ink);
          border: 1px solid color-mix(in oklch, var(--accent), white 60%);
        }
        .pill[data-state="next"]    { background: var(--bg-2);     color: var(--ink-2); border: 1px solid var(--line); }
        .pill[data-state="locked"]  { background: white;           color: var(--ink-3); border: 1px solid var(--line); }
        .bars {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;
          align-items: end; height: 160px; margin: 8px 0 18px;
        }
        .bar-col { display: grid; gap: 8px; height: 100%; grid-template-rows: 1fr auto; text-align: center; }
        .bar-track { background: var(--bg-2); border-radius: 8px; position: relative; overflow: hidden; }
        .bar-fill {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(180deg, oklch(0.7 0.13 158), var(--accent));
          border-radius: 8px;
          animation: barGrow 0.7s cubic-bezier(0.22,1,0.36,1) both;
          transform-origin: bottom;
        }
        @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .callout {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px;
          background: var(--amber-soft);
          border-radius: var(--r-md);
          color: var(--ink-2);
          font-size: 13px;
        }
        @media (max-width: 920px) {
          .hero { grid-template-columns: 1fr; align-items: start; }
          .hero-cta { align-items: stretch; }
          .hero-cta-meta { text-align: left; }
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .lower { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .stat-grid { grid-template-columns: 1fr 1fr; }
          .stat-val  { font-size: 26px; }
        }
      `}</style>
    </div>
  );
}

(window as any).ProfileScreen = ProfileScreen;
