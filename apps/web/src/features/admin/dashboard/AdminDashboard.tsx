import { useQuery } from "@tanstack/react-query";
import { AnimatedNumber, SparkleIcon, UsersIcon, BookOpenIcon, BarChartIcon } from "../../../components/ui";
import { api } from "../../../lib/api";
import "./AdminDashboard.css";

export function AdminDashboard() {
  const { data } = useQuery({ queryKey: ["admin-dashboard"], queryFn: api.admin.dashboard });

  const kpis = [
    { label: "Total users", value: data?.total_users ?? 0, icon: <UsersIcon size={18} />, color: "158" },
    { label: "Active today", value: data?.active_today ?? 0, icon: <SparkleIcon size={18} />, color: "75" },
    { label: "Sessions today", value: data?.sessions_today ?? 0, icon: <BarChartIcon size={18} />, color: "220" },
    { label: "Modules", value: data?.total_modules ?? 0, icon: <BookOpenIcon size={18} />, color: "300" },
  ];

  const activity = data?.recent_activity ?? [];

  return (
    <div className="container adm-page">
      <header className="fade-up" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Admin</p>
        <h1 className="serif" style={{ fontSize: 36, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Dashboard</h1>
        <p style={{ color: "var(--ink-2)", margin: 0 }}>Overview of platform activity and metrics.</p>
      </header>

      <div className="adm-kpi-grid fade-up" style={{ animationDelay: "60ms" }}>
        {kpis.map((k, i) => (
          <div key={k.label} className="adm-kpi-card" style={{ ["--c" as any]: k.color, animationDelay: `${i * 50}ms` }}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-body">
              <span className="eyebrow">{k.label}</span>
              <div className="kpi-val serif"><AnimatedNumber value={k.value} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-cols">
        <div className="card adm-activity fade-up" style={{ animationDelay: "140ms" }}>
          <h2 className="serif" style={{ margin: "0 0 16px", fontSize: 18 }}>Recent activity</h2>
          {activity.length === 0 && <p style={{ color: "var(--ink-3)", fontSize: 14 }}>No activity yet.</p>}
          {activity.map((a: any, i: number) => (
            <div key={i} className="act-row">
              <div className="act-dot" style={{ background: `oklch(0.65 0.12 ${a.hue || 158})` }} />
              <div className="act-body">
                <span style={{ fontWeight: 600, fontSize: 14 }}>{a.user_name}</span>
                <span style={{ color: "var(--ink-3)", fontSize: 13 }}> {a.action}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{a.time_ago}</span>
            </div>
          ))}
        </div>

        <div className="card fade-up" style={{ animationDelay: "180ms", padding: "22px 24px" }}>
          <h2 className="serif" style={{ margin: "0 0 16px", fontSize: 18 }}>Quick stats</h2>
          <div className="qs-list">
            {[
              { label: "Avg session score", value: `${Math.round(data?.avg_score ?? 0)}%` },
              { label: "Sessions this week", value: data?.sessions_week ?? 0 },
              { label: "XP awarded today", value: (data?.xp_today ?? 0).toLocaleString() },
              { label: "Published modules", value: data?.published_modules ?? 0 },
            ].map((s) => (
              <div key={s.label} className="qs-row">
                <span style={{ color: "var(--ink-2)", fontSize: 14 }}>{s.label}</span>
                <strong className="serif" style={{ fontSize: 18 }}>{s.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
