import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import "./AdminReports.css";

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

    </div>
  );
}
