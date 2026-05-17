import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, PlayIcon, XIcon } from "../../components/ui";
import { api } from "../../lib/api";

type Props = { onStartTest: (moduleId?: string) => void };

const topicColors: Record<string, string> = {
  vocabulary: "158", grammar: "65", listening: "220", speaking: "25", writing: "300",
};

export function PracticeScreen({ onStartTest }: Props) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [playTitle, setPlayTitle] = useState("");

  const { data: sessions = [] } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: api.sessions.myList,
  });

  async function watchRecording(s: any) {
    setPlayTitle(s.module_title);
    setPlayUrl("");
    try {
      const res = await api.sessions.playUrl(s.id);
      setPlayUrl(res.url);
    } catch {
      setPlayUrl(null);
    }
  }

  return (
    <div className="container">
      <header className="fade-up" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Practice</p>
        <h1 className="serif" style={{ fontSize: 40, margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
          Your <span className="serif-it">session</span> history.
        </h1>
        <p style={{ color: "var(--ink-2)", margin: 0, maxWidth: 520 }}>
          Every completed session is listed here. Recordings are saved for your review.
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
        <div className="card" style={{ overflow: "hidden" }}>
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
              {sessions.map((s: any, i: number) => (
                <tr key={s.id} className="fade-up" style={{ animationDelay: `${i * 40}ms`, borderBottom: "1px solid var(--line-2)" }}>
                  <td data-label="Module" style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>{s.module_title}</span>
                  </td>
                  <td data-label="Topic" style={tdStyle}>
                    <span className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: `oklch(0.95 0.04 ${topicColors[s.module_topic] || "158"})`, color: `oklch(0.4 0.1 ${topicColors[s.module_topic] || "158"})`, textTransform: "capitalize" }}>
                      {s.module_topic}
                    </span>
                  </td>
                  <td data-label="Score" style={tdStyle}>
                    <span className="serif" style={{ fontSize: 18, fontWeight: 600 }}>{s.score_pct}%</span>
                  </td>
                  <td data-label="XP" style={tdStyle}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--accent-ink)" }}>+{s.xp_earned} XP</span>
                  </td>
                  <td data-label="Date" style={{ ...tdStyle, color: "var(--ink-3)", fontSize: 13 }}>
                    {s.finished_at ? new Date(s.finished_at).toLocaleDateString() : "—"}
                  </td>
                  <td style={tdStyle}>
                    {s.recording_blob && (
                      <button className="btn ghost sm" style={{ gap: 6 }} onClick={() => watchRecording(s)}>
                        <PlayIcon size={13} /> Watch
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {playUrl !== null && (
        <div style={{ position: "fixed", inset: 0, background: "oklch(0 0 0/0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={(e) => e.target === e.currentTarget && setPlayUrl(null)}>
          <div style={{ background: "var(--bg)", borderRadius: "var(--r-xl)", width: "min(600px,96vw)", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
              <p className="serif" style={{ margin: 0, fontSize: 18 }}>{playTitle}</p>
              <button className="icon-btn" onClick={() => setPlayUrl(null)}><XIcon size={16} /></button>
            </div>
            <div style={{ padding: 18 }}>
              {playUrl === "" ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-3)" }}>Loading…</div>
              ) : (
                <video controls autoPlay style={{ width: "100%", borderRadius: "var(--r-md)" }} src={playUrl} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600, background: "var(--bg-2)" };
const tdStyle: React.CSSProperties = { padding: "14px 16px", verticalAlign: "middle" };
