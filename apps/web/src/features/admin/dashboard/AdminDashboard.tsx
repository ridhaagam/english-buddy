import { useQuery } from "@tanstack/react-query";
import { AnimatedNumber, SparkleIcon, UsersIcon, BookOpenIcon, BarChartIcon } from "../../../components/ui";
import { api } from "../../../lib/api";

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

      <style>{`
        .adm-page { padding-top: 28px; }
        .adm-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
        .adm-kpi-card { background:var(--surface); border:1px solid var(--line); border-radius:var(--r-md); padding:18px; display:flex; align-items:center; gap:14px; border-top:3px solid oklch(0.7 0.12 var(--c)); }
        .kpi-icon { width:38px;height:38px; border-radius:10px; background:oklch(0.95 0.04 var(--c)); color:oklch(0.4 0.1 var(--c)); display:grid; place-items:center; flex-shrink:0; }
        .kpi-body { display:flex; flex-direction:column; gap:2px; }
        .kpi-val { font-size:26px; letter-spacing:-0.02em; }
        .adm-cols { display:grid; grid-template-columns:1.4fr 1fr; gap:16px; }
        .adm-activity { padding:22px 24px; }
        .act-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line-2); }
        .act-row:last-child { border-bottom:0; padding-bottom:0; }
        .act-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .act-body { flex:1; font-size:14px; }
        .qs-list { display:flex; flex-direction:column; gap:12px; }
        .qs-row { display:flex; justify-content:space-between; align-items:baseline; padding:8px 0; border-bottom:1px solid var(--line-2); }
        .qs-row:last-child { border-bottom:0; }
        @media(max-width:900px) { .adm-kpi-grid{grid-template-columns:repeat(2,1fr)} .adm-cols{grid-template-columns:1fr} }
      `}</style>
    </div>
  );
}
