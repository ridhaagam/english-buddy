// src/admin/Import.tsx — PDF/Word document import wizard
const { useState: useState_Im, useRef: useRef_Im } = React;

type DetectedRow = { include: boolean; word: string; example: string; meaning: string };

const MOCK_DETECTED: DetectedRow[] = [
  { include: true,  word: "degradation",  example: "Rain causes image degradation.",                     meaning: "penurunan kualitas" },
  { include: true,  word: "restoration",  example: "The model performs image restoration.",              meaning: "pemulihan" },
  { include: true,  word: "visibility",   example: "Heavy rain reduces visibility.",                     meaning: "jarak pandang" },
  { include: true,  word: "streak",       example: "Rain streaks affect detection accuracy.",            meaning: "garis hujan" },
  { include: true,  word: "synthetic",    example: "We generated a synthetic dataset.",                  meaning: "sintetis" },
  { include: true,  word: "enhancement",  example: "Image enhancement improves clarity.",                meaning: "peningkatan" },
  { include: true,  word: "distortion",   example: "The deraining method introduces distortion.",        meaning: "distorsi" },
  { include: true,  word: "robustness",   example: "YOLO requires robustness under rain.",               meaning: "ketahanan" },
  { include: true,  word: "feature",      example: "The network extracts spatial features.",             meaning: "fitur" },
  { include: true,  word: "haze",         example: "Rain often appears with haze.",                      meaning: "kabut" },
  { include: true,  word: "occlusion",    example: "Raindrops create partial occlusion.",                meaning: "penghalang visual" },
  { include: false, word: "tetesan",      example: "Raindrops distort the windshield image.",            meaning: "(skipped — duplicate)" },
];

type Phase = "drop" | "uploading" | "parsing" | "review" | "done";

function AdminImport() {
  const [phase, setPhase] = useState_Im<Phase>("drop");
  const [file, setFile] = useState_Im<File | null>(null);
  const [progress, setProgress] = useState_Im(0);
  const [rows, setRows] = useState_Im<DetectedRow[]>([]);
  const [moduleName, setModuleName] = useState_Im("Imported vocabulary · " + new Date().toLocaleDateString());
  const [topic, setTopic] = useState_Im("Vocabulary");
  const [level, setLevel] = useState_Im("B1");
  const [drag, setDrag] = useState_Im(false);
  const inputRef = useRef_Im<HTMLInputElement>(null);

  function pickFile(f: File) {
    setFile(f);
    setPhase("uploading");
    setProgress(0);
    let p = 0;
    const i = setInterval(() => {
      p += 8 + Math.random() * 12;
      if (p >= 100) {
        p = 100;
        clearInterval(i);
        setProgress(100);
        setPhase("parsing");
        // parse phase
        let parseProg = 0;
        const j = setInterval(() => {
          parseProg += 6 + Math.random() * 14;
          if (parseProg >= 100) {
            parseProg = 100;
            clearInterval(j);
            setProgress(100);
            setRows(MOCK_DETECTED);
            setPhase("review");
          } else {
            setProgress(parseProg);
          }
        }, 220);
      } else {
        setProgress(p);
      }
    }, 180);
  }

  function reset() {
    setPhase("drop"); setFile(null); setProgress(0); setRows([]);
  }

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <div>
      <header className="im-head fade-up">
        <div>
          <p className="eyebrow">Document import</p>
          <h2 className="serif" style={{ margin: "4px 0 4px", fontSize: 26, letterSpacing: "-0.02em" }}>
            Turn a PDF or Word file into <span className="serif-it">practice questions.</span>
          </h2>
          <p style={{ margin: 0, color: "var(--ink-2)", maxWidth: 560 }}>
            Drop a vocabulary list, glossary, or study sheet. We extract words, example sentences,
            and meanings automatically — you review and publish.
          </p>
        </div>
        <ImportStepper phase={phase} />
      </header>

      {/* PHASE: drop ----------------------------------------------------- */}
      {phase === "drop" && (
        <div
          className={"dropzone fade-up " + (drag ? "drag" : "")}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault(); setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) pickFile(f);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
          />
          <div className="drop-glyph">
            <UploadGlyphLg />
          </div>
          <h3 className="serif" style={{ margin: "16px 0 6px", fontSize: 22, letterSpacing: "-0.02em" }}>
            Drop your file here
          </h3>
          <p style={{ margin: 0, color: "var(--ink-2)" }}>
            PDF, DOCX, or plain text · up to 20 MB
          </p>
          <button className="btn ghost" style={{ marginTop: 18 }} onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
            Choose file
          </button>
          <div className="drop-tips">
            <Tip n="01" t="Tabular vocabulary lists work best (word · example · meaning)" />
            <Tip n="02" t="Bilingual glossaries are auto-detected — you can rename columns later" />
            <Tip n="03" t="Anything we miss, you can fix in the review step" />
          </div>
        </div>
      )}

      {/* PHASE: uploading / parsing ------------------------------------- */}
      {(phase === "uploading" || phase === "parsing") && (
        <div className="card processing fade-up">
          <div className="file-chip">
            <FileDoc />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file?.name || "document.pdf"}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                {file ? `${Math.round(file.size / 1024)} KB` : "—"} ·
                {phase === "uploading" ? " uploading…" : " parsing locally…"}
              </div>
            </div>
            <button className="btn ghost" onClick={reset} style={{ padding: "8px 12px", fontSize: 12 }}>Cancel</button>
          </div>

          <div className="proc-status">
            <ProgressBar value={progress / 100} />
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{Math.round(progress)}%</span>
          </div>

          <ul className="proc-log mono">
            <ProcLine active={phase === "uploading" || phase === "parsing"} done={phase !== "uploading"}>
              Uploaded file to local processor
            </ProcLine>
            <ProcLine active={phase === "parsing"} done={phase === "review"}>
              Extracting tables and paragraphs
            </ProcLine>
            <ProcLine active={phase === "parsing"}>
              Detecting word · example · meaning structure
            </ProcLine>
            <ProcLine>
              Building draft module
            </ProcLine>
          </ul>
        </div>
      )}

      {/* PHASE: review --------------------------------------------------- */}
      {phase === "review" && (
        <div className="review fade-up">
          <div className="card review-meta">
            <div className="field" style={{ flex: 1.4 }}>
              <label>Module name</label>
              <input value={moduleName} onChange={(e) => setModuleName(e.target.value)} />
            </div>
            <div className="field">
              <label>Topic</label>
              <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                {["Vocabulary","Grammar","Listening","Speaking","Writing"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                {["A2","B1","B2","C1"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="card review-table-wrap">
            <div className="rt-head">
              <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>
                Detected items <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}>· {rows.length} rows, {includedCount} selected</span>
              </h3>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn ghost" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setRows(rows.map((r) => ({ ...r, include: true })))}>Select all</button>
                <button className="btn ghost" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setRows(rows.map((r) => ({ ...r, include: false })))}>Clear</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }} />
                    <th>Word</th>
                    <th>Example sentence</th>
                    <th>Meaning</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} data-off={!r.include || undefined}>
                      <td data-label="Include">
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={() => setRows(rows.map((x, j) => j === i ? { ...x, include: !x.include } : x))}
                        />
                      </td>
                      <td data-label="Word">
                        <input
                          className="cell-in"
                          value={r.word}
                          onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, word: e.target.value } : x))}
                        />
                      </td>
                      <td data-label="Example sentence">
                        <input
                          className="cell-in"
                          value={r.example}
                          onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, example: e.target.value } : x))}
                        />
                      </td>
                      <td data-label="Meaning">
                        <input
                          className="cell-in"
                          value={r.meaning}
                          onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, meaning: e.target.value } : x))}
                        />
                      </td>
                      <td data-label="" style={{ textAlign: "right" }}>
                        <button
                          className="row-act"
                          onClick={() => setRows(rows.filter((_, j) => j !== i))}
                          title="Remove row"
                        ><TrashG2 /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="review-actions">
            <button className="btn ghost" onClick={reset}>← Use a different file</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn ghost">Save as draft</button>
              <button className="btn accent" onClick={() => setPhase("done")} disabled={includedCount === 0}>
                Create module · {includedCount} items <ArrowR />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE: done ----------------------------------------------------- */}
      {phase === "done" && (
        <div className="done-card card fade-up">
          <div className="done-glyph"><CheckBigG /></div>
          <h2 className="serif" style={{ margin: "16px 0 6px", fontSize: 26, letterSpacing: "-0.02em" }}>
            Module created
          </h2>
          <p style={{ color: "var(--ink-2)", margin: "0 0 20px" }}>
            "<strong>{moduleName}</strong>" has been added to your library as a draft with{" "}
            <strong>{includedCount}</strong> questions.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn ghost" onClick={reset}>Import another</button>
            <button className="btn accent">Open module editor <ArrowR /></button>
          </div>
        </div>
      )}

      <style>{`
        .im-head {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: end;
          margin-bottom: 22px;
        }

        .dropzone {
          background: var(--surface);
          border: 2px dashed var(--line);
          border-radius: var(--r-xl);
          padding: 54px 30px;
          text-align: center;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s;
          display: flex; flex-direction: column; align-items: center;
        }
        .dropzone:hover, .dropzone.drag {
          background: var(--accent-soft);
          border-color: var(--accent);
        }
        .drop-glyph {
          width: 80px; height: 80px;
          border-radius: 50%;
          background: var(--bg-2);
          color: var(--ink-2);
          display: grid; place-items: center;
          animation: floaty 4s ease-in-out infinite;
        }
        .dropzone.drag .drop-glyph,
        .dropzone:hover .drop-glyph {
          background: white; color: var(--accent-ink);
        }
        .drop-tips {
          margin-top: 28px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          width: 100%;
          max-width: 700px;
        }

        .processing { padding: 22px 24px; }
        .file-chip {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          background: var(--bg-2);
          border-radius: var(--r-md);
          margin-bottom: 16px;
        }
        .proc-status {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 18px;
        }
        .proc-log {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 6px;
          font-size: 12px;
        }

        .review { display: flex; flex-direction: column; gap: 14px; }
        .review-meta {
          padding: 18px 20px;
          display: flex; gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .review-meta .field { min-width: 120px; }
        .review-table-wrap { padding: 18px 20px 8px; }
        .rt-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px;
          gap: 8px;
          flex-wrap: wrap;
        }
        .cell-in {
          font: inherit;
          width: 100%;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--ink);
          outline: none;
        }
        .cell-in:focus { background: white; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
        .adm-table tr[data-off] td { opacity: 0.45; }
        .review-actions {
          display: flex; justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .done-card { padding: 50px 30px; text-align: center; }
        .done-glyph {
          width: 80px; height: 80px;
          margin: 0 auto;
          border-radius: 50%;
          background: var(--accent-soft);
          color: var(--accent-ink);
          display: grid; place-items: center;
          animation: scaleIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }

        @media (max-width: 720px) {
          .im-head { grid-template-columns: 1fr; }
          .drop-tips { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------
function ImportStepper({ phase }: { phase: Phase }) {
  const order: Phase[] = ["drop", "uploading", "parsing", "review", "done"];
  const labels: Record<Phase, string> = {
    drop: "Upload", uploading: "Upload", parsing: "Parse", review: "Review", done: "Done",
  };
  const steps = ["drop", "parsing", "review", "done"] as Phase[];
  const stepIdx = phase === "uploading" ? 0 : steps.indexOf(phase);
  return (
    <ol className="stepper mono">
      {steps.map((s, i) => (
        <li key={s} data-active={stepIdx === i || undefined} data-done={stepIdx > i || undefined}>
          <span className="stp-num">{i + 1}</span>
          <span className="stp-lbl">{labels[s]}</span>
        </li>
      ))}
      <style>{`
        .stepper {
          list-style: none; padding: 0; margin: 0;
          display: flex; gap: 8px;
          font-size: 11px;
          align-items: center;
        }
        .stepper li {
          display: flex; align-items: center; gap: 6px;
          color: var(--ink-3);
        }
        .stepper li + li::before {
          content: ""; width: 24px; height: 1px; background: var(--line);
          margin-right: 2px;
        }
        .stp-num {
          width: 22px; height: 22px;
          border-radius: 999px;
          background: var(--bg-2); color: var(--ink-3);
          display: grid; place-items: center;
          font-size: 11px;
          border: 1px solid var(--line);
        }
        .stepper li[data-active] { color: var(--ink); }
        .stepper li[data-active] .stp-num { background: var(--accent); color: white; border-color: var(--accent); }
        .stepper li[data-done] .stp-num   { background: var(--accent-ink); color: white; border-color: var(--accent-ink); }
        .stp-lbl { text-transform: uppercase; letter-spacing: 0.08em; }
        @media (max-width: 720px) { .stp-lbl { display: none; } }
      `}</style>
    </ol>
  );
}

function ProcLine({ children, active, done }: { children: any; active?: boolean; done?: boolean }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: active ? "var(--ink)" : done ? "var(--accent-ink)" : "var(--ink-3)",
      }}
    >
      <span
        style={{
          width: 14, height: 14, borderRadius: 999,
          background: done ? "var(--accent)" : active ? "var(--accent-soft)" : "var(--bg-2)",
          border: "1px solid var(--line)",
          display: "grid", placeItems: "center",
          color: done ? "white" : "var(--ink-3)",
          flexShrink: 0,
        }}
      >
        {done ? <CheckMicro /> : active ? <span className="dot-pulse" /> : null}
      </span>
      <span style={{ fontSize: 12 }}>{children}</span>
      <style>{`
        .dot-pulse {
          width: 6px; height: 6px; border-radius: 999px;
          background: var(--accent);
          animation: pulse-ring 1.6s infinite;
        }
      `}</style>
    </li>
  );
}

function Tip({ n, t }: { n: string; t: string }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--bg-2)",
        borderRadius: 12,
        textAlign: "left",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", border: "1px solid var(--line)", padding: "2px 6px", borderRadius: 4, background: "white" }}>
        {n}
      </span>
      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{t}</span>
    </div>
  );
}

// glyphs
function G2({ children, size = 14 }: any) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
function UploadGlyphLg() {
  return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>;
}
function FileDoc() { return <G2 size={20}><path d="M14 3v6h6"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M8 13h8M8 17h5"/></G2>; }
function ArrowR()  { return <G2><path d="M5 12h14M13 6l6 6-6 6"/></G2>; }
function TrashG2() { return <G2><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></G2>; }
function CheckMicro() { return <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9 17l11-11"/></svg>; }
function CheckBigG() { return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9 17l11-11"/></svg>; }

(window as any).AdminImport = AdminImport;
