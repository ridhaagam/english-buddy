import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, CheckIcon, XIcon, ClockIcon, FlagIcon, ArrowRightIcon } from "../../components/ui";
import { api } from "../../lib/api";

type Props = {
  sessionId: string;
  onBack: () => void;
  onPracticeAgain: (moduleId: string) => void;
};

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatSelection(kind: string, selection: any, payload: any): string {
  if (!selection) return "—";
  if (kind === "match") {
    return Object.entries(selection).map(([l, r]) => `${l} → ${r}`).join(", ");
  }
  const choiceId = selection.choice;
  if (!choiceId) return "—";
  if (kind === "fill" && !payload?.choices?.length) {
    return choiceId; // free-text fill
  }
  const choice = payload?.choices?.find((c: any) => c.id === choiceId);
  return choice?.label ?? choiceId;
}

export function SessionDetailPage({ sessionId, onBack, onPracticeAgain }: Props) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [videoShown, setVideoShown] = useState(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ["session-detail", sessionId],
    queryFn: () => api.sessions.get(sessionId),
  });

  async function loadVideo() {
    setVideoShown(true);
    try {
      const res = await api.sessions.playUrl(sessionId);
      setPlayUrl((res as any).url);
    } catch {}
  }

  if (isLoading) {
    return (
      <div className="container" style={{ paddingTop: 48, textAlign: "center" }}>
        <div className="dot-load"><i /><i /><i /></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container" style={{ paddingTop: 48 }}>
        <button className="btn ghost" onClick={onBack}><ArrowLeftIcon size={14} /> Back</button>
        <p style={{ color: "var(--ink-3)", marginTop: 24 }}>Session not found.</p>
      </div>
    );
  }

  const answersRevealed = session.answers_revealed;
  const revealAt = session.reveal_at ? new Date(session.reveal_at) : null;
  const totalTime = (session.answers ?? []).reduce((sum: number, a: any) => sum + (a.time_spent_ms ?? 0), 0);

  const pct = session.score_pct ?? 0;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const passed = pct >= 70;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      {/* Top nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <button className="btn ghost" style={{ gap: 6 }} onClick={onBack}>
          <ArrowLeftIcon size={14} /> Back to practice history
        </button>
        {session.module_id && (
          <button className="btn accent" style={{ gap: 6 }} onClick={() => onPracticeAgain(session.module_id)}>
            Practice again <ArrowRightIcon size={14} />
          </button>
        )}
      </div>

      {/* Header card */}
      <div className="card sd-header">
        <div style={{ flex: 1 }}>
          <p className="eyebrow" style={{ margin: "0 0 4px" }}>Session detail</p>
          <h1 className="serif" style={{ margin: "0 0 8px", fontSize: 28, letterSpacing: "-0.02em" }}>{session.module_title}</h1>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "var(--ink-3)", alignItems: "center" }}>
            {session.finished_at && (
              <span>{new Date(session.finished_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            )}
            {totalTime > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ClockIcon size={12} /> {formatTime(totalTime)}
              </span>
            )}
            {(session.tab_switch_count ?? 0) > 0 && (
              <span style={{ color: "oklch(0.5 0.1 40)", fontWeight: 600 }}>
                ⚠ {session.tab_switch_count} tab switch{session.tab_switch_count !== 1 ? "es" : ""}
              </span>
            )}
            {(session.face_anomaly_count ?? 0) > 0 && (
              <span style={{ color: "oklch(0.5 0.1 40)", fontWeight: 600 }}>
                ⚠ {session.face_anomaly_count} face anomal{session.face_anomaly_count !== 1 ? "ies" : "y"}
              </span>
            )}
          </div>
        </div>

        {/* Score ring — hidden if not revealed */}
        {answersRevealed && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <svg viewBox="0 0 90 90" width="80" height="80">
              <circle cx="45" cy="45" r={r} stroke="var(--line)" strokeWidth="6" fill="none" />
              <circle cx="45" cy="45" r={r}
                stroke={passed ? "var(--accent)" : "oklch(0.6 0.12 25)"}
                strokeWidth="6" fill="none" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset}
                transform="rotate(-90 45 45)" />
            </svg>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
              <strong className="serif" style={{ fontSize: 16, display: "block" }}>{pct}%</strong>
            </div>
          </div>
        )}
      </div>

      {/* Reveal notice */}
      {!answersRevealed && (
        <div style={{ marginBottom: 16, padding: "14px 18px", borderRadius: "var(--r-md)", background: "oklch(0.97 0.03 85)", border: "1px solid oklch(0.88 0.06 85)" }}>
          <strong style={{ fontSize: 14 }}>
            {revealAt ? "Results not yet available" : "Results locked by instructor"}
          </strong>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)" }}>
            {revealAt
              ? `Correct answers and your score will be visible after ${revealAt.toLocaleString()}.`
              : "Your instructor has chosen not to reveal correct answers for this module."}
          </p>
        </div>
      )}

      {/* Recording */}
      {session.recording_blob && (
        <div className="card" style={{ marginBottom: 16, padding: "16px 20px" }}>
          {!videoShown ? (
            <button className="btn ghost" style={{ width: "100%" }} onClick={loadVideo}>
              ▶ Play session recording
            </button>
          ) : playUrl ? (
            <video controls preload="metadata" style={{ width: "100%", borderRadius: "var(--r-md)", maxHeight: 260 }} src={playUrl} />
          ) : (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--ink-3)" }}>Loading…</div>
          )}
        </div>
      )}

      {/* Answer breakdown */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <p className="eyebrow" style={{ margin: "0 0 14px" }}>
          Questions ({(session.answers ?? []).length})
          {!answersRevealed && <span style={{ marginLeft: 8, color: "var(--ink-3)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— results hidden until reveal date</span>}
        </p>
        {(session.answers ?? []).length === 0 && (
          <p style={{ color: "var(--ink-3)", fontSize: 13 }}>No answer data.</p>
        )}
        {(session.answers ?? []).map((a: any, i: number) => {
          const userAnswer = formatSelection(a.kind, a.selection, a.payload);
          return (
            <div key={i} style={{
              marginBottom: 8,
              borderRadius: "var(--r-sm)",
              padding: "12px 14px",
              background: "var(--bg-2)",
              border: a.flagged ? "1px solid oklch(0.85 0.08 40)" : "1px solid var(--line-2)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}>
              {/* Result icon — only if revealed */}
              {answersRevealed && a.is_correct !== null ? (
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 2,
                  background: a.is_correct ? "var(--accent-soft)" : "oklch(0.95 0.04 25)",
                  color: a.is_correct ? "var(--accent-ink)" : "oklch(0.5 0.1 25)",
                }}>
                  {a.is_correct ? <CheckIcon size={12} /> : <XIcon size={12} />}
                </div>
              ) : (
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--bg-2)", border: "1.5px solid var(--line)", flexShrink: 0, marginTop: 2 }} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 500 }}>{a.question_prompt || `Question ${i + 1}`}</p>

                {/* Always show what the user answered */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0 }}>Your answer:</span>
                  <span style={{ fontSize: 13, color: "var(--ink-2)", fontStyle: "italic" }}>{userAnswer}</span>
                </div>

                {a.flagged && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 8px", borderRadius: 999, marginTop: 4, background: "oklch(0.95 0.06 40)", color: "oklch(0.45 0.12 40)" }}>
                    <FlagIcon size={10} /> Flagged by admin
                  </span>
                )}
                {a.admin_comment && (
                  <div style={{ marginTop: 6, padding: "6px 10px", background: "oklch(0.97 0.03 85)", borderRadius: "var(--r-sm)", border: "1px solid oklch(0.88 0.06 85)", fontSize: 13, color: "oklch(0.4 0.1 85)" }}>
                    <strong>Admin note:</strong> {a.admin_comment}
                  </div>
                )}
              </div>
              {a.time_spent_ms != null && (
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0, marginTop: 2 }}>{Math.round(a.time_spent_ms / 1000)}s</span>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .sd-header { display:flex; align-items:flex-start; gap:20px; padding:24px; margin-bottom:16px; }
        @media(max-width:520px) { .sd-header{flex-direction:column} }
      `}</style>
    </div>
  );
}
