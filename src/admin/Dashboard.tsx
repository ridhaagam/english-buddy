// src/admin/Dashboard.tsx — admin overview page
const { useState: useState_Dh } = React;

function AdminDashboard({ onGo }: { onGo: (p: string) => void }) {
  const { ADMIN_MODULES, ADMIN_RECORDINGS, REPORT_DAILY, REPORT_KPI } = (window as any).ADMIN_DATA;

  const recentMods = [...ADMIN_MODULES].slice(0, 4);
  const recentRecs = [...ADMIN_RECORDINGS].slice(0, 5);

  return (
    <div>
      {/* welcome card */}
      <section className="adm-hello fade-up">
        <div>
          <p className="eyebrow">Admin overview</p>
          <h2 className="serif" style={{ margin: "4px 0 6px", fontSize: 30, letterSpacing: "-0.02em" }}>
            Good morning, <span className="serif-it">{(window as any).__ADMIN_NAME || "Admin"}.</span>
          </h2>
          <p style={{ margin: 0, color: "var(--ink-2)", maxWidth: 540 }}>
            Here\u2019s what your learners are up to today. Add a new module, import vocabulary
            from a document, or upload an audio clip for listening practice.
          </p>
        </div>
        <div className="adm-hello-actions">
          <button className="btn accent" onClick={() => onGo("modules")}>
            <PlusGlyph /> New module
          </button>
          <button className="btn ghost" onClick={() => onGo("import")}>
            <UploadGlyph /> Import doc
          </button>
        </div>
      </section>

      {/* KPI grid */}
      <section className="kpi-grid">
        {REPORT_KPI.map((k: any, i: number) => (
          <div key={k.label} className="kpi card fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="eyebrow">{k.label}</span>
            <div className="kpi-val serif">{k.value}</div>
            <div
              className="mono kpi-delta"
              data-up={k.delta.startsWith("+") || undefined}
            >
              {k.delta}
            </div>
          </div>
        ))}
      </section>

      {/* split: chart + quick actions */}
      <section className="dash-split">
        <div className="card chart-card fade-up" style={{ animationDelay: "180ms" }}>
          <div className="panel-head">
            <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>
              Active users · last 30 days
            </h3>
            <span className="eyebrow">daily</span>
          </div>
          <Sparkline data={REPORT_DAILY.map((d: any) => d.users)} />
          <div className="chart-foot mono">
            <span>30d avg: {Math.round(REPORT_DAILY.reduce((a: number, b: any) => a + b.users, 0) / REPORT_DAILY.length)}</span>
            <span>Peak: {Math.max(...REPORT_DAILY.map((d: any) => d.users))}</span>
            <button className="link-btn" onClick={() => onGo("reports")}>Full report →</button>
          </div>
        </div>

        <div className="card quick fade-up" style={{ animationDelay: "240ms" }}>
          <h3 className="serif" style={{ margin: "0 0 12px", fontSize: 18 }}>
            Quick actions
          </h3>
          <div className="quick-list">
            <button className="quick-row" onClick={() => onGo("modules")}>
              <span className="quick-glyph" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                <PlusGlyph />
              </span>
              <span className="quick-body">
                <strong>Create a new module</strong>
                <small>Multiple-choice, fill-blank, match</small>
              </span>
              <ChevronRight />
            </button>
            <button className="quick-row" onClick={() => onGo("import")}>
              <span className="quick-glyph" style={{ background: "oklch(0.94 0.05 75)", color: "oklch(0.4 0.1 75)" }}>
                <UploadGlyph />
              </span>
              <span className="quick-body">
                <strong>Import vocabulary from PDF / Word</strong>
                <small>Auto-detects words, examples, meanings</small>
              </span>
              <ChevronRight />
            </button>
            <button className="quick-row" onClick={() => onGo("listening")}>
              <span className="quick-glyph" style={{ background: "oklch(0.92 0.05 220)", color: "oklch(0.35 0.1 220)" }}>
                <MicGlyph />
              </span>
              <span className="quick-body">
                <strong>Upload audio for listening</strong>
                <small>Transcribed locally with Qwen-1B GGUF</small>
              </span>
              <ChevronRight />
            </button>
            <button className="quick-row" onClick={() => onGo("recordings")}>
              <span className="quick-glyph" style={{ background: "oklch(0.94 0.05 25)", color: "oklch(0.4 0.1 25)" }}>
                <PlayGlyph />
              </span>
              <span className="quick-body">
                <strong>Review user recordings</strong>
                <small>{(window as any).ADMIN_DATA.ADMIN_RECORDINGS.filter((r: any) => r.flagged).length} flagged for review</small>
              </span>
              <ChevronRight />
            </button>
          </div>
        </div>
      </section>

      {/* recent activity table */}
      <section className="dash-tables">
        <div className="card fade-up" style={{ animationDelay: "300ms" }}>
          <div className="panel-head">
            <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>
              Recently edited modules
            </h3>
            <button className="link-btn" onClick={() => onGo("modules")}>All modules →</button>
          </div>
          <table className="adm-table">
            <thead>
              <tr><th>Module</th><th>Topic</th><th>Status</th><th style={{textAlign:"right"}}>Updated</th></tr>
            </thead>
            <tbody>
              {recentMods.map((m: any) => (
                <tr key={m.id}>
                  <td data-label="Module">
                    <strong style={{ fontWeight: 600 }}>{m.title}</strong>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                      {m.level} · {m.questions.length} questions
                    </div>
                  </td>
                  <td data-label="Topic"><TopicBadge topic={m.topic} /></td>
                  <td data-label="Status"><StatusBadge status={m.status} /></td>
                  <td data-label="Updated" className="mono" style={{ textAlign: "right", color: "var(--ink-3)", fontSize: 12 }}>{m.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card fade-up" style={{ animationDelay: "340ms" }}>
          <div className="panel-head">
            <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>
              Latest recordings
            </h3>
            <button className="link-btn" onClick={() => onGo("recordings")}>All recordings →</button>
          </div>
          <table className="adm-table">
            <thead>
              <tr><th>Learner</th><th>Module</th><th style={{textAlign:"right"}}>Score</th></tr>
            </thead>
            <tbody>
              {recentRecs.map((r: any) => (
                <tr key={r.id}>
                  <td data-label="Learner">
                    <strong style={{ fontWeight: 600 }}>{r.user.name}</strong>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{r.takenAt}</div>
                  </td>
                  <td data-label="Module">{r.moduleTitle}</td>
                  <td data-label="Score" style={{ textAlign: "right" }}>
                    <ScorePill score={r.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .adm-hello {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: end;
          padding: 24px 26px;
          background: linear-gradient(135deg, oklch(0.97 0.018 158), oklch(0.985 0.006 85));
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          margin-bottom: 18px;
        }
        .adm-hello-actions { display: flex; gap: 8px; flex-shrink: 0; }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }
        .kpi { padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; }
        .kpi-val { font-size: 30px; letter-spacing: -0.02em; }
        .kpi-delta {
          font-size: 11px; padding: 2px 8px;
          background: var(--rose-soft); color: var(--rose);
          border-radius: 999px; align-self: flex-start;
        }
        .kpi-delta[data-up] { background: var(--accent-soft); color: var(--accent-ink); }

        .dash-split {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 14px;
          margin-bottom: 18px;
        }
        .chart-card { padding: 18px 20px 16px; }
        .panel-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
        .link-btn {
          background: none; border: 0; padding: 0;
          font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--accent-ink);
          cursor: pointer; font-weight: 600;
        }
        .chart-foot {
          margin-top: 10px;
          display: flex; gap: 18px; align-items: center;
          font-size: 11px;
          color: var(--ink-3);
        }

        .quick { padding: 18px 20px; }
        .quick-list { display: flex; flex-direction: column; gap: 6px; }
        .quick-row {
          background: none; border: 0;
          width: 100%;
          display: grid;
          grid-template-columns: 36px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
          color: var(--ink);
          transition: background 0.15s;
        }
        .quick-row:hover { background: var(--bg-2); }
        .quick-glyph {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: grid; place-items: center;
        }
        .quick-body { display: flex; flex-direction: column; min-width: 0; }
        .quick-body strong { font-size: 14px; font-weight: 600; }
        .quick-body small { font-size: 12px; color: var(--ink-3); }

        .dash-tables {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 14px;
        }
        .dash-tables .card { padding: 18px 20px 8px; }

        @media (max-width: 1000px) {
          .kpi-grid    { grid-template-columns: repeat(2, 1fr); }
          .dash-split  { grid-template-columns: 1fr; }
          .dash-tables { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .adm-hello { grid-template-columns: 1fr; }
        }

        /* shared admin table — used by other admin pages too */
        .adm-table {
          width: 100%;
          border-collapse: collapse;
        }
        .adm-table th {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-3);
          text-align: left;
          font-weight: 600;
          padding: 8px 10px;
          border-bottom: 1px solid var(--line);
        }
        .adm-table td {
          padding: 14px 10px;
          border-bottom: 1px solid var(--line-2);
          font-size: 14px;
          vertical-align: middle;
        }
        .adm-table tr:last-child td { border-bottom: 0; }
        .adm-table tr:hover td { background: oklch(0.985 0.006 85 / 0.7); }
      `}</style>
    </div>
  );
}

// ---- Shared admin atoms (also exposed for other admin pages) ----------------
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="mono"
      data-status={status}
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 999,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background:
          status === "published" ? "var(--accent-soft)"
          : status === "draft"   ? "var(--bg-2)"
          :                        "var(--rose-soft)",
        color:
          status === "published" ? "var(--accent-ink)"
          : status === "draft"   ? "var(--ink-2)"
          :                        "var(--rose)",
        border: "1px solid var(--line)",
      }}
    >
      {status}
    </span>
  );
}

function TopicBadge({ topic }: { topic: string }) {
  const hueMap: Record<string, string> = {
    Vocabulary: "158", Grammar: "65", Listening: "220",
    Speaking: "25", Writing: "300",
  };
  const h = hueMap[topic] || "85";
  return (
    <span
      className="mono"
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 6,
        background: `oklch(0.95 0.04 ${h})`,
        color: `oklch(0.35 0.1 ${h})`,
        letterSpacing: "0.04em",
      }}
    >
      {topic.toLowerCase()}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  const tier = score >= 90 ? "great" : score >= 75 ? "good" : score >= 50 ? "ok" : "bad";
  const palette: Record<string, { bg: string; ink: string }> = {
    great: { bg: "var(--accent-soft)", ink: "var(--accent-ink)" },
    good:  { bg: "oklch(0.95 0.05 75)", ink: "oklch(0.4 0.1 75)" },
    ok:    { bg: "oklch(0.95 0.05 30)", ink: "oklch(0.4 0.12 30)" },
    bad:   { bg: "var(--rose-soft)",    ink: "var(--rose)" },
  };
  return (
    <span
      className="serif"
      style={{
        fontSize: 14,
        padding: "4px 10px",
        borderRadius: 8,
        background: palette[tier].bg,
        color: palette[tier].ink,
        fontWeight: 600,
        letterSpacing: "-0.01em",
      }}
    >
      {score}%
    </span>
  );
}

// ---- Sparkline -------------------------------------------------------------
function Sparkline({ data }: { data: number[] }) {
  const w = 600, h = 120, pad = 8;
  const min = Math.min(...data), max = Math.max(...data);
  const range = Math.max(1, max - min);
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const d =
    "M " +
    pts
      .map((p, i) => (i === 0 ? `${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`))
      .join(" ");
  const dFill = `${d} L ${pts[pts.length - 1][0]},${h} L ${pts[0][0]},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="120" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.55 0.12 158)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="oklch(0.55 0.12 158)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={dFill} fill="url(#sg)" />
      <path d={d} fill="none" stroke="oklch(0.55 0.12 158)" strokeWidth="1.8" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.5 : 0}
          fill="oklch(0.55 0.12 158)"
        />
      ))}
    </svg>
  );
}

// ---- glyphs ---------------------------------------------------------------
function GBase({ children, size = 14 }: { children: any; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
function PlusGlyph()   { return <GBase><path d="M12 5v14M5 12h14" /></GBase>; }
function UploadGlyph() { return <GBase><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 20h14" /></GBase>; }
function MicGlyph()    { return <GBase><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></GBase>; }
function PlayGlyph()   { return <GBase><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></GBase>; }
function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// expose shared atoms
Object.assign(window, {
  AdminDashboard,
  StatusBadge,
  TopicBadge,
  ScorePill,
  Sparkline,
});
