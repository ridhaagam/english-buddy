import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon } from "../../components/ui";
import { api } from "../../lib/api";

type Props = { onStartTest: (moduleId?: string) => void; onViewSession: (id: string) => void };

const topicColors: Record<string, string> = {
  vocabulary: "158", grammar: "65", listening: "220", speaking: "25", writing: "300",
};

export function PracticeScreen({ onStartTest, onViewSession }: Props) {
  const { data: sessions = [] } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => api.sessions.myList({ dedupe: true }),
  });

  return (
    <div className="container">
      <header className="fade-up" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Practice</p>
        <h1 className="serif" style={{ fontSize: 40, margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
          Your <span className="serif-it">session</span> history.
        </h1>
        <p style={{ color: "var(--ink-2)", margin: 0, maxWidth: 520 }}>
          One row per module — click to view your most recent attempt and per-question breakdown.
        </p>
      </header>

      {sessions.length === 0 && (
        <div className="card" style={{ padding: "60px 32px", textAlign: "center", marginBottom: 24 }}>
          <p className="serif" style={{ fontSize: 22, margin: "0 0 12px" }}>No sessions yet</p>
          <p style={{ color: "var(--ink-2)", margin: "0 0 20px" }}>Complete your first practice to see it here.</p>
          <button className="btn accent" onClick={() => onStartTest()}>Start first session <ArrowRightIcon size={14} /></button>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={thStyle}>Module</th>
                <th style={thStyle}>Topic</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>XP</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {(sessions as any[]).map((s: any, i: number) => (
                <tr key={s.id} className="fade-up"
                  onClick={() => onViewSession(s.id)}
                  style={{ animationDelay: `${i * 40}ms`, borderBottom: "1px solid var(--line-2)", cursor: "pointer" }}>
                  <td data-label="Module" style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>{s.module_title}</span>
                  </td>
                  <td data-label="Topic" style={tdStyle}>
                    <span className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: `oklch(0.95 0.04 ${topicColors[s.module_topic] || "158"})`, color: `oklch(0.4 0.1 ${topicColors[s.module_topic] || "158"})`, textTransform: "capitalize" }}>
                      {s.module_topic}
                    </span>
                  </td>
                  <td data-label="Score" style={tdStyle}>
                    {s.answers_revealed === false
                      ? <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>🔒 hidden</span>
                      : <span className="serif" style={{ fontSize: 18, fontWeight: 600 }}>{s.score_pct}%</span>
                    }
                  </td>
                  <td data-label="XP" style={tdStyle}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--accent-ink)" }}>+{s.xp_earned} XP</span>
                  </td>
                  <td data-label="Date" style={{ ...tdStyle, color: "var(--ink-3)", fontSize: 13 }}>
                    {s.finished_at ? new Date(s.finished_at).toLocaleDateString() : "—"}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}>View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600, background: "var(--bg-2)" };
const tdStyle: React.CSSProperties = { padding: "14px 16px", verticalAlign: "middle" };
