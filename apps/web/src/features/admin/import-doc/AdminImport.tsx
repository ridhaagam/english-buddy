import { useState, useRef } from "react";
import { ArrowRightIcon, ImportIcon, CheckIcon } from "../../../components/ui";
import { api } from "../../../lib/api";

export function AdminImport() {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [moduleId, setModuleId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(f: File) { setFile(f); setError(""); }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.admin.import.document(file);
      setPreview({
        title: data.title,
        cefr_level: data.cefr_level || "B1",
        word_count: data.word_count,
        questions: data.questions,
      });
      setStep("preview");
    } catch (e: any) {
      setError(e.message || "Failed to analyse document");
    } finally {
      setLoading(false);
    }
  }

  async function importModule() {
    if (!preview) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.admin.import.finalizeDocument({
        title: preview.title,
        cefr_level: preview.cefr_level,
        questions: preview.questions,
      });
      setModuleId(result.module_id);
      setStep("done");
    } catch (e: any) {
      setError(e.message || "Failed to import module");
    } finally {
      setLoading(false);
    }
  }

  function reset() { setStep("upload"); setFile(null); setPreview(null); setError(""); setModuleId(""); }

  return (
    <div className="container adm-page">
      <header style={{ marginBottom: 24 }}>
        <p className="eyebrow">Admin</p>
        <h1 className="serif" style={{ fontSize: 36, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Import document</h1>
        <p style={{ color: "var(--ink-2)", margin: 0 }}>Upload a PDF or Word file to auto-generate a practice module.</p>
      </header>

      <div className="steps-bar">
        {["Upload", "Preview", "Done"].map((s, i) => {
          const idx = ["upload", "preview", "done"].indexOf(step);
          return (
            <div key={s} className={`step${i <= idx ? " done" : ""}`}>
              <div className="step-dot">{i < idx ? <CheckIcon size={10} /> : i + 1}</div>
              <span>{s}</span>
              {i < 2 && <div className="step-line" />}
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "var(--rose-soft)", border: "1px solid color-mix(in oklch, var(--rose), white 60%)", borderRadius: "var(--r-md)", marginBottom: 16, fontSize: 14, color: "var(--rose)" }}>
          {error}
        </div>
      )}

      {step === "upload" && (
        <div className="card imp-card fade-up">
          <div
            className={`drop-zone${dragging ? " drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}>
            <ImportIcon size={32} />
            <p className="serif" style={{ margin: "14px 0 6px", fontSize: 20 }}>Drop a PDF or Word file</p>
            <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13 }}>or click to browse — max 20 MB</p>
            {file && <p className="mono" style={{ margin: "12px 0 0", fontSize: 12, color: "var(--accent-ink)" }}>Selected: {file.name}</p>}
            <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16 }}>
            <button className="btn accent lg" disabled={!file || loading} onClick={analyze}>
              {loading ? "Analysing…" : "Analyse document"} <ArrowRightIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="card imp-card fade-up">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div className="field">
              <label>Module title</label>
              <input defaultValue={preview.title} onChange={(e) => setPreview((p: any) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="field">
              <label>CEFR level</label>
              <select value={preview.cefr_level} onChange={(e) => setPreview((p: any) => ({ ...p, cefr_level: e.target.value }))}>
                {["A1","A2","B1","B2","C1","C2"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Words extracted</label>
              <input readOnly value={`${preview.word_count ?? "—"} words`} style={{ color: "var(--ink-3)" }} />
            </div>
          </div>

          <p className="eyebrow" style={{ marginBottom: 10 }}>Generated questions ({preview.questions.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 400, overflowY: "auto" }}>
            {preview.questions.map((q: any, i: number) => (
              <div key={i} className="prev-q">
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span className="mono" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-ink)", border: "1px solid var(--accent)", flexShrink: 0 }}>{q.kind}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{q.prompt}</span>
                </div>
                {q.kind === "choice" && q.payload?.choices && (
                  <div style={{ paddingLeft: 8, marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {q.payload.choices.map((c: any) => (
                      <span key={c.id} className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: c.id === q.payload.answer ? "var(--accent-soft)" : "var(--bg-2)", color: c.id === q.payload.answer ? "var(--accent-ink)" : "var(--ink-3)", border: `1px solid ${c.id === q.payload.answer ? "var(--accent)" : "var(--line)"}` }}>{c.label}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 20 }}>
            <button className="btn ghost" onClick={() => setStep("upload")}>Back</button>
            <button className="btn accent lg" disabled={loading} onClick={importModule}>
              {loading ? "Importing…" : "Import module"} <ArrowRightIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="card imp-card fade-up" style={{ textAlign: "center", padding: "60px 32px" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent-ink)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <CheckIcon size={24} />
          </div>
          <p className="serif" style={{ fontSize: 24, margin: "0 0 8px" }}>Module imported!</p>
          <p style={{ color: "var(--ink-2)", margin: "0 0 24px" }}>
            Created as a draft{moduleId ? ` (ID: ${moduleId.slice(0,8)}…)` : ""}. Publish it from the Modules page.
          </p>
          <button className="btn accent" onClick={reset}>Import another</button>
        </div>
      )}

      <style>{`
        .adm-page { padding-top: 28px; }
        .steps-bar { display:flex; align-items:center; margin-bottom:24px; gap:0; }
        .step { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--ink-3); }
        .step.done { color:var(--accent-ink); }
        .step-dot { width:24px;height:24px; border-radius:50%; border:1.5px solid var(--line); display:grid; place-items:center; font-size:11px; background:var(--bg); flex-shrink:0; }
        .step.done .step-dot { background:var(--accent-soft); border-color:var(--accent); color:var(--accent-ink); }
        .step-line { width:40px; height:1px; background:var(--line); margin:0 8px; }
        .imp-card { padding:28px; }
        .drop-zone { border:2px dashed var(--line); border-radius:var(--r-lg); padding:48px 24px; text-align:center; cursor:pointer; transition:border-color 0.15s,background 0.15s; color:var(--ink-2); display:flex; flex-direction:column; align-items:center; }
        .drop-zone:hover, .drop-zone.drag { border-color:var(--accent); background:var(--accent-soft); color:var(--accent-ink); }
        .prev-q { background:var(--bg-2); border:1px solid var(--line); border-radius:var(--r-md); padding:12px 14px; }
      `}</style>
    </div>
  );
}
