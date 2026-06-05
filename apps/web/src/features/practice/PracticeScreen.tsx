import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, KeyboardIcon, EyeIcon, ZapIcon } from "../../components/ui";
import { api } from "../../lib/api";

type Props = {
  onStartTest: (moduleId?: string) => void;
  onViewSession: (id: string) => void;
  onViewTypingSession: (id: string) => void;
  onStartTyping?: () => void;
};

const topicColors: Record<string, string> = {
  vocabulary: "158", grammar: "65", listening: "220", speaking: "25", writing: "300",
};

const modeLabel: Record<string, string> = { type: "See & type", dictation: "Dictation", review: "Review" };

export function PracticeScreen({ onStartTest, onViewSession, onViewTypingSession, onStartTyping }: Props) {
  const { data: sessions = [] } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => api.sessions.myList({ dedupe: true }),
  });
  const { data: typingSessions = [] } = useQuery({
    queryKey: ["my-typing-sessions"],
    queryFn: () => api.typing.sessionsMine(),
  });

  const noneAtAll = (sessions as any[]).length === 0 && (typingSessions as any[]).length === 0;

  return (
    <div className="container">
      <header className="fade-up" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Practice</p>
        <h1 className="serif" style={{ fontSize: 40, margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
          Your <span className="serif-it">session</span> history.
        </h1>
        <p style={{ color: "var(--ink-2)", margin: 0, maxWidth: 520 }}>
          Every test and typing run you've completed — click any row for a question-by-question breakdown.
        </p>
      </header>

      {noneAtAll && (
        <div className="card" style={{ padding: "60px 32px", textAlign: "center", marginBottom: 24 }}>
          <p className="serif" style={{ fontSize: 22, margin: "0 0 12px" }}>Nothing here yet</p>
          <p style={{ color: "var(--ink-2)", margin: "0 0 20px" }}>Complete your first practice to see it here.</p>
          <button className="btn accent" onClick={() => onStartTest()}>Start first session <ArrowRightIcon size={14} /></button>
        </div>
      )}

      {/* ── Tests & quizzes ─────────────────────────────────────────────── */}
      {(sessions as any[]).length > 0 && (
        <section className="fade-up" style={{ marginBottom: 28 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Tests &amp; quizzes</p>
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
        </section>
      )}

      {/* ── Typing trainer ──────────────────────────────────────────────── */}
      {(typingSessions as any[]).length > 0 ? (
        <section className="fade-up">
          <p className="eyebrow" style={{ marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <KeyboardIcon size={13} /> Typing trainer
          </p>
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th style={thStyle}>Deck</th>
                  <th style={thStyle}>Mode</th>
                  <th style={thStyle}>Correct</th>
                  <th style={thStyle}>WPM</th>
                  <th style={thStyle}>XP</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {(typingSessions as any[]).map((s: any, i: number) => (
                  <tr key={s.id} className="fade-up"
                    onClick={() => onViewTypingSession(s.id)}
                    style={{ animationDelay: `${i * 40}ms`, borderBottom: "1px solid var(--line-2)", cursor: "pointer" }}>
                    <td data-label="Deck" style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{s.deck_title}</span>
                      {s.mode !== "review" && <span className="mono" style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)" }}>ch.{s.chapter_index + 1}</span>}
                    </td>
                    <td data-label="Mode" style={tdStyle}>
                      <span className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: "var(--bg-2)", border: "1px solid var(--line-2)", color: "var(--ink-2)" }}>
                        {modeLabel[s.mode] ?? s.mode}
                      </span>
                    </td>
                    <td data-label="Correct" style={tdStyle}>
                      <span className="serif" style={{ fontSize: 18, fontWeight: 600 }}>{s.correct}</span>
                      <span style={{ color: "var(--ink-3)", fontSize: 13 }}>/{s.total}</span>
                    </td>
                    <td data-label="WPM" style={tdStyle}>
                      <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <ZapIcon size={11} /> {s.wpm}
                      </span>
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
        </section>
      ) : !noneAtAll && onStartTyping ? (
        <section className="fade-up">
          <p className="eyebrow" style={{ marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <KeyboardIcon size={13} /> Typing trainer
          </p>
          <div className="card" style={{ padding: "28px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-2)", fontSize: 14 }}>
              <EyeIcon size={15} /> No typing runs yet — build muscle memory one word at a time.
            </div>
            <button className="btn accent" onClick={onStartTyping}>Open typing trainer <ArrowRightIcon size={14} /></button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600, background: "var(--bg-2)" };
const tdStyle: React.CSSProperties = { padding: "14px 16px", verticalAlign: "middle" };
