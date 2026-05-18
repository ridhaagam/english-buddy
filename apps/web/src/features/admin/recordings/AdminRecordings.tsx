import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlagIcon, CheckIcon, XIcon, ImportIcon, PlayIcon } from "../../../components/ui";
import { api } from "../../../lib/api";

type AnswerEdit = { flagged: boolean; admin_comment: string };

export function AdminResults() {
  const qc = useQueryClient();
  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ["admin-recordings"],
    queryFn: () => api.admin.recordings.list(),
  });

  const [filter,      setFilter]      = useState<"all" | "flagged" | "tab_switch" | "face_anomaly">("all");
  const [viewing,     setViewing]     = useState<any>(null);
  const [playUrl,     setPlayUrl]     = useState<string | null>(null);
  const [videoShown,  setVideoShown]  = useState(false);
  const [answerEdits, setAnswerEdits] = useState<Record<string, AnswerEdit>>({});
  const [dirtyQids,   setDirtyQids]   = useState<Set<string>>(new Set());
  const [hasSaved,    setHasSaved]    = useState(false);
  const [savingAll,   setSavingAll]   = useState(false);
  const [warnDiscard, setWarnDiscard] = useState(false);

  async function openResult(r: any) {
    setViewing(r);
    setPlayUrl(null);
    setVideoShown(false);
    setAnswerEdits({});
    setDirtyQids(new Set());
    setHasSaved(false);
    setWarnDiscard(false);

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
    setWarnDiscard(false);
  }

  async function saveAll() {
    if (!viewing?.id) return;
    setSavingAll(true);
    try {
      const qids = [...dirtyQids];
      await Promise.all(qids.map((qid) =>
        api.admin.recordings.flagAnswer(viewing.id, qid, answerEdits[qid] ?? { flagged: false, admin_comment: "" })
      ));
      setHasSaved(true);
      setDirtyQids(new Set());
      qc.invalidateQueries({ queryKey: ["admin-recordings"] });
    } finally {
      setSavingAll(false);
    }
  }

  function requestClose() {
    if (dirtyQids.size > 0) {
      setWarnDiscard(true);
    } else {
      doClose();
    }
  }

  function doClose() {
    setViewing(null);
    setVideoShown(false);
    setPlayUrl(null);
    setWarnDiscard(false);
  }

  const flag   = useMutation({ mutationFn: (id: string) => api.admin.recordings.flag(id),   onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-recordings"] }) });
  const unflag = useMutation({ mutationFn: (id: string) => api.admin.recordings.unflag(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-recordings"] }) });

  const recs = recordings as any[];
  const filtered = recs.filter((r) => {
    if (filter === "flagged")      return r.flagged;
    if (filter === "tab_switch")   return (r.tab_switch_count ?? 0) > 0;
    if (filter === "face_anomaly") return (r.face_anomaly_count ?? 0) > 0;
    return true;
  });

  const counts = {
    total:        recs.length,
    flagged:      recs.filter((r) => r.flagged).length,
    tab_switch:   recs.filter((r) => (r.tab_switch_count ?? 0) > 0).length,
    face_anomaly: recs.filter((r) => (r.face_anomaly_count ?? 0) > 0).length,
  };

  const dirtyCount = dirtyQids.size;

  return (
    <div className="container res-page">

      {/* ── Page header ── */}
      <header className="res-page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="serif" style={{ fontSize: 36, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Results</h1>
          <p style={{ color: "var(--ink-2)", margin: 0 }}>Review session results and flag integrity issues.</p>
        </div>
        <button className="btn ghost" style={{ gap: 6, flexShrink: 0 }} onClick={async () => {
          try {
            const token = localStorage.getItem("access_token");
            const res = await fetch("/api/v1/admin/recordings/export/csv", {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error(`Export failed: ${res.status}`);
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href = url; a.download = "results.csv"; a.click();
            URL.revokeObjectURL(url);
          } catch (err: any) { alert(err.message || "Export failed"); }
        }}>
          <ImportIcon size={14} /> Export CSV
        </button>
      </header>

      {/* ── Stats strip ── */}
      <div className="res-stats-strip">
        <StatPill label="Total" value={counts.total} />
        {counts.flagged    > 0 && <StatPill label="Flagged"    value={counts.flagged}      hue={25} />}
        {counts.tab_switch > 0 && <StatPill label="Tab issues" value={counts.tab_switch}   hue={50} />}
        {counts.face_anomaly > 0 && <StatPill label="Face"     value={counts.face_anomaly} hue={25} />}
      </div>

      {/* ── Filter tabs ── */}
      <div className="res-filter-bar">
        {(["all", "flagged", "tab_switch", "face_anomaly"] as const).map((f) => {
          const active = filter === f;
          const label: Record<string, string> = { all: "All results", flagged: "Flagged", tab_switch: "Tab switch", face_anomaly: "Face anomaly" };
          const count = f === "all" ? counts.total : counts[f as keyof typeof counts];
          return (
            <button key={f} className={`res-tab${active ? " active" : ""}`} onClick={() => setFilter(f)}>
              {label[f]}
              {count > 0 && <span className="res-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {isLoading && <div style={{ color: "var(--ink-3)", padding: "20px 0" }}>Loading…</div>}

      {/* ── Results table ── */}
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-2)" }}>
              {["Learner", "Module", "Score", "Proctoring", "Date", "Status", ""].map((h) => (
                <th key={h} style={thSt}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r: any) => (
              <tr key={r.id}
                className={`res-row${viewing?.id === r.id ? " active" : ""}`}
                onClick={() => openResult(r)}
                style={{ borderBottom: "1px solid var(--line-2)", cursor: "pointer" }}>
                <td data-label="Learner" style={tdSt}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Initials name={r.user_name} />
                    <span style={{ fontWeight: 600 }}>{r.user_name}</span>
                  </div>
                </td>
                <td data-label="Module" style={{ ...tdSt, color: "var(--ink-2)", maxWidth: 200 }}>{r.module_title}</td>
                <td data-label="Score" style={tdSt}>
                  <span className="res-score-num" style={{
                    color: r.score_pct >= 80 ? "oklch(0.48 0.13 158)" : r.score_pct >= 50 ? "oklch(0.5 0.1 65)" : "oklch(0.5 0.1 25)"
                  }}>
                    {r.score_pct}%
                  </span>
                </td>
                <td data-label="Proctoring" style={tdSt}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {(r.tab_switch_count ?? 0) > 0 && <EventBadge label={`${r.tab_switch_count} tab`} hue={50} />}
                    {(r.face_anomaly_count ?? 0) > 0 && <EventBadge label={`${r.face_anomaly_count} face`} hue={25} />}
                    {!(r.tab_switch_count) && !(r.face_anomaly_count) && (
                      <span style={{ color: "var(--ink-3)", fontSize: 12 }}>—</span>
                    )}
                  </div>
                </td>
                <td data-label="Date" style={{ ...tdSt, color: "var(--ink-3)", fontSize: 13 }}>
                  {r.finished_at ? new Date(r.finished_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </td>
                <td data-label="Status" style={tdSt}>
                  {r.flagged
                    ? <span className="res-chip flagged">⚑ Flagged</span>
                    : <span className="res-chip clean">✓ Clean</span>
                  }
                </td>
                <td style={{ ...tdSt, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  {r.flagged
                    ? <button className="btn ghost sm" style={{ gap: 4 }} onClick={() => unflag.mutate(r.id)}><CheckIcon size={11} /> Unflag</button>
                    : <button className="btn ghost sm" style={{ gap: 4 }} onClick={() => flag.mutate(r.id)}><FlagIcon size={11} /> Flag</button>
                  }
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} style={{ padding: "52px 16px", textAlign: "center", color: "var(--ink-3)" }}>
                  {filter === "all" ? "No results yet." : "No results match this filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile backdrop ── */}
      {viewing && <div className="res-backdrop" onClick={requestClose} />}

      {/* ── Review drawer (slides in from the right) ── */}
      <div className={`res-drawer${viewing ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Session review">
        {viewing && (
          <>
            {/* Discard-warning inline banner (replaces window.confirm) */}
            {warnDiscard && (
              <div className="res-discard-warn">
                <span><strong>{dirtyCount}</strong> unsaved change{dirtyCount !== 1 ? "s" : ""} — discard them?</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="res-warn-keep" onClick={() => setWarnDiscard(false)}>Keep editing</button>
                  <button className="res-warn-discard" onClick={doClose}>Discard</button>
                </div>
              </div>
            )}

            {/* Dark header — single X button to close */}
            <div className="res-drawer-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="res-drawer-eyebrow">
                  Session review
                  {viewing.finished_at && (
                    <> · {new Date(viewing.finished_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</>
                  )}
                </div>
                <h3 className="res-drawer-name">{viewing.user_name}</h3>
                <p className="res-drawer-module">{viewing.module_title}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                {/* The ONE close affordance */}
                <button className="res-close-btn" onClick={requestClose} aria-label="Close panel">
                  <XIcon size={14} />
                </button>
                <div style={{ textAlign: "right" }}>
                  <div className="res-score-big" style={{
                    color: viewing.score_pct >= 80 ? "oklch(0.76 0.15 158)" : viewing.score_pct >= 50 ? "oklch(0.78 0.13 65)" : "oklch(0.72 0.14 25)"
                  }}>
                    {viewing.score_pct}%
                  </div>
                  <div className="res-score-label">SCORE</div>
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="res-drawer-body">

              {/* Proctoring alert */}
              {((viewing.tab_switch_count ?? 0) > 0 || (viewing.face_anomaly_count ?? 0) > 0) && (
                <div className="res-proctor-alert">
                  <div className="res-proctor-title">⚠ Proctoring events detected</div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 6 }}>
                    {(viewing.tab_switch_count ?? 0) > 0 && (
                      <span className="res-proctor-stat">Tab switches <strong>{viewing.tab_switch_count}</strong></span>
                    )}
                    {(viewing.face_anomaly_count ?? 0) > 0 && (
                      <span className="res-proctor-stat">Face anomalies <strong>{viewing.face_anomaly_count}</strong></span>
                    )}
                  </div>
                  {(viewing.answers ?? []).some((a: any) => a.tab_switch || a.face_anomaly) && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                      {(viewing.answers ?? []).map((a: any, i: number) =>
                        (a.tab_switch || a.face_anomaly) ? (
                          <span key={i} className="res-q-event-chip">
                            Q{i + 1}{a.tab_switch ? " tab" : ""}{a.face_anomaly ? " face" : ""}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Video player */}
              <div className="res-video-section">
                {viewing.recording_blob ? (
                  !videoShown ? (
                    <button className="res-play-btn" onClick={() => setVideoShown(true)}>
                      <PlayIcon size={14} /> Play recording
                    </button>
                  ) : playUrl ? (
                    <video controls preload="metadata" src={playUrl}
                      style={{ width: "100%", borderRadius: 10, aspectRatio: "4/3", background: "#000", display: "block" }} />
                  ) : (
                    <div style={{ padding: "24px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Loading recording…</div>
                  )
                ) : (
                  <p className="res-no-video">No recording for this session</p>
                )}
              </div>

              {/* Answers list */}
              <div className="res-answers-section">
                <div className="res-answers-hd">
                  <span>Answers</span>
                  <span className="res-answers-count">{(viewing.answers ?? []).length}</span>
                  {(viewing.answers ?? []).some((a: any) => a.question_id && (answerEdits[a.question_id]?.flagged ?? a.flagged)) && (
                    <span className="res-answers-flagged">
                      {(viewing.answers ?? []).filter((a: any) => a.question_id && (answerEdits[a.question_id]?.flagged ?? a.flagged)).length} flagged
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(viewing.answers ?? []).map((a: any, i: number) => {
                    const qid  = a.question_id as string | undefined;
                    const edit = qid ? (answerEdits[qid] ?? { flagged: a.flagged ?? false, admin_comment: a.admin_comment ?? "" }) : null;
                    const isDirty = qid ? dirtyQids.has(qid) : false;
                    const isSaved = hasSaved && !isDirty;

                    return (
                      <div key={i} className={`res-ans-card${edit?.flagged ? " flagged" : ""}`}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div className={`res-ans-dot${a.is_correct ? " ok" : " err"}`}>
                            {a.is_correct ? <CheckIcon size={10} /> : <XIcon size={10} />}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="res-ans-meta">
                              <span className="res-q-num">Q{i + 1}</span>
                              {a.tab_switch   && <EventBadge label="tab"  hue={50} />}
                              {a.face_anomaly && <EventBadge label="face" hue={25} />}
                              {a.time_spent_ms != null && (
                                <span className="res-ans-time">{(a.time_spent_ms / 1000).toFixed(1)}s</span>
                              )}
                            </div>
                            <p className="res-ans-prompt">{a.question_prompt ?? `Question ${i + 1}`}</p>
                            {(a.question_kind === "choice" || a.question_kind === "fill") && (a.payload?.choices ?? []).length > 0 ? (
                              <AdminChoiceBreakdown
                                choices={a.payload.choices}
                                selection={a.selection?.choice}
                                correctAnswer={a.payload?.answer}
                                isCorrect={a.is_correct}
                              />
                            ) : a.selection && (
                              <p className={`res-ans-sel${a.is_correct ? " ok" : " err"}`}>
                                → {typeof a.selection === "object" ? JSON.stringify(a.selection) : a.selection}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Inline flag + comment */}
                        {qid && (
                          <div className="res-ans-edit">
                            <button
                              className={`res-flag-btn${edit?.flagged ? " on" : ""}`}
                              onClick={() => editAnswer(qid, { flagged: !edit?.flagged })}>
                              <FlagIcon size={11} />
                              {edit?.flagged ? "Flagged" : "Flag"}
                            </button>

                            <input
                              className="res-comment-input"
                              value={edit?.admin_comment ?? ""}
                              onChange={(e) => editAnswer(qid, { admin_comment: e.target.value })}
                              placeholder="Add reviewer note…"
                            />

                            {isSaved && !isDirty && <span className="res-saved-pill">✓</span>}
                            {isDirty && <span className="res-dirty-dot" title="Unsaved" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sticky footer — save state + save button only. No close button here. */}
            <div className="res-drawer-foot">
              <span className="res-foot-status">
                {dirtyCount > 0
                  ? <><strong>{dirtyCount}</strong> unsaved</>
                  : hasSaved
                  ? <span style={{ color: "oklch(0.5 0.13 158)" }}>All saved ✓</span>
                  : <span style={{ opacity: 0.5 }}>No changes</span>
                }
              </span>
              <button
                className="btn accent sm"
                disabled={dirtyCount === 0 || savingAll}
                onClick={saveAll}
                style={{ minWidth: 130, opacity: dirtyCount === 0 ? 0.38 : 1 }}>
                {savingAll ? "Saving…" : dirtyCount > 0 ? `Save ${dirtyCount} change${dirtyCount !== 1 ? "s" : ""}` : "Saved ✓"}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        .res-page { padding-top: 28px; }
        .res-page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }

        /* Stats strip */
        .res-stats-strip { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
        .res-stat-pill { display: inline-flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: var(--r-md); background: var(--surface); border: 1px solid var(--line); box-shadow: var(--shadow-sm); }
        .res-stat-val { font-size: 22px; font-weight: 800; letter-spacing: -0.04em; font-family: var(--font-display); line-height: 1; color: var(--ink); }
        .res-stat-label { font-size: 11px; color: var(--ink-3); font-family: var(--font-mono); letter-spacing: 0.06em; text-transform: uppercase; }
        .res-stat-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        /* Filter tab bar */
        .res-filter-bar { display: flex; gap: 0; border-bottom: 1px solid var(--line); margin-bottom: 20px; overflow-x: auto; }
        .res-tab { padding: 9px 16px; font-size: 13px; font-weight: 500; border: none; background: none; cursor: pointer; color: var(--ink-3); border-bottom: 2px solid transparent; margin-bottom: -1px; display: flex; align-items: center; gap: 6px; transition: color 0.15s, border-color 0.15s; font-family: var(--font-ui); white-space: nowrap; flex-shrink: 0; }
        .res-tab:hover { color: var(--ink); }
        .res-tab.active { color: var(--ink); border-bottom-color: var(--accent); font-weight: 600; }
        .res-tab-count { font-size: 10px; padding: 1px 7px; border-radius: 999px; background: var(--bg-2); color: var(--ink-3); font-family: var(--font-mono); transition: all 0.15s; }
        .res-tab.active .res-tab-count { background: var(--accent-soft); color: var(--accent-ink); }

        /* Table */
        .res-row { transition: background 0.1s; }
        .res-row:hover { background: var(--bg-2); }
        .res-row.active { background: oklch(0.97 0.03 158); }
        .res-initials { width: 30px; height: 30px; border-radius: 50%; background: oklch(0.92 0.04 220); color: oklch(0.38 0.1 220); display: grid; place-items: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .res-score-num { font-size: 17px; font-weight: 800; letter-spacing: -0.03em; font-family: var(--font-display); }
        .res-chip { font-family: var(--font-mono); font-size: 11px; padding: 3px 9px; border-radius: 999px; font-weight: 600; white-space: nowrap; }
        .res-chip.flagged { background: oklch(0.95 0.05 25); color: oklch(0.42 0.1 25); border: 1px solid oklch(0.85 0.06 25); }
        .res-chip.clean { background: var(--bg-2); color: var(--ink-3); border: 1px solid var(--line); }

        /* Mobile backdrop */
        .res-backdrop { position: fixed; inset: 0; z-index: 299; background: oklch(0 0 0 / 0.45); backdrop-filter: blur(3px); }
        @media (min-width: 861px) { .res-backdrop { display: none; } }

        /* ── Drawer ── */
        .res-drawer {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(680px, 46vw);
          background: var(--bg);
          display: flex; flex-direction: column;
          box-shadow: -6px 0 40px oklch(0 0 0 / 0.10), -1px 0 0 var(--line);
          transform: translateX(102%);
          transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
          z-index: 300;
          overflow: hidden;
        }
        .res-drawer.open { transform: translateX(0); }

        /* Discard-warning banner */
        .res-discard-warn {
          display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
          padding: 11px 18px;
          background: oklch(0.95 0.06 25);
          border-bottom: 1px solid oklch(0.87 0.07 25);
          font-size: 13px; color: oklch(0.4 0.1 25);
          flex-shrink: 0;
          animation: warnIn 0.2s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes warnIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        .res-warn-keep { padding: 6px 12px; border-radius: var(--r-sm); border: 1px solid oklch(0.82 0.07 25); background: none; color: oklch(0.4 0.1 25); cursor: pointer; font-size: 12px; font-weight: 600; font-family: var(--font-ui); transition: background 0.15s; }
        .res-warn-keep:hover { background: oklch(0.9 0.05 25); }
        .res-warn-discard { padding: 6px 12px; border-radius: var(--r-sm); border: none; background: oklch(0.52 0.12 25); color: white; cursor: pointer; font-size: 12px; font-weight: 600; font-family: var(--font-ui); transition: background 0.15s; }
        .res-warn-discard:hover { background: oklch(0.45 0.12 25); }

        /* Drawer header */
        .res-drawer-head {
          display: flex; align-items: flex-start; gap: 16px;
          padding: 20px 20px 18px;
          background: oklch(0.13 0.015 250);
          border-bottom: 1px solid oklch(0.21 0.01 250);
          flex-shrink: 0;
        }
        .res-drawer-eyebrow { font-size: 10px; font-family: var(--font-mono); color: oklch(0.44 0.02 250); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }
        .res-drawer-name { margin: 0; font-size: 19px; font-weight: 700; color: oklch(0.95 0.01 250); letter-spacing: -0.02em; line-height: 1.25; font-family: var(--font-display); }
        .res-drawer-module { margin: 4px 0 0; font-size: 13px; color: oklch(0.54 0.02 250); }
        .res-close-btn { width: 30px; height: 30px; border-radius: 50%; background: oklch(0.2 0.01 250); border: 1px solid oklch(0.28 0.01 250); cursor: pointer; display: grid; place-items: center; color: oklch(0.52 0.02 250); transition: all 0.15s; flex-shrink: 0; }
        .res-close-btn:hover { background: oklch(0.28 0.01 250); color: oklch(0.92 0.01 250); border-color: oklch(0.38 0.01 250); }
        .res-score-big { font-size: 27px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; font-family: var(--font-display); }
        .res-score-label { font-size: 9px; font-family: var(--font-mono); color: oklch(0.43 0.02 250); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 3px; }

        /* Scrollable body */
        .res-drawer-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }

        /* Proctoring alert */
        .res-proctor-alert { margin: 14px 18px 0; padding: 13px 15px; border-radius: var(--r-md); background: oklch(0.97 0.04 58); border: 1px solid oklch(0.87 0.07 58); }
        .res-proctor-title { font-size: 11px; font-weight: 700; color: oklch(0.42 0.1 58); letter-spacing: 0.05em; text-transform: uppercase; font-family: var(--font-mono); }
        .res-proctor-stat { font-size: 13px; color: oklch(0.42 0.1 58); }
        .res-q-event-chip { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 999px; background: oklch(0.92 0.06 58); border: 1px solid oklch(0.82 0.08 58); color: oklch(0.4 0.1 58); }

        /* Video */
        .res-video-section { padding: 14px 18px; border-bottom: 1px solid var(--line-2); }
        .res-play-btn { width: 100%; padding: 11px 20px; border-radius: var(--r-md); border: 1.5px dashed var(--line); background: var(--bg-2); cursor: pointer; font-size: 13px; color: var(--ink-2); font-family: var(--font-ui); display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s; }
        .res-play-btn:hover { background: var(--bg); color: var(--ink); border-color: var(--accent); }
        .res-no-video { font-size: 13px; color: var(--ink-3); text-align: center; margin: 0; padding: 14px; background: var(--bg-2); border-radius: var(--r-md); border: 1px solid var(--line); }

        /* Answers section */
        .res-answers-section { padding: 14px 18px 20px; }
        .res-answers-hd { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 11px; font-family: var(--font-mono); letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
        .res-answers-count { background: var(--bg-2); border: 1px solid var(--line); border-radius: 999px; padding: 1px 7px; font-size: 10px; color: var(--ink-3); }
        .res-answers-flagged { color: oklch(0.45 0.1 25); margin-left: auto; font-size: 10px; }

        /* Answer card */
        .res-ans-card { padding: 13px 14px; border-radius: 10px; border: 1.5px solid var(--line-2); background: var(--surface); transition: border-color 0.15s; }
        .res-ans-card:hover { border-color: var(--line); }
        .res-ans-card.flagged { border-color: oklch(0.82 0.07 25); background: oklch(0.993 0.008 25); }
        .res-ans-dot { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; margin-top: 2px; }
        .res-ans-dot.ok { background: oklch(0.92 0.06 158); color: oklch(0.5 0.13 158); }
        .res-ans-dot.err { background: oklch(0.94 0.05 25); color: oklch(0.5 0.1 25); }
        .res-ans-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
        .res-q-num { font-family: var(--font-mono); font-size: 10px; color: var(--ink-3); letter-spacing: 0.05em; font-weight: 600; }
        .res-ans-time { font-family: var(--font-mono); font-size: 10px; color: var(--ink-3); margin-left: auto; }
        .res-ans-prompt { margin: 0; font-size: 13px; color: var(--ink); line-height: 1.45; }
        .res-ans-sel { margin: 4px 0 0; font-size: 12px; font-family: var(--font-mono); }
        .res-ans-sel.ok { color: oklch(0.5 0.13 158); }
        .res-ans-sel.err { color: oklch(0.5 0.1 25); }

        /* Flag + comment edit bar */
        .res-ans-edit { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line-2); display: flex; gap: 8px; align-items: center; }
        .res-flag-btn { display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: var(--r-sm); font-size: 12px; font-family: var(--font-ui); cursor: pointer; flex-shrink: 0; transition: all 0.15s; border: 1px solid var(--line); background: var(--bg-2); color: var(--ink-3); font-weight: 400; }
        .res-flag-btn.on { border-color: oklch(0.82 0.07 25); background: oklch(0.95 0.05 25); color: oklch(0.42 0.1 25); font-weight: 600; }
        .res-comment-input { flex: 1; font-size: 12px; padding: 6px 10px; border-radius: var(--r-sm); border: 1px solid var(--line); background: var(--bg); color: var(--ink); font-family: var(--font-ui); outline: none; min-width: 0; transition: border-color 0.15s; }
        .res-comment-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
        .res-saved-pill { font-size: 11px; color: oklch(0.52 0.13 158); font-weight: 700; flex-shrink: 0; }
        .res-dirty-dot { width: 7px; height: 7px; border-radius: 50%; background: oklch(0.62 0.14 25); flex-shrink: 0; }

        /* Footer — NO close button, save only */
        .res-drawer-foot { padding: 13px 18px; border-top: 1px solid var(--line); background: var(--bg-2); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; gap: 12px; }
        .res-foot-status { font-size: 13px; color: var(--ink-3); }

        /* Responsive */
        @media (max-width: 860px) {
          .res-drawer { width: min(520px, 92vw); }
        }
        @media (max-width: 600px) {
          .res-drawer { width: 100%; box-shadow: none; border-left: none; }
          .res-stats-strip { display: grid; grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatPill({ label, value, hue }: { label: string; value: number; hue?: number }) {
  return (
    <div className="res-stat-pill">
      {hue != null && (
        <div className="res-stat-dot" style={{ background: `oklch(0.65 0.12 ${hue})` }} />
      )}
      <div>
        <div className="res-stat-val">{value}</div>
        <div className="res-stat-label">{label}</div>
      </div>
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const letter = (name || "?")[0].toUpperCase();
  return <div className="res-initials">{letter}</div>;
}

function EventBadge({ label, hue }: { label: string; hue: number }) {
  return (
    <span className="mono" style={{
      fontSize: 10, padding: "1px 7px", borderRadius: 999,
      background: `oklch(0.95 0.04 ${hue})`,
      color:      `oklch(0.45 0.1 ${hue})`,
      border:     `1px solid oklch(0.87 0.06 ${hue})`,
    }}>
      {label}
    </span>
  );
}

function AdminChoiceBreakdown({ choices, selection, correctAnswer, isCorrect }: {
  choices: any[];
  selection: string | undefined;
  correctAnswer: string | undefined;
  isCorrect: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
      {choices.map((c: any, i: number) => {
        const isSelected = c.id === selection;
        const isRight = c.id === correctAnswer;
        const isWrong = isSelected && !isRight;

        const bg = isRight ? "oklch(0.92 0.06 158)" : isWrong ? "oklch(0.94 0.05 25)" : "var(--bg)";
        const border = isRight ? "oklch(0.78 0.1 158)" : isWrong ? "oklch(0.82 0.07 25)" : "var(--line-2)";
        const color = isRight ? "oklch(0.38 0.13 158)" : isWrong ? "oklch(0.45 0.1 25)" : "var(--ink-2)";
        const letter = String.fromCharCode(65 + i);

        return (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", borderRadius: 6, border: `1px solid ${border}`, background: bg, fontSize: 12 }}>
            <span style={{ fontSize: 9, color: "var(--ink-3)", flexShrink: 0, minWidth: 12, fontFamily: "var(--font-mono)" }}>{letter}.</span>
            <span style={{ flex: 1, color }}>{c.label}</span>
            {isSelected && isRight  && <CheckIcon size={11} />}
            {isSelected && !isRight && <XIcon size={11} />}
          </div>
        );
      })}
    </div>
  );
}

const thSt: React.CSSProperties = { padding: "11px 16px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600 };
const tdSt: React.CSSProperties = { padding: "14px 16px", verticalAlign: "middle", fontSize: 14 };
