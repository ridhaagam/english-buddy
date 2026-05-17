import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlagIcon, CheckIcon, XIcon, ImportIcon } from "../../../components/ui";
import { api } from "../../../lib/api";

type AnswerEdit = { flagged: boolean; admin_comment: string };

export function AdminRecordings() {
  const qc = useQueryClient();
  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ["admin-recordings"],
    queryFn: () => api.admin.recordings.list(),
  });

  const [filter, setFilter] = useState<"all" | "flagged" | "tab_switch" | "face_anomaly">("all");
  const [viewing, setViewing] = useState<any>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [videoShown, setVideoShown] = useState(false);
  const [answerEdits, setAnswerEdits] = useState<Record<string, AnswerEdit>>({});
  const [savingAnswer, setSavingAnswer] = useState<string | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  async function openRecording(r: any) {
    setViewing(r);
    setPlayUrl(null);
    setVideoShown(false);
    setAnswerEdits({});
    setSavedAnswers(new Set());
    const [detail, urlResult] = await Promise.allSettled([
      api.admin.recordings.get(r.id),
      r.recording_blob ? api.admin.recordings.playUrl(r.id) : Promise.reject("no blob"),
    ]);
    if (detail.status === "fulfilled") {
      const d = detail.value as any;
      setViewing(d);
      const edits: Record<string, AnswerEdit> = {};
      for (const a of d.answers || []) {
        if (a.question_id) {
          edits[a.question_id] = { flagged: a.flagged || false, admin_comment: a.admin_comment || "" };
        }
      }
      setAnswerEdits(edits);
    }
    if (urlResult.status === "fulfilled") setPlayUrl((urlResult.value as any).url);
  }

  async function saveAnswerFlag(questionId: string) {
    if (!viewing?.id) return;
    setSavingAnswer(questionId);
    try {
      await api.admin.recordings.flagAnswer(
        viewing.id,
        questionId,
        answerEdits[questionId] ?? { flagged: false, admin_comment: "" },
      );
      setSavedAnswers((prev) => new Set([...prev, questionId]));
      qc.invalidateQueries({ queryKey: ["admin-recordings"] });
    } catch {
      // keep savingAnswer cleared so Save button re-appears on failure
    } finally {
      setSavingAnswer(null);
    }
  }

  async function saveAll() {
    if (!viewing?.id) return;
    setSavingAll(true);
    try {
      const qids = Object.keys(answerEdits);
      await Promise.all(qids.map((qid) => api.admin.recordings.flagAnswer(viewing.id, qid, answerEdits[qid])));
      setSavedAnswers(new Set(qids));
      qc.invalidateQueries({ queryKey: ["admin-recordings"] });
    } finally {
      setSavingAll(false);
    }
  }

  const flag = useMutation({
    mutationFn: (id: string) => api.admin.recordings.flag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-recordings"] }),
  });
  const unflag = useMutation({
    mutationFn: (id: string) => api.admin.recordings.unflag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-recordings"] }),
  });

  const filtered = (recordings as any[]).filter((r: any) => {
    if (filter === "flagged") return r.flagged;
    if (filter === "tab_switch") return (r.tab_switch_count ?? 0) > 0;
    if (filter === "face_anomaly") return (r.face_anomaly_count ?? 0) > 0;
    return true;
  });

  const filterCounts = {
    flagged: (recordings as any[]).filter((r: any) => r.flagged).length,
    tab_switch: (recordings as any[]).filter((r: any) => (r.tab_switch_count ?? 0) > 0).length,
    face_anomaly: (recordings as any[]).filter((r: any) => (r.face_anomaly_count ?? 0) > 0).length,
  };

  return (
    <div className="container adm-page">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="serif" style={{ fontSize: 36, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Recordings</h1>
          <p style={{ color: "var(--ink-2)", margin: 0 }}>Review session recordings and flag integrity issues.</p>
        </div>
        <button className="btn ghost" style={{ marginTop: 8, gap: 6 }} onClick={async () => {
          try {
            const token = localStorage.getItem("access_token");
            const res = await fetch("/api/v1/admin/recordings/export/csv", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (!res.ok) throw new Error(`Export failed: ${res.status}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "recordings.csv"; a.click();
            URL.revokeObjectURL(url);
          } catch (err: any) {
            alert(err.message || "Export failed");
          }
        }}>
          <ImportIcon size={14} /> Export CSV
        </button>
      </header>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {(["all", "flagged", "tab_switch", "face_anomaly"] as const).map((f) => {
          const labels = { all: "All", flagged: `Flagged (${filterCounts.flagged})`, tab_switch: `Tab switch (${filterCounts.tab_switch})`, face_anomaly: `Face anomaly (${filterCounts.face_anomaly})` };
          return (
            <button key={f} onClick={() => setFilter(f)} className="mono"
              style={{ fontSize: 11, padding: "5px 12px", borderRadius: 999, border: "1px solid var(--line)", cursor: "pointer", transition: "all 0.15s",
                background: filter === f ? "var(--accent)" : "var(--bg-2)",
                color: filter === f ? "var(--accent-on)" : "var(--ink-2)", fontWeight: filter === f ? 700 : 400 }}>
              {labels[f]}
            </button>
          );
        })}
      </div>

      {isLoading && <div style={{ color: "var(--ink-3)" }}>Loading…</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["Learner", "Module", "Score", "Proctoring", "Date", "Status", ""].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r: any) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                <td style={tdStyle}><span style={{ fontWeight: 600 }}>{r.user_name}</span></td>
                <td style={tdStyle}>{r.module_title}</td>
                <td style={tdStyle}><span className="serif" style={{ fontSize: 17 }}>{r.score_pct}%</span></td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(r.tab_switch_count ?? 0) > 0 && (
                      <span className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "oklch(0.95 0.04 50)", color: "oklch(0.45 0.1 50)", border: "1px solid oklch(0.85 0.06 50)" }}>
                        {r.tab_switch_count} tab
                      </span>
                    )}
                    {(r.face_anomaly_count ?? 0) > 0 && (
                      <span className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "oklch(0.95 0.04 25)", color: "oklch(0.45 0.1 25)", border: "1px solid oklch(0.85 0.06 25)" }}>
                        {r.face_anomaly_count} face
                      </span>
                    )}
                    {!r.tab_switch_count && !r.face_anomaly_count && <span style={{ color: "var(--ink-3)", fontSize: 12 }}>—</span>}
                  </div>
                </td>
                <td style={{ ...tdStyle, color: "var(--ink-3)", fontSize: 13 }}>{r.finished_at ? new Date(r.finished_at).toLocaleDateString() : "—"}</td>
                <td style={tdStyle}>
                  {r.flagged ? (
                    <span className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: "oklch(0.95 0.06 25)", color: "oklch(0.5 0.1 25)", border: "1px solid oklch(0.85 0.06 25)" }}>Flagged</span>
                  ) : (
                    <span className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink-3)", border: "1px solid var(--line)" }}>Clean</span>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn ghost sm" style={{ gap: 5 }} onClick={() => openRecording(r)}>
                      Review
                    </button>
                    {r.flagged
                      ? <button className="btn ghost sm" onClick={() => unflag.mutate(r.id)}><CheckIcon size={12} /> Unflag</button>
                      : <button className="btn ghost sm" onClick={() => flag.mutate(r.id)}><FlagIcon size={12} /> Flag</button>
                    }
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "var(--ink-3)" }}>
                {filter === "all" ? "No recordings yet." : `No recordings match filter "${filter}".`}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="rec-modal-overlay" onClick={(e) => e.target === e.currentTarget && setViewing(null)}>
          <div className="rec-modal fade-up">
            <div className="rec-modal-head">
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>Session review</p>
                <h3 className="serif" style={{ margin: "4px 0 0", fontSize: 20 }}>{viewing.user_name} · {viewing.module_title}</h3>
              </div>
              <button className="icon-btn" onClick={() => setViewing(null)}><XIcon size={16} /></button>
            </div>

            {/* Proctoring summary */}
            {((viewing.tab_switch_count ?? 0) > 0 || (viewing.face_anomaly_count ?? 0) > 0) && (
              <div style={{ margin: "14px 24px 0", padding: "12px 14px", borderRadius: "var(--r-md)", background: "oklch(0.97 0.03 50)", border: "1px solid oklch(0.88 0.06 50)" }}>
                <p className="eyebrow" style={{ margin: "0 0 6px", color: "oklch(0.45 0.1 50)" }}>Proctoring events</p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {(viewing.tab_switch_count ?? 0) > 0 && (
                    <span style={{ fontSize: 13 }}>Tab switches: <strong>{viewing.tab_switch_count}</strong></span>
                  )}
                  {(viewing.face_anomaly_count ?? 0) > 0 && (
                    <span style={{ fontSize: 13 }}>Face anomalies: <strong>{viewing.face_anomaly_count}</strong></span>
                  )}
                </div>
                {(viewing.answers || []).some((a: any) => a.tab_switch || a.face_anomaly) && (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(viewing.answers || []).map((a: any, i: number) => (a.tab_switch || a.face_anomaly) ? (
                      <span key={i} className="mono" style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "oklch(0.93 0.05 50)", border: "1px solid oklch(0.85 0.07 50)", color: "oklch(0.4 0.1 50)" }}>
                        Q{i + 1}{a.tab_switch ? " tab" : ""}{a.face_anomaly ? " face" : ""}
                      </span>
                    ) : null)}
                  </div>
                )}
              </div>
            )}

            {/* Recording — collapsed by default, click to reveal */}
            <div className="rec-player">
              {viewing.recording_blob ? (
                !videoShown ? (
                  <button className="btn ghost" style={{ width: "100%" }} onClick={() => setVideoShown(true)}>
                    ▶ Play recording
                  </button>
                ) : playUrl ? (
                  <video controls preload="metadata" style={{ width: "100%", borderRadius: "var(--r-md)" }} src={playUrl} />
                ) : (
                  <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ink-3)" }}>Loading…</div>
                )
              ) : (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--ink-3)" }}>
                  <span style={{ fontSize: 13 }}>No recording for this session</span>
                </div>
              )}
            </div>

            {/* Answers + save all */}
            <div className="rec-answers">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p className="eyebrow" style={{ margin: 0 }}>Answers ({(viewing.answers || []).length})</p>
                <button
                  className="btn accent sm"
                  disabled={savingAll}
                  onClick={saveAll}
                  style={{ fontSize: 11 }}>
                  {savingAll ? "Saving…" : "Save all"}
                </button>
              </div>
              {(viewing.answers || []).map((a: any, i: number) => {
                const qid = a.question_id;
                const edit = qid ? (answerEdits[qid] ?? { flagged: a.flagged || false, admin_comment: a.admin_comment || "" }) : null;
                const wasSaved = qid && savedAnswers.has(qid);
                return (
                  <div key={i} style={{ marginBottom: 8, borderRadius: "var(--r-sm)", border: edit?.flagged ? "1px solid oklch(0.85 0.07 25)" : "1px solid var(--line-2)", background: "var(--bg-2)" }}>
                    <div className="rec-ans-row" style={{ border: "none", borderRadius: 0, background: "transparent", marginBottom: 0 }}>
                      <div className={`ans-icon ${a.is_correct ? "correct" : "wrong"}`}>
                        {a.is_correct ? <CheckIcon size={11} /> : <XIcon size={11} />}
                      </div>
                      <span style={{ flex: 1, fontSize: 13 }}>{a.question_prompt || `Question ${i + 1}`}</span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        {a.tab_switch && <span className="mono" style={{ fontSize: 10, padding: "1px 5px", borderRadius: 999, background: "oklch(0.93 0.04 50)", color: "oklch(0.45 0.1 50)" }}>tab</span>}
                        {a.face_anomaly && <span className="mono" style={{ fontSize: 10, padding: "1px 5px", borderRadius: 999, background: "oklch(0.93 0.04 25)", color: "oklch(0.45 0.1 25)" }}>face</span>}
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                          {a.time_spent_ms ? `${Math.round(a.time_spent_ms / 1000)}s` : ""}
                        </span>
                        {qid && (
                          <button
                            onClick={() => {
                              setSavedAnswers((prev) => { const s = new Set(prev); s.delete(qid); return s; });
                              setAnswerEdits((prev) => ({ ...prev, [qid]: { ...(prev[qid] ?? { flagged: false, admin_comment: "" }), flagged: !(edit?.flagged) } }));
                            }}
                            style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, border: "1px solid var(--line)", background: edit?.flagged ? "oklch(0.93 0.06 25)" : "var(--bg)", color: edit?.flagged ? "oklch(0.45 0.1 25)" : "var(--ink-3)", cursor: "pointer" }}>
                            <FlagIcon size={10} /> {edit?.flagged ? "Flagged" : "Flag"}
                          </button>
                        )}
                      </div>
                    </div>
                    {qid && (
                      <div style={{ padding: "6px 10px 8px", borderTop: "1px solid var(--line-2)" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            value={edit?.admin_comment ?? ""}
                            onChange={(e) => {
                              setSavedAnswers((prev) => { const s = new Set(prev); s.delete(qid); return s; });
                              setAnswerEdits((prev) => ({ ...prev, [qid]: { ...(prev[qid] ?? { flagged: false, admin_comment: "" }), admin_comment: e.target.value } }));
                            }}
                            placeholder="Add admin note…"
                            style={{ flex: 1, fontSize: 12, padding: "5px 8px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)" }}
                          />
                          {wasSaved ? (
                            <span style={{ fontSize: 11, color: "var(--accent-ink)", fontWeight: 600, flexShrink: 0 }}>Saved ✓</span>
                          ) : (
                            <button
                              className="btn ghost sm"
                              disabled={savingAnswer === qid}
                              onClick={() => saveAnswerFlag(qid)}
                              style={{ fontSize: 11, flexShrink: 0 }}>
                              {savingAnswer === qid ? "…" : "Save"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .adm-page { padding-top: 28px; }
        .rec-modal-overlay { position:fixed; inset:0; background:oklch(0 0 0/0.5); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; }
        .rec-modal { background:var(--bg); border-radius:var(--r-xl); width:min(680px,96vw); max-height:90vh; overflow-y:auto; box-shadow:var(--shadow-lg); display:flex; flex-direction:column; gap:0; }
        .rec-modal-head { display:flex; justify-content:space-between; align-items:flex-start; padding:22px 24px 16px; border-bottom:1px solid var(--line); }
        .rec-player { padding:16px 24px; }
        .rec-answers { padding:0 24px 22px; }
        .rec-ans-row { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:var(--r-sm); margin-bottom:4px; background:var(--bg-2); }
        .ans-icon { width:22px;height:22px; border-radius:50%; display:grid; place-items:center; flex-shrink:0; }
        .ans-icon.correct { background:var(--accent-soft); color:var(--accent-ink); }
        .ans-icon.wrong { background:oklch(0.95 0.04 25); color:oklch(0.5 0.1 25); }
      `}</style>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600, background: "var(--bg-2)" };
const tdStyle: React.CSSProperties = { padding: "14px 16px", verticalAlign: "middle", fontSize: 14 };
