import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlayIcon, FlagIcon, CheckIcon, XIcon, ImportIcon } from "../../../components/ui";
import { api } from "../../../lib/api";

export function AdminRecordings() {
  const qc = useQueryClient();
  const { data: recordings = [], isLoading } = useQuery({ queryKey: ["admin-recordings"], queryFn: () => api.admin.recordings.list() });
  const [viewing, setViewing] = useState<any>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);

  async function openRecording(r: any) {
    setViewing(r);
    setPlayUrl(null);
    // Fetch full detail (with answers) and play URL in parallel
    const [detail, urlResult] = await Promise.allSettled([
      api.admin.recordings.get(r.id),
      r.recording_blob ? api.admin.recordings.playUrl(r.id) : Promise.reject("no blob"),
    ]);
    if (detail.status === "fulfilled") setViewing(detail.value);
    if (urlResult.status === "fulfilled") setPlayUrl((urlResult.value as any).url);
  }

  const flag = useMutation({
    mutationFn: (id: string) => api.admin.recordings.flag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-recordings"] }),
  });
  const unflag = useMutation({
    mutationFn: (id: string) => api.admin.recordings.unflag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-recordings"] }),
  });

  return (
    <div className="container adm-page">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
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

      {isLoading && <div style={{ color: "var(--ink-3)" }}>Loading…</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["Learner", "Module", "Score", "Date", "Status", ""].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(recordings as any[]).map((r: any) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                <td style={tdStyle}><span style={{ fontWeight: 600 }}>{r.user_name}</span></td>
                <td style={tdStyle}>{r.module_title}</td>
                <td style={tdStyle}><span className="serif" style={{ fontSize: 17 }}>{r.score_pct}%</span></td>
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
                    {r.recording_blob && (
                      <button className="btn ghost sm" style={{ gap: 6 }} onClick={() => openRecording(r)}>
                        <PlayIcon size={12} /> Watch
                      </button>
                    )}
                    {r.flagged
                      ? <button className="btn ghost sm" onClick={() => unflag.mutate(r.id)}><CheckIcon size={12} /> Unflag</button>
                      : <button className="btn ghost sm" onClick={() => flag.mutate(r.id)}><FlagIcon size={12} /> Flag</button>
                    }
                  </div>
                </td>
              </tr>
            ))}
            {recordings.length === 0 && !isLoading && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--ink-3)" }}>No recordings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="rec-modal-overlay" onClick={(e) => e.target === e.currentTarget && setViewing(null)}>
          <div className="rec-modal fade-up">
            <div className="rec-modal-head">
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>Session recording</p>
                <h3 className="serif" style={{ margin: "4px 0 0", fontSize: 20 }}>{viewing.user_name} · {viewing.module_title}</h3>
              </div>
              <button className="icon-btn" onClick={() => setViewing(null)}><XIcon size={16} /></button>
            </div>
            <div className="rec-player">
              {playUrl ? (
                <video controls style={{ width: "100%", borderRadius: "var(--r-md)" }} src={playUrl} />
              ) : viewing.recording_blob && !playUrl ? (
                <div style={{ padding: "48px 0", textAlign: "center", color: "var(--ink-3)" }}>
                  <p className="serif" style={{ fontSize: 18 }}>Loading video…</p>
                </div>
              ) : (
                <div style={{ padding: "48px 0", textAlign: "center", color: "var(--ink-3)" }}>
                  <p className="serif" style={{ fontSize: 18 }}>No recording available</p>
                </div>
              )}
            </div>
            <div className="rec-answers">
              <p className="eyebrow" style={{ marginBottom: 10 }}>Answers ({(viewing.answers || []).length})</p>
              {(viewing.answers || []).map((a: any, i: number) => (
                <div key={i} className="rec-ans-row">
                  <div className={`ans-icon ${a.is_correct ? "correct" : "wrong"}`}>
                    {a.is_correct ? <CheckIcon size={11} /> : <XIcon size={11} />}
                  </div>
                  <span style={{ flex: 1, fontSize: 13 }}>{a.question_prompt || `Question ${i + 1}`}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {a.time_spent_ms ? `${Math.round(a.time_spent_ms / 1000)}s` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .adm-page { padding-top: 28px; }
        .rec-modal-overlay { position:fixed; inset:0; background:oklch(0 0 0/0.5); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; }
        .rec-modal { background:var(--bg); border-radius:var(--r-xl); width:min(660px,96vw); max-height:90vh; overflow-y:auto; box-shadow:var(--shadow-lg); }
        .rec-modal-head { display:flex; justify-content:space-between; align-items:flex-start; padding:22px 24px 16px; border-bottom:1px solid var(--line); }
        .rec-player { padding:18px 24px; }
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
