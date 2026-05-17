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

  const [filter,       setFilter]       = useState<"all" | "flagged" | "tab_switch" | "face_anomaly">("all");
  const [viewing,      setViewing]      = useState<any>(null);
  const [playUrl,      setPlayUrl]      = useState<string | null>(null);
  const [videoShown,   setVideoShown]   = useState(false);
  const [answerEdits,  setAnswerEdits]  = useState<Record<string, AnswerEdit>>({});
  const [dirtyQids,    setDirtyQids]    = useState<Set<string>>(new Set());
  const [savedQids,    setSavedQids]    = useState<Set<string>>(new Set());
  const [savingAll,    setSavingAll]    = useState(false);

  async function openRecording(r: any) {
    setViewing(r);
    setPlayUrl(null);
    setVideoShown(false);
    setAnswerEdits({});
    setDirtyQids(new Set());
    setSavedQids(new Set());

    const [detail, urlResult] = await Promise.allSettled([
      api.admin.recordings.get(r.id),
      r.recording_blob ? api.admin.recordings.playUrl(r.id) : Promise.reject("no blob"),
    ]);
    if (detail.status === "fulfilled") {
      const d = detail.value as any;
      setViewing(d);
      const edits: Record<string, AnswerEdit> = {};
      for (const a of (d.answers || [])) {
        if (a.question_id) {
          edits[a.question_id] = { flagged: a.flagged ?? false, admin_comment: a.admin_comment ?? "" };
        }
      }
      setAnswerEdits(edits);
    }
    if (urlResult.status === "fulfilled") setPlayUrl((urlResult.value as any).url);
  }

  function editAnswer(qid: string, patch: Partial<AnswerEdit>) {
    setAnswerEdits((prev) => ({ ...prev, [qid]: { ...(prev[qid] ?? { flagged: false, admin_comment: "" }), ...patch } }));
    setDirtyQids((prev) => new Set([...prev, qid]));
    setSavedQids((prev) => { const s = new Set(prev); s.delete(qid); return s; });
  }

  async function saveAll() {
    if (!viewing?.id) return;
    setSavingAll(true);
    try {
      const qids = [...dirtyQids];
      await Promise.all(qids.map((qid) =>
        api.admin.recordings.flagAnswer(viewing.id, qid, answerEdits[qid] ?? { flagged: false, admin_comment: "" })
      ));
      setSavedQids(new Set([...savedQids, ...qids]));
      setDirtyQids(new Set());
      qc.invalidateQueries({ queryKey: ["admin-recordings"] });
    } finally {
      setSavingAll(false);
    }
  }

  function closeModal() {
    setViewing(null);
    setVideoShown(false);
    setPlayUrl(null);
  }

  const flag   = useMutation({ mutationFn: (id: string) => api.admin.recordings.flag(id),   onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-recordings"] }) });
  const unflag = useMutation({ mutationFn: (id: string) => api.admin.recordings.unflag(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-recordings"] }) });

  const filtered = (recordings as any[]).filter((r: any) => {
    if (filter === "flagged")      return r.flagged;
    if (filter === "tab_switch")   return (r.tab_switch_count ?? 0) > 0;
    if (filter === "face_anomaly") return (r.face_anomaly_count ?? 0) > 0;
    return true;
  });

  const counts = {
    flagged:      (recordings as any[]).filter((r: any) => r.flagged).length,
    tab_switch:   (recordings as any[]).filter((r: any) => (r.tab_switch_count ?? 0) > 0).length,
    face_anomaly: (recordings as any[]).filter((r: any) => (r.face_anomaly_count ?? 0) > 0).length,
  };

  const dirtyCount = dirtyQids.size;

  return (
    <div className="container adm-page">
      {/* Page header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
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
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href = url; a.download = "recordings.csv"; a.click();
            URL.revokeObjectURL(url);
          } catch (err: any) { alert(err.message || "Export failed"); }
        }}>
          <ImportIcon size={14} /> Export CSV
        </button>
      </header>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["all", "flagged", "tab_switch", "face_anomaly"] as const).map((f) => {
          const active = filter === f;
          const labels: Record<string, string> = { all: "All", flagged: `Flagged (${counts.flagged})`, tab_switch: `Tab switch (${counts.tab_switch})`, face_anomaly: `Face anomaly (${counts.face_anomaly})` };
          return (
            <button key={f} onClick={() => setFilter(f)} className="mono"
              style={{ fontSize: 11, padding: "5px 14px", borderRadius: 999, border: "1px solid var(--line)", cursor: "pointer", transition: "all 0.15s",
                background: active ? "var(--accent)" : "var(--bg-2)",
                color:      active ? "var(--accent-on)" : "var(--ink-2)",
                fontWeight: active ? 700 : 400 }}>
              {labels[f]}
            </button>
          );
        })}
      </div>

      {isLoading && <div style={{ color: "var(--ink-3)", padding: "20px 0" }}>Loading…</div>}

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-2)" }}>
              {["Learner", "Module", "Score", "Proctoring", "Date", "Status", ""].map((h) => (
                <th key={h} style={thSt}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r: any) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                <td style={tdSt}><span style={{ fontWeight: 600 }}>{r.user_name}</span></td>
                <td style={tdSt}>{r.module_title}</td>
                <td style={tdSt}>
                  <span className="serif" style={{ fontSize: 18, fontWeight: 700,
                    color: r.score_pct >= 80 ? "oklch(0.5 0.13 158)" : r.score_pct >= 50 ? "oklch(0.5 0.1 65)" : "oklch(0.5 0.1 25)" }}>
                    {r.score_pct}%
                  </span>
                </td>
                <td style={tdSt}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {(r.tab_switch_count ?? 0) > 0 && (
                      <EventBadge label={`${r.tab_switch_count} tab`} hue={50} />
                    )}
                    {(r.face_anomaly_count ?? 0) > 0 && (
                      <EventBadge label={`${r.face_anomaly_count} face`} hue={25} />
                    )}
                    {!(r.tab_switch_count) && !(r.face_anomaly_count) && (
                      <span style={{ color: "var(--ink-3)", fontSize: 12 }}>—</span>
                    )}
                  </div>
                </td>
                <td style={{ ...tdSt, color: "var(--ink-3)", fontSize: 13 }}>
                  {r.finished_at ? new Date(r.finished_at).toLocaleDateString() : "—"}
                </td>
                <td style={tdSt}>
                  {r.flagged
                    ? <StatusChip label="Flagged" hue={25} />
                    : <span className="mono" style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink-3)", border: "1px solid var(--line)" }}>Clean</span>
                  }
                </td>
                <td style={{ ...tdSt, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn ghost sm" onClick={() => openRecording(r)}>Review</button>
                    {r.flagged
                      ? <button className="btn ghost sm" style={{ gap: 4 }} onClick={() => unflag.mutate(r.id)}><CheckIcon size={11} /> Unflag</button>
                      : <button className="btn ghost sm" style={{ gap: 4 }} onClick={() => flag.mutate(r.id)}><FlagIcon size={11} /> Flag</button>
                    }
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "var(--ink-3)" }}>
                  {filter === "all" ? "No recordings yet." : `No recordings match this filter.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Review modal ── */}
      {viewing && (
        <div className="rv-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="rv-modal">

            {/* Dark header */}
            <div className="rv-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "oklch(0.55 0.02 250)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Session review
                  </span>
                  {viewing.finished_at && (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "oklch(0.45 0.02 250)" }}>
                      {new Date(viewing.finished_at).toLocaleString()}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "oklch(0.95 0.01 250)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                  {viewing.user_name}
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "oklch(0.6 0.02 250)" }}>
                  {viewing.module_title}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {/* Score ring */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1,
                    color: viewing.score_pct >= 80 ? "oklch(0.75 0.14 158)" : viewing.score_pct >= 50 ? "oklch(0.75 0.12 65)" : "oklch(0.7 0.12 25)" }}>
                    {viewing.score_pct}%
                  </div>
                  <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "oklch(0.5 0.02 250)", letterSpacing: "0.06em" }}>SCORE</div>
                </div>

                <button onClick={closeModal}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid oklch(0.3 0.01 250)", background: "oklch(0.2 0.01 250)", cursor: "pointer", display: "grid", placeItems: "center", color: "oklch(0.6 0.01 250)", flexShrink: 0, transition: "all 0.15s" }}
                  onMouseOver={(e) => { (e.currentTarget as any).style.background = "oklch(0.28 0.01 250)"; (e.currentTarget as any).style.color = "oklch(0.9 0.01 250)"; }}
                  onMouseOut={(e) => { (e.currentTarget as any).style.background = "oklch(0.2 0.01 250)"; (e.currentTarget as any).style.color = "oklch(0.6 0.01 250)"; }}>
                  <XIcon size={14} />
                </button>
              </div>
            </div>

            {/* Proctoring alert */}
            {((viewing.tab_switch_count ?? 0) > 0 || (viewing.face_anomaly_count ?? 0) > 0) && (
              <div style={{ margin: "0 20px", marginTop: 16, padding: "12px 16px", borderRadius: "var(--r-md)", background: "oklch(0.97 0.04 55)", border: "1px solid oklch(0.87 0.07 55)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>⚠</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "oklch(0.4 0.1 55)", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                    Proctoring events detected
                  </span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {(viewing.tab_switch_count ?? 0) > 0 && (
                    <span style={{ fontSize: 13, color: "oklch(0.4 0.1 55)" }}>
                      Tab switches: <strong>{viewing.tab_switch_count}</strong>
                    </span>
                  )}
                  {(viewing.face_anomaly_count ?? 0) > 0 && (
                    <span style={{ fontSize: 13, color: "oklch(0.4 0.1 55)" }}>
                      Face anomalies: <strong>{viewing.face_anomaly_count}</strong>
                    </span>
                  )}
                </div>
                {(viewing.answers ?? []).some((a: any) => a.tab_switch || a.face_anomaly) && (
                  <div style={{ marginTop: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {(viewing.answers ?? []).map((a: any, i: number) =>
                      (a.tab_switch || a.face_anomaly) ? (
                        <span key={i} className="mono" style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "oklch(0.92 0.06 55)", border: "1px solid oklch(0.83 0.08 55)", color: "oklch(0.4 0.1 55)" }}>
                          Q{i + 1}{a.tab_switch ? " tab" : ""}{a.face_anomaly ? " face" : ""}
                        </span>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Video */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-2)" }}>
              {viewing.recording_blob ? (
                !videoShown ? (
                  <button
                    onClick={() => setVideoShown(true)}
                    style={{ width: "100%", padding: "12px", borderRadius: "var(--r-md)", border: "1px dashed var(--line)", background: "var(--bg-2)", cursor: "pointer", fontSize: 13, color: "var(--ink-2)", fontFamily: "var(--font-ui)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}
                    onMouseOver={(e) => { (e.currentTarget as any).style.background = "var(--bg-3,var(--bg))"; (e.currentTarget as any).style.color = "var(--ink)"; }}
                    onMouseOut={(e) => { (e.currentTarget as any).style.background = "var(--bg-2)"; (e.currentTarget as any).style.color = "var(--ink-2)"; }}>
                    ▶ Play recording
                  </button>
                ) : playUrl ? (
                  <video controls preload="metadata" style={{ width: "100%", borderRadius: "var(--r-md)", maxHeight: 340, background: "#000" }} src={playUrl} />
                ) : (
                  <div style={{ padding: "24px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Loading recording…</div>
                )
              ) : (
                <div style={{ padding: "16px", textAlign: "center", borderRadius: "var(--r-md)", background: "var(--bg-2)", border: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 13, color: "var(--ink-3)" }}>No recording for this session</span>
                </div>
              )}
            </div>

            {/* Answers */}
            <div style={{ padding: "16px 20px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                  Answers · {(viewing.answers ?? []).length}
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {(viewing.answers ?? []).some((a: any) => a.question_id && (answerEdits[a.question_id]?.flagged ?? a.flagged)) && (
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "oklch(0.5 0.1 25)" }}>
                      {(viewing.answers ?? []).filter((a: any) => a.question_id && (answerEdits[a.question_id]?.flagged ?? a.flagged)).length} flagged
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 4 }}>
                {(viewing.answers ?? []).map((a: any, i: number) => {
                  const qid  = a.question_id as string | undefined;
                  const edit = qid ? (answerEdits[qid] ?? { flagged: a.flagged ?? false, admin_comment: a.admin_comment ?? "" }) : null;
                  const isDirty = qid ? dirtyQids.has(qid) : false;
                  const isSaved = qid ? savedQids.has(qid) : false;

                  return (
                    <div key={i} className="rv-ans-card" style={{ borderColor: edit?.flagged ? "oklch(0.82 0.07 25)" : undefined }}>
                      {/* Top row */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        {/* Correct/wrong dot */}
                        <div style={{ width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1,
                          background: a.is_correct ? "oklch(0.92 0.06 158)" : "oklch(0.94 0.05 25)",
                          color:      a.is_correct ? "oklch(0.5 0.13 158)"  : "oklch(0.5 0.1 25)" }}>
                          {a.is_correct ? <CheckIcon size={11} /> : <XIcon size={11} />}
                        </div>

                        {/* Question number + prompt */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.05em" }}>Q{i + 1}</span>
                            {a.tab_switch   && <EventBadge label="tab"  hue={50} />}
                            {a.face_anomaly && <EventBadge label="face" hue={25} />}
                            {a.time_spent_ms && (
                              <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginLeft: "auto" }}>
                                {Math.round(a.time_spent_ms / 1000)}s
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>
                            {a.question_prompt ?? `Question ${i + 1}`}
                          </p>
                          {a.selection && (
                            <p style={{ margin: "3px 0 0", fontSize: 12, color: a.is_correct ? "oklch(0.5 0.13 158)" : "oklch(0.5 0.1 25)", fontFamily: "var(--font-mono)" }}>
                              → {typeof a.selection === "object" ? JSON.stringify(a.selection) : a.selection}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Edit row (only if question has an id) */}
                      {qid && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-2)", display: "flex", gap: 8, alignItems: "center" }}>
                          {/* Flag toggle */}
                          <button
                            onClick={() => editAnswer(qid, { flagged: !edit?.flagged })}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: "var(--r-sm)", fontSize: 12, fontFamily: "var(--font-ui)", cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
                              border:      edit?.flagged ? "1px solid oklch(0.82 0.07 25)" : "1px solid var(--line)",
                              background:  edit?.flagged ? "oklch(0.95 0.05 25)" : "var(--bg-2)",
                              color:       edit?.flagged ? "oklch(0.45 0.1 25)" : "var(--ink-3)",
                              fontWeight:  edit?.flagged ? 600 : 400 }}>
                            <FlagIcon size={11} />
                            {edit?.flagged ? "Flagged" : "Flag"}
                          </button>

                          {/* Comment input */}
                          <input
                            value={edit?.admin_comment ?? ""}
                            onChange={(e) => editAnswer(qid, { admin_comment: e.target.value })}
                            placeholder="Add reviewer note…"
                            style={{ flex: 1, fontSize: 12, padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-ui)", outline: "none", minWidth: 0 }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                            onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--line)")}
                          />

                          {/* Per-row state indicator */}
                          {isSaved && !isDirty && (
                            <span style={{ fontSize: 11, color: "oklch(0.55 0.13 158)", fontWeight: 600, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                              <CheckIcon size={11} /> Saved
                            </span>
                          )}
                          {isDirty && (
                            <span style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0, fontStyle: "italic" }}>unsaved</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticky footer */}
            <div className="rv-footer">
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                {dirtyCount > 0
                  ? <><strong style={{ color: "var(--ink)" }}>{dirtyCount}</strong> unsaved change{dirtyCount !== 1 ? "s" : ""}</>
                  : savedQids.size > 0
                  ? <span style={{ color: "oklch(0.5 0.13 158)", fontWeight: 600 }}>All changes saved ✓</span>
                  : "No changes"
                }
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn ghost sm" onClick={closeModal}>Close</button>
                <button
                  className="btn accent sm"
                  disabled={dirtyCount === 0 || savingAll}
                  onClick={saveAll}
                  style={{ opacity: dirtyCount === 0 ? 0.45 : 1, minWidth: 100 }}>
                  {savingAll ? "Saving…" : dirtyCount > 0 ? `Save ${dirtyCount} change${dirtyCount !== 1 ? "s" : ""}` : "Saved ✓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .adm-page { padding-top: 28px; }

        .rv-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: oklch(0 0 0 / 0.55);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          backdrop-filter: blur(4px);
        }
        .rv-modal {
          background: var(--bg);
          border-radius: 16px;
          width: min(780px, 96vw);
          max-height: 90vh;
          display: flex; flex-direction: column;
          box-shadow: 0 24px 80px oklch(0 0 0 / 0.3), 0 4px 16px oklch(0 0 0 / 0.15);
          overflow: hidden;
        }
        .rv-head {
          display: flex; align-items: flex-start; gap: 16;
          padding: 22px 20px 20px;
          background: oklch(0.14 0.01 250);
          border-bottom: 1px solid oklch(0.22 0.01 250);
          flex-shrink: 0;
        }
        .rv-modal > *:not(.rv-head):not(.rv-footer) {
          overflow-y: auto;
        }
        .rv-footer {
          padding: 14px 20px;
          border-top: 1px solid var(--line);
          background: var(--bg-2);
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .rv-ans-card {
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--line-2);
          background: var(--bg-2);
          transition: border-color 0.15s;
        }
        .rv-ans-card:hover {
          border-color: var(--line);
        }
      `}</style>
    </div>
  );
}

function EventBadge({ label, hue }: { label: string; hue: number }) {
  return (
    <span className="mono" style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999,
      background: `oklch(0.95 0.04 ${hue})`, color: `oklch(0.45 0.1 ${hue})`, border: `1px solid oklch(0.87 0.06 ${hue})` }}>
      {label}
    </span>
  );
}

function StatusChip({ label, hue }: { label: string; hue: number }) {
  return (
    <span className="mono" style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999,
      background: `oklch(0.95 0.05 ${hue})`, color: `oklch(0.45 0.1 ${hue})`, border: `1px solid oklch(0.85 0.06 ${hue})` }}>
      {label}
    </span>
  );
}

const thSt: React.CSSProperties = { padding: "11px 16px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600 };
const tdSt: React.CSSProperties = { padding: "14px 16px", verticalAlign: "middle", fontSize: 14 };
