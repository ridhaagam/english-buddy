// src/admin/Reports.tsx — analytics page
function AdminReports() {
  const { REPORT_KPI, REPORT_DAILY, REPORT_TOPIC_MIX, REPORT_ACCURACY, ADMIN_MODULES, ADMIN_RECORDINGS } = (window as any).ADMIN_DATA;

  // top-performing modules by attempts
  const topMods = [...ADMIN_MODULES]
    .filter((m: any) => m.attempts > 0)
    .sort((a: any, b: any) => b.attempts - a.attempts)
    .slice(0, 5);

  return (
    <div>
      <header className="rp-head fade-up">
        <div>
          <p className="eyebrow">Reports</p>
          <h2 className="serif" style={{ margin: "4px 0 4px", fontSize: 26, letterSpacing: "-0.02em" }}>
            Analytics across <span className="serif-it">every module.</span>
          </h2>
          <p style={{ margin: 0, color: "var(--ink-2)" }}>Refreshes hourly · last sync: a few minutes ago</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost">Export CSV</button>
          <button className="btn ghost">Last 30 days</button>
        </div>
      </header>

      <section className="kpi-grid">
        {REPORT_KPI.map((k: any, i: number) => (
          <div key={k.label} className="kpi card fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="eyebrow">{k.label}</span>
            <div className="kpi-val serif">{k.value}</div>
            <div className="mono kpi-delta" data-up={k.delta.startsWith("+") || undefined}>{k.delta}</div>
          </div>
        ))}
      </section>

      <section className="rp-grid">
        <div className="card big-chart fade-up" style={{ animationDelay: "120ms" }}>
          <div className="panel-head">
            <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>Sessions vs active users</h3>
            <div className="legend mono">
              <span><i style={{ background: "oklch(0.55 0.12 158)" }} /> Sessions</span>
              <span><i style={{ background: "oklch(0.62 0.14 65)" }} /> Active users</span>
            </div>
          </div>
          <DualLine
            a={REPORT_DAILY.map((d: any) => d.sessions)}
            b={REPORT_DAILY.map((d: any) => d.users)}
          />
        </div>

        <div className="card fade-up" style={{ animationDelay: "180ms", padding: "18px 20px" }}>
          <div className="panel-head">
            <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>Topic mix</h3>
            <span className="eyebrow">last 30 days</span>
          </div>
          <DonutChart data={REPORT_TOPIC_MIX} />
          <ul className="legend-list">
            {REPORT_TOPIC_MIX.map((t: any, i: number) => (
              <li key={t.topic}>
                <span className="ll-dot" style={{ background: donutColor(i) }} />
                <span style={{ flex: 1 }}>{t.topic}</span>
                <span className="mono">{Math.round(t.value * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card fade-up" style={{ animationDelay: "240ms", padding: "18px 20px" }}>
          <div className="panel-head">
            <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>Accuracy distribution</h3>
            <span className="eyebrow">all sessions</span>
          </div>
          <BarChart data={REPORT_ACCURACY} />
          <p style={{ margin: "12px 0 0", color: "var(--ink-3)", fontSize: 12 }}>
            61% of sessions hit 80% or higher. The 0–49% band may need shorter modules or hints.
          </p>
        </div>

        <div className="card fade-up" style={{ animationDelay: "300ms", padding: "18px 20px" }}>
          <div className="panel-head">
            <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>Top modules · by attempts</h3>
            <span className="eyebrow">7 days</span>
          </div>
          <ul className="top-mods">
            {topMods.map((m: any, i: number) => (
              <li key={m.id}>
                <span className="mono tm-rank">{String(i + 1).padStart(2, "0")}</span>
                <div className="tm-body">
                  <strong>{m.title}</strong>
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {m.topic} · {m.level}
                  </div>
                </div>
                <div className="tm-stat">
                  <ScorePill score={m.avgScore} />
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {m.attempts} attempts
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card fade-up funnel-card" style={{ animationDelay: "360ms", padding: "18px 20px" }}>
          <div className="panel-head">
            <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>Practice funnel</h3>
            <span className="eyebrow">last 7 days</span>
          </div>
          <Funnel
            steps={[
              { label: "Opened library", value: 4280, color: "158" },
              { label: "Started a module", value: 3120, color: "75" },
              { label: "Reached final question", value: 2860, color: "30" },
              { label: "Submitted recording", value: 2415, color: "300" },
            ]}
          />
        </div>
      </section>

      <style>{`
        .rp-head {
          display: flex; justify-content: space-between; align-items: end;
          gap: 18px; margin-bottom: 18px; flex-wrap: wrap;
        }
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

        .rp-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 14px;
        }
        .big-chart { grid-column: 1 / -1; padding: 18px 20px; }
        .funnel-card { grid-column: 1 / -1; }
        .panel-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
        .legend {
          display: flex; gap: 14px;
          font-size: 11px; color: var(--ink-2);
        }
        .legend i {
          display: inline-block;
          width: 10px; height: 10px;
          border-radius: 2px;
          margin-right: 6px;
          vertical-align: middle;
        }
        .legend-list {
          list-style: none; padding: 0; margin: 14px 0 0;
          display: flex; flex-direction: column; gap: 6px;
          font-size: 13px;
        }
        .legend-list li {
          display: flex; align-items: center; gap: 8px;
          padding: 4px 0;
        }
        .ll-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

        .top-mods { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
        .top-mods li {
          display: grid;
          grid-template-columns: 30px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 10px 12px;
          background: var(--bg-2);
          border-radius: 10px;
        }
        .tm-rank { font-size: 12px; color: var(--ink-3); }
        .tm-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .tm-body strong { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tm-stat { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }

        @media (max-width: 1000px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .rp-grid  { grid-template-columns: 1fr; }
          .big-chart, .funnel-card { grid-column: auto; }
        }
      `}</style>
    </div>
  );
}

// ---- Charts ----------------------------------------------------------------
function DualLine({ a, b }: { a: number[]; b: number[] }) {
  const w = 800, h = 200, pad = 20;
  const allMax = Math.max(...a, ...b);
  const allMin = Math.min(...a, ...b);
  const range = Math.max(1, allMax - allMin);
  const toPath = (d: number[]) =>
    d
      .map((v, i) => {
        const x = pad + (i / (d.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - allMin) / range) * (h - pad * 2);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="200" preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="rp-a" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.55 0.12 158)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="oklch(0.55 0.12 158)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="var(--line)" strokeWidth="1">
        {[0.25, 0.5, 0.75].map((p) => (
          <line key={p} x1={pad} x2={w - pad} y1={h * p} y2={h * p} />
        ))}
      </g>
      <path d={`${toPath(a)} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="url(#rp-a)" />
      <path d={toPath(a)} fill="none" stroke="oklch(0.55 0.12 158)" strokeWidth="1.8" strokeLinejoin="round" />
      <path d={toPath(b)} fill="none" stroke="oklch(0.62 0.14 65)" strokeWidth="1.8" strokeLinejoin="round" strokeDasharray="3 4" />
    </svg>
  );
}

function donutColor(i: number) {
  const hues = ["158", "65", "220", "25", "300"];
  return `oklch(0.55 0.13 ${hues[i % hues.length]})`;
}

function DonutChart({ data }: { data: { topic: string; value: number }[] }) {
  const size = 180, r = 70, stroke = 28;
  const cx = size / 2, cy = size / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="180" height="180" style={{ display: "block", margin: "0 auto" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={stroke} />
      {data.map((d, i) => {
        const len = c * d.value;
        const dash = `${len} ${c - len}`;
        const el = (
          <circle
            key={d.topic}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={donutColor(i)}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        );
        offset += len;
        return el;
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="22" fontFamily="var(--font-display)" fill="var(--ink)" letterSpacing="-0.5">
        {data.length}
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--ink-3)" letterSpacing="1.5">
        TOPICS
      </text>
    </svg>
  );
}

function BarChart({ data }: { data: { band: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, height: 180, alignItems: "end", marginTop: 10 }}>
      {data.map((d, i) => (
        <div key={d.band} style={{ display: "grid", gridTemplateRows: "1fr auto", gap: 6, height: "100%", textAlign: "center" }}>
          <div style={{ background: "var(--bg-2)", borderRadius: 8, position: "relative", overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                bottom: 0, left: 0, right: 0,
                height: `${(d.value / max) * 100}%`,
                background: `linear-gradient(180deg, oklch(0.7 0.13 ${i < 2 ? 25 : i < 3 ? 75 : 158}), oklch(0.5 0.12 ${i < 2 ? 25 : i < 3 ? 75 : 158}))`,
                borderRadius: 8,
                animation: "barGrow 0.7s cubic-bezier(0.22,1,0.36,1) both",
                animationDelay: `${i * 80}ms`,
                transformOrigin: "bottom",
              }}
            />
            <span
              className="mono"
              style={{
                position: "absolute",
                top: 6, left: 0, right: 0,
                fontSize: 11,
                color: "var(--ink-2)",
                fontWeight: 600,
              }}
            >
              {d.value}%
            </span>
          </div>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{d.band}</span>
        </div>
      ))}
    </div>
  );
}

function Funnel({ steps }: { steps: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...steps.map((s) => s.value));
  return (
    <ul className="funnel" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {steps.map((s, i) => {
        const next = steps[i + 1]?.value;
        const conv = next !== undefined ? Math.round((next / s.value) * 100) : null;
        return (
          <li key={s.label} style={{ display: "grid", gridTemplateColumns: "200px 1fr 100px", gap: 16, alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</span>
            <div style={{ position: "relative", height: 32, background: "var(--bg-2)", borderRadius: 8, overflow: "hidden" }}>
              <div
                style={{
                  position: "absolute",
                  top: 0, bottom: 0, left: 0,
                  width: `${(s.value / max) * 100}%`,
                  background: `linear-gradient(90deg, oklch(0.7 0.13 ${s.color}), oklch(0.55 0.13 ${s.color}))`,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 12,
                  color: "white",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  animation: "funnelGrow 0.7s cubic-bezier(0.22,1,0.36,1) both",
                  animationDelay: `${i * 80}ms`,
                  transformOrigin: "left",
                }}
              >
                {s.value.toLocaleString()}
              </div>
              {conv !== null && (
                <span
                  className="mono"
                  style={{
                    position: "absolute",
                    right: 10, top: "50%", transform: "translateY(-50%)",
                    fontSize: 11, color: "var(--ink-3)",
                  }}
                >
                  → {conv}%
                </span>
              )}
            </div>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "right" }}>
              {Math.round((s.value / steps[0].value) * 100)}% of top
            </span>
          </li>
        );
      })}
      <style>{`
        @keyframes funnelGrow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @media (max-width: 720px) {
          .funnel li { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </ul>
  );
}

(window as any).AdminReports = AdminReports;
