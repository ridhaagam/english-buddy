import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

export function AdminReports() {
  const { data: kpi } = useQuery({ queryKey: ["admin-reports-kpi"], queryFn: api.admin.reports.kpi });
  const { data: daily = [] } = useQuery({ queryKey: ["admin-reports-daily"], queryFn: () => api.admin.reports.daily() });
  const { data: topicMix = [] } = useQuery({ queryKey: ["admin-reports-topic-mix"], queryFn: api.admin.reports.topicMix });
  const { data: accuracy = [] } = useQuery({ queryKey: ["admin-reports-accuracy"], queryFn: api.admin.reports.accuracyDist });

  const topicColors: Record<string, string> = {
    vocabulary: "158", grammar: "65", listening: "220", speaking: "25", writing: "300",
  };

  const dailyMax = Math.max(...(daily as any[]).map((d: any) => d.count ?? 0), 1);
  const accMax = Math.max(...(accuracy as any[]).map((a: any) => a.count ?? 0), 1);

  return (
    <div className="container adm-page">
      <header style={{ marginBottom: 24 }}>
        <p className="eyebrow">Admin</p>
        <h1 className="serif" style={{ fontSize: 36, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Reports</h1>
        <p style={{ color: "var(--ink-2)", margin: 0 }}>Platform analytics and learning trends.</p>
      </header>

      <div className="rep-kpi-strip">
        {[
          { label: "Avg accuracy", value: `${Math.round(kpi?.avg_accuracy ?? 0)}%` },
          { label: "Completion rate", value: `${Math.round(kpi?.completion_rate ?? 0)}%` },
          { label: "Avg session XP", value: Math.round(kpi?.avg_xp ?? 0) },
          { label: "7-day retention", value: `${Math.round(kpi?.retention_7d ?? 0)}%` },
        ].map((k) => (
          <div key={k.label} className="card rep-kpi">
            <span className="eyebrow">{k.label}</span>
            <strong className="serif" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>{k.value}</strong>
          </div>
        ))}
      </div>

      <div className="rep-grid">
        <div className="card rep-panel">
          <h2 className="serif" style={{ margin: "0 0 18px", fontSize: 18 }}>Daily sessions (last 14 days)</h2>
          <div className="bar-chart">
            {(daily as any[]).map((d: any, i: number) => (
              <div key={i} className="bar-col">
                <div className="bar-bar" style={{ height: `${Math.round((d.count / dailyMax) * 100)}%`, background: "var(--accent)" }} title={`${d.count} sessions`} />
                <span className="mono bar-label">{d.label}</span>
              </div>
            ))}
            {daily.length === 0 && <p style={{ color: "var(--ink-3)", fontSize: 14, margin: 0 }}>No data yet.</p>}
          </div>
        </div>

        <div className="card rep-panel">
          <h2 className="serif" style={{ margin: "0 0 18px", fontSize: 18 }}>Topic distribution</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(topicMix as any[]).map((t: any) => (
              <div key={t.topic} className="topic-row">
                <span className="mono" style={{ fontSize: 12, width: 80, textTransform: "capitalize", color: "var(--ink-2)" }}>{t.topic}</span>
                <div className="topic-track">
                  <div className="topic-fill" style={{ width: `${t.pct ?? 0}%`, background: `oklch(0.65 0.12 ${topicColors[t.topic] || "158"})` }} />
                </div>
                <span className="mono" style={{ fontSize: 11, width: 36, textAlign: "right", color: "var(--ink-3)" }}>{t.pct ?? 0}%</span>
              </div>
            ))}
            {topicMix.length === 0 && <p style={{ color: "var(--ink-3)", fontSize: 14, margin: 0 }}>No data yet.</p>}
          </div>
        </div>

        <div className="card rep-panel">
          <h2 className="serif" style={{ margin: "0 0 18px", fontSize: 18 }}>Accuracy distribution</h2>
          <div className="bar-chart">
            {(accuracy as any[]).map((a: any, i: number) => (
              <div key={i} className="bar-col">
                <div className="bar-bar" style={{ height: `${Math.round((a.count / accMax) * 100)}%`, background: `oklch(0.65 0.12 ${i > 6 ? "158" : i > 3 ? "75" : "25"})` }} title={`${a.count} sessions`} />
                <span className="mono bar-label">{a.bucket}</span>
              </div>
            ))}
            {accuracy.length === 0 && <p style={{ color: "var(--ink-3)", fontSize: 14, margin: 0 }}>No data yet.</p>}
          </div>
        </div>
      </div>

      <style>{`
        .adm-page { padding-top: 28px; }
        .rep-kpi-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
        .rep-kpi { padding:16px 18px; display:flex; flex-direction:column; gap:4px; }
        .rep-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
        .rep-panel { padding:22px 24px; }
        .bar-chart { display:flex; align-items:flex-end; gap:6px; height:160px; padding-bottom:22px; position:relative; }
        .bar-col { display:flex; flex-direction:column; align-items:center; flex:1; height:100%; justify-content:flex-end; position:relative; }
        .bar-bar { width:100%; border-radius:4px 4px 0 0; min-height:2px; transition:height 0.6s cubic-bezier(0.22,1,0.36,1); }
        .bar-label { position:absolute; bottom:-18px; font-size:9px; color:var(--ink-3); white-space:nowrap; }
        .topic-row { display:flex; align-items:center; gap:10px; }
        .topic-track { flex:1; height:8px; background:var(--bg-2); border-radius:999px; overflow:hidden; }
        .topic-fill { height:100%; border-radius:999px; transition:width 0.8s cubic-bezier(0.22,1,0.36,1); }
        @media(max-width:900px) { .rep-kpi-strip{grid-template-columns:repeat(2,1fr)} .rep-grid{grid-template-columns:1fr} }
      `}</style>
    </div>
  );
}
