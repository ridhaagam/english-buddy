import { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from "react";

// Module-level singleton: starts loading face-api as soon as TestScreen.tsx is first imported,
// so by the time the user grants camera consent the weights are already downloaded.
let faceApiReady: Promise<any> | null = null;
function getFaceApi(): Promise<any> {
  if (!faceApiReady) {
    faceApiReady = import("face-api.js").then(async (faceapi) => {
      try { await (faceapi as any).tf.setBackend("cpu"); } catch {}
      await (faceapi as any).tf.ready();
      await faceapi.nets.tinyFaceDetector.loadFromUri("/face-api-weights");
      return faceapi;
    }).catch((err) => {
      faceApiReady = null; // allow retry on next attempt
      throw err;
    });
  }
  return faceApiReady;
}
import { useQuery } from "@tanstack/react-query";
import { ProgressBar, XIcon, ClockIcon, ArrowRightIcon, CheckIcon } from "../../components/ui";
import { api } from "../../lib/api";
import "./TestScreen.css";

type Props = {
  moduleId: string;
  onExit: () => void;
  onDone: (result: any) => void;
  resumeData?: { answeredQuestionIds: string[]; previousSessionId: string };
};

export function TestScreen({ moduleId, onExit, onDone, resumeData }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [fillInput, setFillInput] = useState("");
  const [matchPairs, setMatchPairs] = useState<Record<string, string>>({});
  const [matchSel, setMatchSel] = useState<{ side: "L" | "R"; value: string } | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [faceAnomalyCount, setFaceAnomalyCount] = useState(0);
  const [proctoringMeta, setProctoringMeta] = useState<Record<string, { tab_switch: boolean; face_anomaly: boolean }>>({});
  const [tabAlert, setTabAlert] = useState(false);
  const [exitDialog, setExitDialog] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [revealData, setRevealData] = useState<{
    correctId: string; chosenId: string | null; isCorrect: boolean;
    explain: string | null; choices: Array<{id: string; label: string}>; isLast: boolean;
    lastPayload: any;
  } | null>(null);
  const startRef = useRef(Date.now());
  const qStartRef = useRef(Date.now());
  // answersRef mirrors answers state — always up-to-date even inside async callbacks
  const answersRef = useRef<any[]>([]);
  // Promises for background answer saves (intermediate questions)
  const pendingRef = useRef<Promise<any>[]>([]);
  // proctoringMetaRef mirrors state so submit() always reads the latest value
  const proctoringMetaRef = useRef<Record<string, { tab_switch: boolean; face_anomaly: boolean }>>({});
  const camRef = useRef<{
    stopAndUpload: (sessionId: string) => Promise<void>;
    onFaceAnomaly: (questionId: string) => void;
    setSessionId: (id: string) => void;
  }>(null);

  // Kick off face-api preload immediately — well before camera consent is given
  useEffect(() => { getFaceApi().catch(() => {}); }, []);

  // Step 1: Create session immediately on mount (no module pre-fetch needed)
  useEffect(() => {
    api.sessions.create(moduleId, resumeData?.previousSessionId)
      .then((data) => {
        setSessionId(data.id);
        api.sessions.logEvent(data.id, resumeData ? "resume" : "open").catch(() => {});
      })
      .catch((err: Error) => {
        setSessionError(err.message ?? "Failed to start this module");
      });
  }, [moduleId]);

  // Step 2: Once we have the session ID, fetch module with shuffle seed
  const { data: module, isLoading } = useQuery({
    queryKey: ["module", moduleId, sessionId],
    queryFn: () => api.modules.get(moduleId, sessionId!),
    enabled: !!sessionId,
  });

  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 500);
    return () => clearInterval(t);
  }, []);

  const questions = useMemo(() => {
    const allQ: any[] = module?.questions || [];
    if (!resumeData?.answeredQuestionIds?.length) return allQ;
    const skip = new Set(resumeData.answeredQuestionIds);
    return allQ.filter((q) => !skip.has(q.id));
  }, [module?.questions, resumeData]);
  const q = questions[idx];

  // beforeunload guard — warns if user tries to close tab/refresh mid-session
  useEffect(() => {
    if (!sessionId) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sessionId]);

  // Tab-switch detection
  useEffect(() => {
    if (!q) return;
    const handler = () => {
      if (document.visibilityState === "hidden") {
        setTabSwitchCount((c) => c + 1);
        const updated = {
          ...proctoringMetaRef.current,
          [q.id]: { ...(proctoringMetaRef.current[q.id] ?? { tab_switch: false, face_anomaly: false }), tab_switch: true },
        };
        proctoringMetaRef.current = updated;
        setProctoringMeta(updated);
        setTabAlert(true);
        setTimeout(() => setTabAlert(false), 3000);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [q?.id]);

  const handleFaceAnomaly = useCallback((questionId: string) => {
    setFaceAnomalyCount((c) => c + 1);
    const updated = {
      ...proctoringMetaRef.current,
      [questionId]: { ...(proctoringMetaRef.current[questionId] ?? { tab_switch: false, face_anomaly: false }), face_anomaly: true },
    };
    proctoringMetaRef.current = updated;
    setProctoringMeta(updated);
  }, []);

  const rightCol = useMemo(() => {
    if (!q || q.kind !== "match") return [];
    const pairs = q.payload?.pairs || [];
    return pairs.map((p: any) => p.right).sort((a: string, b: string) => a.localeCompare(b));
  }, [q?.id]);

  if (sessionError) return (
    <div style={{ display: "grid", placeItems: "center", height: "100vh", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <p className="serif" style={{ fontSize: 22, margin: "0 0 8px" }}>Can't start this module</p>
        <p style={{ color: "var(--ink-2)", margin: "0 0 20px" }}>{sessionError}</p>
        <button className="btn ghost" onClick={onExit}>Go back</button>
      </div>
    </div>
  );

  if (!sessionId || isLoading || !module) return (
    <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
      <div className="dot-load"><i /><i /><i /></div>
    </div>
  );

  if (!q) return null;
  const last = idx === questions.length - 1;
  const progress = (idx + 1) / questions.length;

  const choices = q.payload?.choices || [];
  const pairs = q.payload?.pairs || [];
  const matchedRights = new Set(Object.values(matchPairs));
  const allMatched = q.kind === "match" && pairs.every((p: any) => matchPairs[p.left]);
  // fill with choices: selected word; fill without choices: typed input; else: selected option
  const canSubmit =
    (q.kind === "match" && allMatched) ||
    (q.kind === "fill" && choices.length > 0 && selected !== null) ||
    (q.kind === "fill" && choices.length === 0 && fillInput.trim().length > 0) ||
    ((q.kind === "choice" || q.kind === "listen_choice") && selected !== null);

  function resetQ() {
    setSelected(null);
    setFillInput("");
    setMatchPairs({});
    setMatchSel(null);
    qStartRef.current = Date.now();
  }

  function pickMatch(side: "L" | "R", value: string) {
    if (matchSel?.side === side && matchSel.value === value) { setMatchSel(null); return; }
    if (!matchSel) { setMatchSel({ side, value }); return; }
    if (matchSel.side === side) { setMatchSel({ side, value }); return; }
    const left = side === "L" ? value : matchSel.value;
    const right = side === "R" ? value : matchSel.value;
    setMatchPairs((m) => ({ ...m, [left]: right }));
    setMatchSel(null);
  }

  function buildSelection(): Record<string, string> {
    if (q.kind === "match") return { ...matchPairs };
    if (q.kind === "fill") return { choice: choices.length > 0 ? selected! : fillInput.trim() };
    return { choice: selected! };
  }

  async function submit() {
    if (!sessionId || !q) return;

    const selection = buildSelection();
    const timeMs = Date.now() - qStartRef.current;
    const meta = proctoringMetaRef.current[q.id] ?? { tab_switch: false, face_anomaly: false };
    const answerPayload = {
      question_id: q.id,
      selection,
      time_spent_ms: timeMs,
      tab_switch: meta.tab_switch,
      face_anomaly: meta.face_anomaly,
    };

    const correctId: string = q.payload?.answer || "";
    const chosenId = (q.kind === "choice" || q.kind === "fill" || q.kind === "listen_choice") ? selected : null;
    const isCorrect = !!(correctId && chosenId && chosenId === correctId);
    const correctLabel = choices.find((c: any) => c.id === correctId)?.label || correctId;

    const localAnswer = {
      questionId: q.id,
      selection,
      is_correct: isCorrect,
      prompt: q.prompt,
      correct_answer: correctLabel,
      choices: [...choices],
      explain: q.explain || null,
      chosen_id: chosenId,
      correct_id: correctId,
    };

    answersRef.current = [...answersRef.current, localAnswer];
    setAnswers([...answersRef.current]);

    // Show feedback immediately — API call happens in background
    setRevealData({
      correctId,
      chosenId,
      isCorrect,
      explain: q.explain || null,
      choices: [...choices],
      isLast: last,
      lastPayload: answerPayload,
    });

    if (!last) {
      const capturedQId = q.id;
      const p = api.sessions.answer(sessionId, answerPayload)
        .then((res) => {
          answersRef.current = answersRef.current.map((a) =>
            a.questionId === capturedQId ? { ...a, is_correct: res?.is_correct ?? isCorrect } : a
          );
          setAnswers([...answersRef.current]);
        })
        .catch(() => {});
      pendingRef.current.push(p);
    }
  }

  async function handleContinue() {
    const rd = revealData;
    if (!rd) return;
    setRevealData(null);

    if (rd.isLast) {
      setFinishing(true);
      try {
        await Promise.allSettled(pendingRef.current);
        pendingRef.current = [];

        const res = await api.sessions.answer(sessionId!, rd.lastPayload);
        const qId = rd.lastPayload.question_id;
        answersRef.current = answersRef.current.map((a) =>
          a.questionId === qId ? { ...a, is_correct: res?.is_correct ?? rd.isCorrect } : a
        );

        if (camRef.current) await camRef.current.stopAndUpload(sessionId!);
        const result = await api.sessions.finish(sessionId!, {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          tab_switch_count: tabSwitchCount,
          face_anomaly_count: faceAnomalyCount,
        });
        api.sessions.logEvent(sessionId!, "close").catch(() => {});
        onDone({
          ...result,
          session_id: sessionId,
          module_id: moduleId,
          answers: answersRef.current,
          timeMs: Date.now() - startRef.current,
          answers_revealed: (result as any).answers_revealed ?? true,
        });
      } catch {
        if (camRef.current) await camRef.current.stopAndUpload(sessionId!).catch(() => {});
        onDone({ score_pct: 0, session_id: sessionId, module_id: moduleId, answers: answersRef.current, timeMs: 0 });
      }
    } else {
      setIdx((i) => i + 1);
      resetQ();
    }
  }

  return (
    <div className="test-shell">
      <header className="test-head">
        <button className="icon-btn" onClick={() => setExitDialog(true)} aria-label="Exit"><XIcon size={16} /></button>
        <div className="head-progress"><ProgressBar value={progress} /></div>
        <div className="head-meta mono">
          <ClockIcon size={13} />
          <span>{formatTime(elapsed)}</span>
          <span style={{ color: "var(--ink-3)" }}>{idx + 1} / {questions.length}</span>
          {tabSwitchCount > 0 && (
            <span style={{ color: "oklch(0.6 0.15 25)", fontSize: 11 }}>⚠ {tabSwitchCount} tab switch{tabSwitchCount !== 1 ? "es" : ""}</span>
          )}
        </div>
      </header>

      {tabAlert && (
        <div style={{
          position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
          background: "oklch(0.3 0.1 25)", color: "white", padding: "10px 20px",
          borderRadius: 999, fontSize: 13, fontWeight: 600, zIndex: 100,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)", animation: "fadeUp 0.3s ease",
        }}>
          ⚠ Tab switch detected — this question has been flagged
        </div>
      )}

      <main className="test-main" key={q.id}>
        <section className="q-pane fade-up">
          <div className="q-kind-badge eyebrow">
            {q.kind === "fill" ? "Fill in the blank"
              : q.kind === "match" ? "Match pairs"
              : q.kind === "listen_choice" ? "Listening"
              : "Multiple choice"}
          </div>
          <h2 className="serif q-prompt">{q.prompt}</h2>

          {q.context && (
            <blockquote className="context">
              <span className="quote-mark serif-it">"</span>{q.context}
            </blockquote>
          )}

          {q.kind === "listen_choice" && module?.audio_blob && (
            <AudioPlayer src={`/api/v1/modules/${moduleId}/audio`} />
          )}

          {q.kind === "fill" && q.sentence && (
            <FillSentence
              sentence={q.sentence}
              pick={choices.find((c: any) => c.id === selected) || null}
            />
          )}

          {revealData ? (
            <>
              <ul className="choices">
                {revealData.choices.map((c: any, i: number) => (
                  <li key={c.id} className="choice"
                    data-correct={c.id === revealData.correctId ? true : undefined}
                    data-wrong={c.id === revealData.chosenId && c.id !== revealData.correctId ? true : undefined}
                    style={{ pointerEvents: "none", animationDelay: `${i * 30}ms` }}>
                    <span className="choice-key mono">
                      {c.id === revealData.correctId ? "✓" : c.id === revealData.chosenId ? "✗" : String.fromCharCode(65 + i)}
                    </span>
                    <span className="choice-label">{c.label}</span>
                  </li>
                ))}
              </ul>
              {revealData.explain && (
                <div className="explain-box">
                  <p className="eyebrow" style={{ marginBottom: 8, color: "var(--ink-3)" }}>Penjelasan / Explanation</p>
                  <p className="explain-text">{revealData.explain}</p>
                </div>
              )}
              <div className="q-footer">
                <button className="btn accent lg q-submit" onClick={handleContinue} disabled={finishing}>
                  {revealData.isLast ? (finishing ? "Finalizing…" : "See my score") : "Continue"} <ArrowRightIcon size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              {(q.kind === "choice" || q.kind === "listen_choice" || q.kind === "fill") && (
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

              {q.kind === "fill" && choices.length === 0 && (
                <input
                  className="fill-input"
                  placeholder="Type your answer…"
                  value={fillInput}
                  onChange={(e) => setFillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
                  autoFocus
                />
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
            </>
          )}
        </section>

        <aside className="camera-pane fade-up" style={{ animationDelay: "100ms" }}>
          <CameraCapture
            ref={camRef}
            sessionId={sessionId}
            currentQuestionId={q.id}
            onFaceAnomaly={handleFaceAnomaly}
          />
        </aside>
      </main>

      {exitDialog && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200,
          display: "grid", placeItems: "center", padding: 24,
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-xl)",
            padding: "32px 28px", maxWidth: 400, width: "100%", boxShadow: "var(--shadow-md)",
          }}>
            <p className="serif" style={{ margin: "0 0 8px", fontSize: 22, letterSpacing: "-0.015em" }}>Exit this session?</p>
            <p style={{ margin: "0 0 24px", color: "var(--ink-2)", fontSize: 14, lineHeight: 1.5 }}>
              Your progress ({answers.length} of {questions.length} answered) will be saved to your history.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setExitDialog(false)}>Keep going</button>
              <button className="btn" style={{ background: "oklch(0.92 0.04 25)", color: "oklch(0.35 0.1 25)", border: "1px solid oklch(0.82 0.06 25)" }}
                onClick={async () => {
                  setExitDialog(false);
                  if (sessionId) {
                    try {
                      await Promise.allSettled(pendingRef.current);
                      if (camRef.current) await camRef.current.stopAndUpload(sessionId).catch(() => {});
                      await api.sessions.finish(sessionId, {
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        tab_switch_count: tabSwitchCount,
                        face_anomaly_count: faceAnomalyCount,
                      });
                    } catch {}
                    api.sessions.logEvent(sessionId, "interrupt", {
                      question_idx: idx,
                      answers_submitted: answers.length,
                    }).catch(() => {});
                  }
                  onExit();
                }}>
                Exit & save
              </button>
            </div>
          </div>
        </div>
      )}

      {finishing && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200,
          display: "grid", placeItems: "center",
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-xl)",
            padding: "40px 48px", textAlign: "center", boxShadow: "var(--shadow-md)",
          }}>
            <div className="dot-load"><i /><i /><i /></div>
            <p className="serif" style={{ margin: "18px 0 4px", fontSize: 20, letterSpacing: "-0.015em" }}>Finalizing your score…</p>
            <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13 }}>Just a moment</p>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const token = localStorage.getItem("access_token");
  const srcWithToken = token ? `${src}?token=${token}` : src;

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
    setPlaying(!playing);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--accent-soft)", border: "1.5px solid color-mix(in oklch,var(--accent),white 50%)", borderRadius: "var(--r-md)", marginBottom: 20 }}>
      <audio
        ref={audioRef}
        src={srcWithToken}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a && a.duration) setProgress(a.currentTime / a.duration);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />
      <button
        onClick={toggle}
        style={{
          width: 38, height: 38, borderRadius: "50%", background: "var(--accent)", color: "white",
          border: "none", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0,
          fontSize: 14,
        }}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ height: 4, background: "color-mix(in oklch,var(--accent),white 60%)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--accent)", borderRadius: 999, transition: "width 0.2s linear" }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--accent-ink)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
          {duration > 0 ? `${formatTime(progress * duration * 1000)} / ${formatTime(duration * 1000)}` : "Loading audio…"}
        </div>
      </div>
      <span className="mono" style={{ fontSize: 10, color: "var(--accent-ink)" }}>AUDIO</span>
    </div>
  );
}

// ─── FillSentence ─────────────────────────────────────────────────────────────

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

// ─── CameraCapture ────────────────────────────────────────────────────────────

const CameraCapture = forwardRef<
  { stopAndUpload: (sessionId: string) => Promise<void>; onFaceAnomaly: (questionId: string) => void; setSessionId: (id: string) => void },
  { sessionId: string | null; currentQuestionId: string; onFaceAnomaly: (questionId: string) => void }
>(function CameraCapture({ sessionId: sessionIdProp, currentQuestionId, onFaceAnomaly }, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<{ blob: Blob; index: number }[]>([]);
  const chunkCounterRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const streamRef = useRef<MediaStream | null>(null);
  const currentQIdRef = useRef(currentQuestionId);
  useEffect(() => { currentQIdRef.current = currentQuestionId; }, [currentQuestionId]);

  // When the sessionId prop arrives (CameraCapture mounts after session is created),
  // register it and flush any chunks buffered during the camera warm-up window
  useEffect(() => {
    if (!sessionIdProp) return;
    sessionIdRef.current = sessionIdProp;
    const pending = [...chunksRef.current];
    chunksRef.current = [];
    for (const { blob, index } of pending) {
      const b = blob; const i = index;
      uploadQueueRef.current = uploadQueueRef.current.then(() => uploadChunk(b, sessionIdProp, i) as Promise<void>);
    }
  }, [sessionIdProp]);

  // Callback ref: sets srcObject the instant the <video> element mounts
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  const uploadChunk = (blob: Blob, sid: string, index: number, keepalive = false) => {
    const fd = new FormData();
    fd.append("chunk", blob, "recording.webm");
    fd.append("chunk_index", String(index));
    return fetch(`/api/v1/sessions/${sid}/recording-chunk`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      body: fd,
      keepalive,
    }).catch(() => {});
  };

  // On tab hide: force the encoder to emit any buffered data so it can be uploaded
  // with keepalive=true (completes even if the page is closing)
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== "hidden") return;
      const sid = sessionIdRef.current;
      const recorder = recorderRef.current;
      if (!sid || !recorder || recorder.state !== "recording") return;
      // Override ondataavailable temporarily to use keepalive for this emergency flush
      const original = recorder.ondataavailable;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          const idx = chunkCounterRef.current++;
          uploadQueueRef.current = uploadQueueRef.current.then(
            () => uploadChunk(e.data, sid, idx, true) as Promise<void>
          );
        }
        recorder.ondataavailable = original;
      };
      recorder.requestData();
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, []);

  type CamStatus = "loading" | "active" | "blocked" | "insecure" | "unavailable" | "uploading" | "done";
  const [status, setStatus] = useState<CamStatus>("loading");
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const [gazeOk, setGazeOk] = useState<boolean | null>(null);
  const [faceDetAvail, setFaceDetAvail] = useState<boolean | null>(null);
  const [faceAlert, setFaceAlert] = useState(false);
  const [consent, setConsent] = useState<"pending" | "granted" | "declined">(
    () => (localStorage.getItem("cam_consent") as any) || "pending"
  );
  const [blockReason, setBlockReason] = useState<"browser" | "os" | "">("");
  const [retryCount, setRetryCount] = useState(0);

  useImperativeHandle(ref, () => ({
    setSessionId: (id: string) => {
      sessionIdRef.current = id;
      // Flush any chunks buffered before sessionId was known
      for (const { blob, index } of chunksRef.current) {
        const b = blob; const i = index;
        uploadQueueRef.current = uploadQueueRef.current.then(() => uploadChunk(b, id, i) as Promise<void>);
      }
      chunksRef.current = [];
    },
    stopAndUpload: async (sessionId: string) => {
      // Ensure sessionId is registered — guards against the case where the prop
      // effect hadn't fired yet (e.g. CameraCapture was just mounting)
      if (!sessionIdRef.current) {
        sessionIdRef.current = sessionId;
      }
      // Flush any chunks buffered before sessionId was known
      const pending = [...chunksRef.current];
      chunksRef.current = [];
      for (const { blob, index } of pending) {
        const b = blob; const i = index;
        uploadQueueRef.current = uploadQueueRef.current.then(() => uploadChunk(b, sessionId, i) as Promise<void>);
      }

      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        await uploadQueueRef.current;
        setStatus("done");
        return;
      }
      setStatus("uploading");
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
      await uploadQueueRef.current;
      setStatus("done");
    },
    onFaceAnomaly,
  }));

  useEffect(() => {
    if (consent !== "granted") return;
    if (!window.isSecureContext || !navigator.mediaDevices) {
      setStatus("insecure");
      return;
    }

    let faceActive = true;
    let rAFActive = true;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setStatus("active");

        // Record from a fixed 480×360 canvas so output resolution and frame rate
        // are always exact — getUserMedia frame-rate constraints are advisory-only
        // in Chrome and are regularly ignored.
        const recCanvas = document.createElement("canvas");
        recCanvas.width = 480;
        recCanvas.height = 360;
        const recCtx = recCanvas.getContext("2d")!;
        const drawToCanvas = () => {
          if (!rAFActive) return;
          if (videoRef.current && videoRef.current.readyState >= 2) {
            recCtx.drawImage(videoRef.current, 0, 0, 480, 360);
          }
          requestAnimationFrame(drawToCanvas);
        };
        requestAnimationFrame(drawToCanvas);

        const canvasStream = recCanvas.captureStream(15); // exactly 15 fps
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8" : "video/webm";
        const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 400_000 });
        recorderRef.current = recorder;
        chunkCounterRef.current = 0;
        recorder.ondataavailable = (e) => {
          if (e.data.size <= 0) return;
          const index = chunkCounterRef.current++;
          if (sessionIdRef.current) {
            const sid = sessionIdRef.current;
            uploadQueueRef.current = uploadQueueRef.current.then(() => uploadChunk(e.data, sid, index) as Promise<void>);
          } else {
            chunksRef.current.push({ blob: e.data, index });
          }
        };
        recorder.start(3000);

        // Model is pre-warmed by the module-level singleton — getFaceApi() resolves
        // immediately if weights are already loaded (no 3-second delay after consent).
        // CPU backend feeds a 160×120 thumbnail (6× fewer pixels) for fast inference.
        getFaceApi().then(async (faceapi) => {
          setFaceDetAvail(true);
          const thumbCanvas = document.createElement("canvas");
          thumbCanvas.width = 160;
          thumbCanvas.height = 120;
          const thumbCtx = thumbCanvas.getContext("2d")!;
          while (faceActive) {
            await new Promise<void>((r) => setTimeout(r, 5000));
            if (!faceActive) break;
            if (!videoRef.current || videoRef.current.readyState < 2) continue;
            try {
              thumbCtx.drawImage(videoRef.current, 0, 0, 160, 120);
              const results = await faceapi
                .detectAllFaces(thumbCanvas, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
                .run();
              if (!faceActive) break;
              const count = results.length;
              setFaceCount(count);

              let anomaly = count !== 1;
              let gazeGood = count === 1;

              if (count === 1) {
                const { x, y, width, height } = results[0].box;
                const cx = (x + width / 2) / 160;
                const cy = (y + height / 2) / 120;
                if (cx < 0.2 || cx > 0.8 || cy < 0.1 || cy > 0.9) {
                  anomaly = true;
                  gazeGood = false;
                }
              }

              setGazeOk(gazeGood);
              if (anomaly) {
                onFaceAnomaly(currentQIdRef.current);
                setFaceAlert(true);
                setTimeout(() => setFaceAlert(false), 3000);
              }
            } catch {}
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
      faceActive = false;
      rAFActive = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [consent, retryCount]);

  if (consent === "pending") {
    return (
      <div className="cam-card">
        <div className="cam-head"><span className="eyebrow">Camera · proctoring</span></div>
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

  if (consent === "declined") {
    return (
      <div className="cam-card">
        <div className="cam-head"><span className="eyebrow">Camera · proctoring</span><CamBadge label="OFF" color="neutral" /></div>
        <div className="cam-empty" style={{ padding: "20px 16px", gap: 10 }}>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13, textAlign: "center" }}>Recording declined. Your session continues without a recording.</p>
          <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => { localStorage.removeItem("cam_consent"); setConsent("pending"); setStatus("loading"); }}>Change mind</button>
        </div>
        <CamStyle />
      </div>
    );
  }

  if (status === "insecure") {
    return (
      <div className="cam-card">
        <div className="cam-head"><span className="eyebrow">Camera · proctoring</span><CamBadge label="HTTPS required" color="warn" /></div>
        <div className="cam-empty" style={{ padding: "20px 16px", gap: 10 }}>
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 13, textAlign: "center", lineHeight: 1.5 }}>
            Camera requires a secure connection. Open the app via <strong>localhost:5173</strong> or enable HTTPS.
          </p>
        </div>
        <CamStyle />
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className="cam-card">
        <div className="cam-head"><span className="eyebrow">Camera · proctoring</span><CamBadge label="BLOCKED" color="warn" /></div>
        <div className="cam-empty" style={{ padding: "20px 16px", gap: 10 }}>
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 13, textAlign: "center", lineHeight: 1.5 }}>
            {blockReason === "browser"
              ? "Camera blocked by browser. Click the camera icon in the address bar to allow access, then refresh."
              : "Camera could not start. Check your system camera permissions."}
          </p>
          <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => { localStorage.removeItem("cam_consent"); setConsent("pending"); setStatus("loading"); setBlockReason(""); }}>Try again</button>
        </div>
        <CamStyle />
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="cam-card">
        <div className="cam-head"><span className="eyebrow">Camera · proctoring</span><CamBadge label="NO CAMERA" color="neutral" /></div>
        <div className="cam-empty" style={{ padding: "20px 16px", gap: 10 }}>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13, textAlign: "center", lineHeight: 1.5 }}>
            No camera found. Check that your camera is connected and that the browser has camera permission.
          </p>
          <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => { setStatus("loading"); setRetryCount((c) => c + 1); }}>Retry</button>
        </div>
        <CamStyle />
      </div>
    );
  }

  return (
    <div className="cam-card">
      <div className="cam-head">
        <span className="eyebrow">Camera · proctoring</span>
        <CamBadge
          label={status === "loading" ? "CONNECTING" : status === "uploading" ? "SAVING" : status === "done" ? "SAVED" : "● REC"}
          color={status === "active" ? "live" : "neutral"}
        />
      </div>

      {status === "loading" && <div className="cam-empty"><div className="dot-load"><i /><i /><i /></div></div>}

      {(status === "active" || status === "uploading" || status === "done") && (
        <div style={{ position: "relative", borderRadius: "var(--r-lg)", overflow: "hidden", background: "#000", lineHeight: 0 }}>
          <video ref={videoCallbackRef} autoPlay muted playsInline style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "cover" }} />
          {faceAlert && (
            <div style={{ position: "absolute", top: 8, left: 8, right: 8, background: "rgba(220,30,30,0.85)", padding: "5px 10px", borderRadius: 8, fontSize: 11, color: "white", textAlign: "center", fontWeight: 600 }}>
              ⚠ {faceCount === 0 ? "No face detected" : faceCount && faceCount > 1 ? "Multiple faces detected" : "Please look at the screen"}
            </div>
          )}
          {faceDetAvail === true && faceCount !== null && (
            <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.65)", padding: "4px 10px", borderRadius: 999, fontSize: 11, backdropFilter: "blur(4px)", color: faceCount === 1 && gazeOk ? "#4ade80" : "#f87171" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: faceCount === 1 && gazeOk ? "#4ade80" : "#f87171", display: "inline-block", flexShrink: 0 }} />
              {faceCount === 0 ? "No face detected"
                : faceCount > 1 ? `${faceCount} faces`
                : gazeOk ? "Face · looking at screen"
                : "Face · looking away"}
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
  return null;
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
