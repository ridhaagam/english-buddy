import { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProgressBar, XIcon, ClockIcon, ArrowRightIcon, CheckIcon } from "../../components/ui";
import { api } from "../../lib/api";

type Props = {
  moduleId: string;
  onExit: () => void;
  onDone: (result: any) => void;
};

export function TestScreen({ moduleId, onExit, onDone }: Props) {
  const { data: module, isLoading } = useQuery({
    queryKey: ["module", moduleId],
    queryFn: () => api.modules.get(moduleId),
  });

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [matchPairs, setMatchPairs] = useState<Record<string, string>>({});
  const [matchSel, setMatchSel] = useState<{ side: "L" | "R"; value: string } | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const qStartRef = useRef(Date.now());
  const camRef = useRef<{ stopAndUpload: (sessionId: string) => Promise<void> }>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 500);
    return () => clearInterval(t);
  }, []);

  const createSession = useMutation({
    mutationFn: () => api.sessions.create(moduleId),
    onSuccess: (data) => setSessionId(data.id),
  });

  useEffect(() => {
    if (module && !sessionId) createSession.mutate();
  }, [module]);

  const questions = module?.questions || [];
  const q = questions[idx];
  const rightCol = useMemo(() => {
    if (!q || q.kind !== "match") return [];
    const pairs = q.payload?.pairs || [];
    return [...pairs.map((p: any) => p.right)].sort((a: string, b: string) => a.localeCompare(b));
  }, [q?.id]);

  if (isLoading || !module) return (
    <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
      <div className="dot-load"><i /><i /><i /></div>
    </div>
  );

  if (!q) return null;
  const last = idx === questions.length - 1;
  const progress = (idx + 1) / questions.length;

  const matchedRights = new Set(Object.values(matchPairs));
  const allMatched = q.kind === "match" && (q.payload?.pairs || []).every((p: any) => matchPairs[p.left]);
  const canSubmit = (q.kind === "match" && allMatched) || (q.kind !== "match" && selected !== null);

  function resetQ() { setSelected(null); setMatchPairs({}); setMatchSel(null); qStartRef.current = Date.now(); }

  function pickMatch(side: "L" | "R", value: string) {
    if (matchSel?.side === side && matchSel.value === value) { setMatchSel(null); return; }
    if (!matchSel) { setMatchSel({ side, value }); return; }
    if (matchSel.side === side) { setMatchSel({ side, value }); return; }
    const left = side === "L" ? value : matchSel.value;
    const right = side === "R" ? value : matchSel.value;
    setMatchPairs((m) => ({ ...m, [left]: right }));
    setMatchSel(null);
  }

  async function submit() {
    if (!sessionId) return;
    let selection: Record<string, string>;
    if (q.kind === "match") {
      selection = { ...matchPairs };
    } else {
      selection = { choice: selected! };
    }
    const timeMs = Date.now() - qStartRef.current;
    let is_correct = false;
    try {
      const res = await api.sessions.answer(sessionId, { question_id: q.id, selection, time_spent_ms: timeMs });
      is_correct = res?.is_correct ?? false;
    } catch {}

    const correctAnswer = q.payload?.answer || "";
    const nextAnswers = [...answers, {
      questionId: q.id,
      selection,
      is_correct,
      prompt: q.prompt,
      correct_answer: correctAnswer,
    }];
    setAnswers(nextAnswers);

    if (last) {
      try {
        const result = await api.sessions.finish(sessionId, Intl.DateTimeFormat().resolvedOptions().timeZone);
        // Upload recording first so it completes before component unmounts
        if (camRef.current) {
          await camRef.current.stopAndUpload(sessionId);
        }
        onDone({ ...result, session_id: sessionId, module_id: moduleId, answers: nextAnswers, timeMs: Date.now() - startRef.current });
      } catch {
        if (camRef.current) {
          await camRef.current.stopAndUpload(sessionId).catch(() => {});
        }
        onDone({ score_pct: 0, session_id: sessionId, module_id: moduleId, answers: nextAnswers, timeMs: 0 });
      }
      return;
    }
    setIdx((i) => i + 1);
    resetQ();
  }

  const choices = q.payload?.choices || [];
  const pairs = q.payload?.pairs || [];

  return (
    <div className="test-shell">
      <header className="test-head">
        <button className="icon-btn" onClick={onExit} aria-label="Exit"><XIcon size={16} /></button>
        <div className="head-progress"><ProgressBar value={progress} /></div>
        <div className="head-meta mono">
          <ClockIcon size={13} />
          <span>{formatTime(elapsed)}</span>
          <span style={{ color: "var(--ink-3)" }}>{idx + 1} / {questions.length}</span>
        </div>
      </header>

      <main className="test-main" key={q.id}>
        <section className="q-pane fade-up">
          <div className="q-kind-badge eyebrow">
            {q.kind === "fill" ? "Fill in the blank" : q.kind === "match" ? "Match pairs" : "Multiple choice"}
          </div>
          <h2 className="serif q-prompt">{q.prompt}</h2>

          {q.context && (
            <blockquote className="context">
              <span className="quote-mark serif-it">"</span>{q.context}
            </blockquote>
          )}

          {q.kind === "fill" && q.sentence && (
            <FillSentence sentence={q.sentence} pick={choices.find((c: any) => c.id === selected) || null} />
          )}

          {(q.kind === "choice" || q.kind === "fill") && (
            <ul className="choices">
              {choices.map((c: any, i: number) => (
                <li key={c.id} className="choice" data-sel={selected === c.id ? true : undefined}
                  style={{ animationDelay: `${i * 55}ms` }} onClick={() => setSelected(c.id)}>
                  <span className="choice-key mono">{String.fromCharCode(65 + i)}</span>
                  <span className="choice-label">{c.label}</span>
                </li>
              ))}
            </ul>
          )}

          {q.kind === "match" && (
            <div className="match-grid">
              <ul className="match-col">
                <li className="match-col-head eyebrow">Term</li>
                {pairs.map((p: any) => {
                  const matched = matchPairs[p.left];
                  const isSel = matchSel?.side === "L" && matchSel.value === p.left;
                  return (
                    <li key={p.left} className="match-cell" data-sel={isSel ? true : undefined} data-matched={!!matched ? true : undefined}
                      onClick={() => matched ? setMatchPairs((m) => { const c = { ...m }; delete c[p.left]; return c; }) : pickMatch("L", p.left)}>
                      <span className="serif match-word">{p.left}</span>
                      {matched && <span className="match-tag mono">→ {matched}</span>}
                    </li>
                  );
                })}
              </ul>
              <ul className="match-col">
                <li className="match-col-head eyebrow">Meaning</li>
                {rightCol.map((r: string) => {
                  const used = matchedRights.has(r);
                  const isSel = matchSel?.side === "R" && matchSel.value === r;
                  return (
                    <li key={r} className="match-cell right" data-sel={isSel ? true : undefined} data-used={used ? true : undefined}
                      onClick={() => !used && pickMatch("R", r)}>{r}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="q-footer">
            <button className="btn accent lg q-submit" disabled={!canSubmit} onClick={submit}>
              {last ? "Submit & see score" : "Next question"} <ArrowRightIcon size={16} />
            </button>
          </div>
        </section>

        <aside className="camera-pane fade-up" style={{ animationDelay: "100ms" }}>
          <CameraCapture ref={camRef} />
        </aside>
      </main>

      <style>{`
        .test-shell { min-height:100vh; display:flex; flex-direction:column; background:var(--bg); }
        .test-head { display:grid; grid-template-columns:44px 1fr auto; align-items:center; gap:18px; padding:14px 24px; border-bottom:1px solid var(--line); background:color-mix(in oklch,var(--bg) 92%,transparent); backdrop-filter:blur(10px); position:sticky; top:0; z-index:10; }
        .head-progress { width:100%; }
        .head-meta { display:flex; align-items:center; gap:10px; font-size:12px; color:var(--ink-2); white-space:nowrap; }
        .test-main { flex:1; display:grid; grid-template-columns:minmax(0,1.3fr) minmax(280px,1fr); gap:20px; padding:24px; max-width:1300px; width:100%; margin:0 auto; align-items:start; }
        .q-pane { background:var(--surface); border:1px solid var(--line); border-radius:var(--r-xl); padding:32px 32px 24px; display:flex; flex-direction:column; box-shadow:var(--shadow-sm); min-height:420px; }
        .q-kind-badge { margin-bottom:10px; color:var(--accent-ink); }
        .q-prompt { font-size:26px; line-height:1.3; margin:0 0 20px; letter-spacing:-0.015em; }
        .context { margin:0 0 20px; padding:16px 20px; border-left:3px solid var(--accent); background:var(--accent-soft); border-radius:0 var(--r-md) var(--r-md) 0; font-family:var(--font-display); font-style:italic; font-size:18px; color:var(--ink); position:relative; }
        .quote-mark { color:var(--accent); margin-right:6px; font-size:24px; line-height:0; vertical-align:-6px; }
        .choices { list-style:none; padding:0; margin:0 0 24px; display:grid; gap:9px; }
        .choice { display:flex; align-items:center; gap:14px; padding:14px 16px; background:var(--surface); border:1.5px solid var(--line); border-radius:var(--r-md); cursor:pointer; transition:border-color 0.15s,background 0.15s,transform 0.1s; animation:fadeUp 0.38s cubic-bezier(0.22,1,0.36,1) both; user-select:none; }
        .choice:hover { border-color:var(--ink-3); background:var(--bg-2); transform:translateX(2px); }
        .choice[data-sel] { border-color:var(--accent); background:var(--accent-soft); }
        .choice-key { width:28px;height:28px; border-radius:8px; background:var(--bg-2); color:var(--ink-2); display:grid; place-items:center; font-size:12px; flex-shrink:0; border:1px solid var(--line); transition:background 0.15s,color 0.15s,border-color 0.15s; }
        .choice[data-sel] .choice-key { background:var(--accent); color:white; border-color:transparent; }
        .choice-label { flex:1; font-weight:500; font-size:15px; line-height:1.4; }
        .match-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:0 0 24px; }
        .match-col { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
        .match-col-head { padding:0 4px 2px; font-size:10px; }
        .match-cell { padding:12px 14px; background:var(--surface); border:1.5px solid var(--line); border-radius:var(--r-md); cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:8px; transition:border-color 0.15s,background 0.15s; font-size:14px; min-height:48px; user-select:none; }
        .match-cell.right { font-family:var(--font-display); font-style:italic; font-size:15px; }
        .match-word { font-size:16px; }
        .match-cell:hover:not([data-used]) { border-color:var(--ink-3); background:var(--bg-2); }
        .match-cell[data-sel] { border-color:var(--accent); background:var(--accent-soft); }
        .match-cell[data-matched] { border-color:color-mix(in oklch,var(--accent),white 45%); background:color-mix(in oklch,var(--accent-soft),white 30%); }
        .match-cell[data-used] { opacity:0.35; cursor:not-allowed; }
        .match-tag { font-size:10px; color:var(--accent-ink); flex-shrink:0; max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .q-footer { margin-top:auto; padding-top:18px; display:flex; justify-content:flex-end; }
        .q-submit { min-width:200px; justify-content:center; }
        .camera-pane { position:sticky; top:80px; }
        @media(max-width:960px) { .test-main{grid-template-columns:1fr;padding:16px} .camera-pane{position:static;order:-1} .q-pane{padding:24px 20px} }
        @media(max-width:520px) { .test-head{padding:10px 14px;gap:10px} .q-prompt{font-size:22px} .q-pane{padding:20px 16px;border-radius:var(--r-lg)} .match-grid{grid-template-columns:1fr} .q-submit{width:100%;justify-content:center} }
      `}</style>
    </div>
  );
}

function FillSentence({ sentence, pick }: { sentence: string; pick: any }) {
  const parts = sentence.split("__");
  return (
    <div style={{ margin: "0 0 22px", padding: "20px 22px", background: "var(--bg-2)", borderRadius: "var(--r-md)", border: "1px dashed var(--line)", fontSize: 19, lineHeight: 1.6, fontFamily: "var(--font-display)", color: "var(--ink)" }}>
      {parts[0]}
      <span style={{ display: "inline-block", minWidth: 110, padding: "2px 12px", margin: "0 4px", borderBottom: pick ? "2px solid var(--accent)" : "2px dashed var(--ink-3)", textAlign: "center", color: pick ? "var(--accent-ink)" : "var(--ink-3)", fontStyle: pick ? "italic" : "normal", fontWeight: 600, transition: "color 0.2s,border-color 0.2s" }}>
        {pick ? pick.label : "  ?  "}
      </span>
      {parts[1]}
    </div>
  );
}

// Expose stopAndUpload imperatively so TestScreen can await it before navigation
const CameraCapture = forwardRef<{ stopAndUpload: (sessionId: string) => Promise<void> }>(function CameraCapture(_, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  type CamStatus = "loading" | "active" | "blocked" | "insecure" | "unavailable" | "uploading" | "done";
  const [status, setStatus] = useState<CamStatus>("loading");
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const [faceDetAvail, setFaceDetAvail] = useState<boolean | null>(null);
  const [consent, setConsent] = useState<"pending" | "granted" | "declined">(
    () => (localStorage.getItem("cam_consent") as any) || "pending"
  );
  const [blockReason, setBlockReason] = useState<"browser" | "os" | "">("");
  const [retryCount, setRetryCount] = useState(0);

  // Expose stopAndUpload to parent via ref
  useImperativeHandle(ref, () => ({
    stopAndUpload: async (sessionId: string) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") return;
      setStatus("uploading");
      await new Promise<void>((resolve) => {
        recorder.onstop = async () => {
          if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: "video/webm" });
            const fd = new FormData();
            fd.append("chunk", blob, "recording.webm");
            try {
              await fetch(`/api/v1/sessions/${sessionId}/recording-chunk`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
                body: fd,
              });
            } catch {}
          }
          setStatus("done");
          resolve();
        };
        recorder.stop();
      });
    },
  }));

  // Attach stream to video element AFTER it mounts (status becomes "active")
  useEffect(() => {
    if (status === "active" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [status]);

  useEffect(() => {
    if (consent !== "granted") return;

    // Insecure context — camera is blocked by the browser spec
    if (!window.isSecureContext || !navigator.mediaDevices) {
      setStatus("insecure");
      return;
    }

    let faceTimer: ReturnType<typeof setInterval>;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } } })
      .then((stream) => {
        streamRef.current = stream;
        setStatus("active");

        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.start(5000);

        // face-api.js — works in all browsers without flags
        import("face-api.js").then(async (faceapi) => {
          try {
            await faceapi.nets.tinyFaceDetector.loadFromUri(
              "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights"
            );
            setFaceDetAvail(true);
            faceTimer = setInterval(async () => {
              if (!videoRef.current || videoRef.current.readyState < 2) return;
              try {
                const detections = await faceapi.detectAllFaces(
                  videoRef.current,
                  new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
                );
                setFaceCount(detections.length);
              } catch {}
            }, 2000);
          } catch {
            setFaceDetAvail(false);
          }
        }).catch(() => setFaceDetAvail(false));
      })
      .catch((err: DOMException) => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setBlockReason("browser");
          setStatus("blocked");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setStatus("unavailable");
        } else {
          setBlockReason("os");
          setStatus("blocked");
        }
      });

    return () => {
      clearInterval(faceTimer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [consent, retryCount]);

  // ── Consent pending ──────────────────────────────────────────────────────
  if (consent === "pending") {
    return (
      <div className="cam-card">
        <div className="cam-head">
          <span className="eyebrow">Camera · proctoring</span>
        </div>
        <div className="cam-empty" style={{ gap: 14, padding: "28px 18px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg-2)", display: "grid", placeItems: "center", color: "var(--ink-3)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </div>
          <p className="serif" style={{ margin: 0, fontSize: 17, letterSpacing: "-0.01em", textAlign: "center" }}>Allow camera access?</p>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13, textAlign: "center", maxWidth: 230, lineHeight: 1.5 }}>
            Your session is recorded for integrity monitoring. You can decline and still complete the test.
          </p>
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <button className="btn ghost" style={{ fontSize: 13, flex: 1 }} onClick={() => { setConsent("declined"); localStorage.setItem("cam_consent", "declined"); }}>Decline</button>
            <button className="btn accent" style={{ fontSize: 13, flex: 1 }} onClick={() => { setConsent("granted"); localStorage.setItem("cam_consent", "granted"); }}>Allow camera</button>
          </div>
        </div>
        <CamStyle />
      </div>
    );
  }

  // ── Declined by user ─────────────────────────────────────────────────────
  if (consent === "declined") {
    return (
      <div className="cam-card">
        <div className="cam-head">
          <span className="eyebrow">Camera · proctoring</span>
          <CamBadge label="OFF" color="neutral" />
        </div>
        <div className="cam-empty" style={{ padding: "20px 16px", gap: 10 }}>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13, textAlign: "center" }}>
            Recording declined. Your session continues without a recording.
          </p>
          <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => {
            localStorage.removeItem("cam_consent");
            setConsent("pending");
            setStatus("loading");
          }}>Change mind</button>
        </div>
        <CamStyle />
      </div>
    );
  }

  // ── Insecure context ─────────────────────────────────────────────────────
  if (status === "insecure") {
    return (
      <div className="cam-card">
        <div className="cam-head">
          <span className="eyebrow">Camera · proctoring</span>
          <CamBadge label="HTTPS required" color="warn" />
        </div>
        <div className="cam-empty" style={{ padding: "20px 16px", gap: 10 }}>
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 13, textAlign: "center", lineHeight: 1.5 }}>
            Camera requires a secure connection. Open the app via <strong>localhost:5173</strong> or enable HTTPS.
          </p>
        </div>
        <CamStyle />
      </div>
    );
  }

  // ── Blocked by browser permissions ───────────────────────────────────────
  if (status === "blocked") {
    return (
      <div className="cam-card">
        <div className="cam-head">
          <span className="eyebrow">Camera · proctoring</span>
          <CamBadge label="BLOCKED" color="warn" />
        </div>
        <div className="cam-empty" style={{ padding: "20px 16px", gap: 10 }}>
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 13, textAlign: "center", lineHeight: 1.5 }}>
            {blockReason === "browser"
              ? "Camera blocked by browser. Click the camera icon in the address bar to allow access, then refresh."
              : "Camera could not start. Check your system camera permissions."}
          </p>
          <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => {
            localStorage.removeItem("cam_consent");
            setConsent("pending");
            setStatus("loading");
            setBlockReason("");
          }}>Try again</button>
        </div>
        <CamStyle />
      </div>
    );
  }

  // ── No camera device ─────────────────────────────────────────────────────
  if (status === "unavailable") {
    return (
      <div className="cam-card">
        <div className="cam-head">
          <span className="eyebrow">Camera · proctoring</span>
          <CamBadge label="NO CAMERA" color="neutral" />
        </div>
        <div className="cam-empty" style={{ padding: "20px 16px", gap: 10 }}>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13, textAlign: "center", lineHeight: 1.5 }}>
            No camera found. Check that your camera is connected and that the browser has camera permission.
          </p>
          <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => {
            setStatus("loading");
            setRetryCount((c) => c + 1);
          }}>Retry</button>
        </div>
        <CamStyle />
      </div>
    );
  }

  // ── Active / uploading / done ─────────────────────────────────────────────
  return (
    <div className="cam-card">
      <div className="cam-head">
        <span className="eyebrow">Camera · proctoring</span>
        <CamBadge
          label={status === "loading" ? "CONNECTING" : status === "uploading" ? "SAVING" : status === "done" ? "SAVED" : "● REC"}
          color={status === "active" ? "live" : "neutral"}
        />
      </div>

      {status === "loading" && (
        <div className="cam-empty"><div className="dot-load"><i /><i /><i /></div></div>
      )}

      {(status === "active" || status === "uploading" || status === "done") && (
        <div style={{ position: "relative", borderRadius: "var(--r-lg)", overflow: "hidden", background: "#000", lineHeight: 0 }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "cover" }} />
          {faceDetAvail === true && faceCount !== null && (
            <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.65)", padding: "4px 10px", borderRadius: 999, fontSize: 11, color: faceCount === 1 ? "#4ade80" : "#f87171", backdropFilter: "blur(4px)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: faceCount === 1 ? "#4ade80" : "#f87171", display: "inline-block", flexShrink: 0 }} />
              {faceCount === 1 ? "Face detected" : faceCount === 0 ? "No face detected" : `${faceCount} faces`}
            </div>
          )}
          {faceDetAvail === false && (
            <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, background: "rgba(0,0,0,0.55)", padding: "4px 10px", borderRadius: 999, fontSize: 10, color: "#aaa", textAlign: "center" }}>
              Face detection unavailable
            </div>
          )}
        </div>
      )}

      <CamStyle />
    </div>
  );
});

function CamBadge({ label, color }: { label: string; color: "live" | "warn" | "neutral" }) {
  const bg = color === "live" ? "var(--accent-soft)" : color === "warn" ? "oklch(0.95 0.06 65)" : "var(--bg-2)";
  const fg = color === "live" ? "var(--accent-ink)" : color === "warn" ? "oklch(0.5 0.1 65)" : "var(--ink-3)";
  const border = color === "live" ? "var(--accent)" : color === "warn" ? "oklch(0.8 0.08 65)" : "var(--line)";
  return (
    <span className="mono" style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: bg, color: fg, border: `1px solid ${border}`, letterSpacing: "0.06em" }}>
      {label}
    </span>
  );
}

function CamStyle() {
  return (
    <style>{`
      .cam-card { background:var(--surface); border:1px solid var(--line); border-radius:var(--r-xl); box-shadow:var(--shadow-sm); padding:18px; display:flex; flex-direction:column; gap:12px; }
      .cam-head { display:flex; justify-content:space-between; align-items:center; }
      .cam-empty { display:flex; flex-direction:column; align-items:center; padding:32px 16px; background:var(--bg-2); border:1.5px dashed var(--line); border-radius:var(--r-lg); gap:12px; }
    `}</style>
  );
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
