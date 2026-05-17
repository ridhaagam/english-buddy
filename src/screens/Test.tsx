// src/screens/Test.tsx — question on left, camera placeholder on right
const { useState: useState_T, useEffect: useEffect_T, useRef: useRef_T, useMemo: useMemo_T } = React;

type TestResult = {
  total: number;
  correct: number;
  timeMs: number;
  answers: { questionId: string; correct: boolean; selection: any }[];
};

type TestProps = {
  onExit: () => void;
  onDone: (r: TestResult) => void;
};

function TestScreen({ onExit, onDone }: TestProps) {
  const QUESTIONS = (window as any).LUMEN_DATA.QUESTIONS as any[];
  const [idx, setIdx] = useState_T(0);
  const [selected, setSelected] = useState_T<string | null>(null);
  const [answers, setAnswers] = useState_T<{ questionId: string; correct: boolean; selection: any }[]>([]);
  const [matchPairs, setMatchPairs] = useState_T<Record<string, string>>({});
  const [matchSel, setMatchSel] = useState_T<{ side: "L" | "R"; value: string } | null>(null);
  const [elapsed, setElapsed] = useState_T(0);
  const startRef = useRef_T<number>(Date.now());

  const q = QUESTIONS[idx];
  const last = idx === QUESTIONS.length - 1;
  const progress = (idx + 1) / QUESTIONS.length;

  // timer
  useEffect_T(() => {
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 500);
    return () => clearInterval(t);
  }, []);

  function resetQ() {
    setSelected(null);
    setMatchPairs({});
    setMatchSel(null);
  }

  function submit() {
    let correct = false;
    let selection: any;
    if (q.kind === "match") {
      const total = q.pairs.length;
      const got = q.pairs.filter((p: any) => matchPairs[p.left] === p.right).length;
      correct = got === total;
      selection = { ...matchPairs };
    } else {
      correct = selected === q.answer;
      selection = selected;
    }
    const nextAnswers = [...answers, { questionId: q.id, correct, selection }];
    setAnswers(nextAnswers);

    if (last) {
      onDone({
        total: QUESTIONS.length,
        correct: nextAnswers.filter((a) => a.correct).length,
        timeMs: Date.now() - startRef.current,
        answers: nextAnswers,
      });
      return;
    }
    setIdx((i) => i + 1);
    resetQ();
  }

  // match interaction
  function pickMatch(side: "L" | "R", value: string) {
    // toggle off
    if (matchSel && matchSel.side === side && matchSel.value === value) {
      setMatchSel(null);
      return;
    }
    if (!matchSel) {
      setMatchSel({ side, value });
      return;
    }
    if (matchSel.side === side) {
      setMatchSel({ side, value });
      return;
    }
    const left = side === "L" ? value : matchSel.value;
    const right = side === "R" ? value : matchSel.value;
    setMatchPairs((m) => ({ ...m, [left]: right }));
    setMatchSel(null);
  }
  function unmatchLeft(left: string) {
    setMatchPairs((m) => {
      const copy = { ...m };
      delete copy[left];
      return copy;
    });
  }
  const allMatched = q.kind === "match" && q.pairs.every((p: any) => matchPairs[p.left]);

  // for match: stable right column order per question
  const rightCol = useMemo_T(() => {
    if (q.kind !== "match") return [];
    const list = q.pairs.map((p: any) => p.right);
    return [...list].sort((a: string, b: string) => a.localeCompare(b));
  }, [q.id]);
  const matchedRights = new Set(Object.values(matchPairs));

  const canSubmit =
    (q.kind === "match" && allMatched) || (q.kind !== "match" && selected !== null);

  return (
    <div className="test-shell">
      {/* sticky header */}
      <header className="test-head">
        <button className="icon-btn" onClick={onExit} aria-label="Exit practice">
          <XIcon size={16} />
        </button>
        <div className="head-progress">
          <ProgressBar value={progress} />
        </div>
        <div className="head-meta mono">
          <ClockIcon size={13} />
          <span>{formatTime(elapsed)}</span>
          <span style={{ color: "var(--ink-3)" }}>
            {idx + 1} / {QUESTIONS.length}
          </span>
        </div>
      </header>

      <main className="test-main" key={q.id}>
        {/* LEFT — question */}
        <section className="q-pane fade-up">
          <p className="eyebrow">{q.category}</p>

          <h2 className="serif" style={{ fontSize: 28, lineHeight: 1.25, margin: "10px 0 18px", letterSpacing: "-0.015em" }}>
            {q.prompt}
          </h2>

          {q.context && (
            <blockquote className="context">
              <span className="quote-mark serif-it">"</span>
              {q.context}
            </blockquote>
          )}

          {q.kind === "fill" && (
            <FillSentence sentence={q.sentence} pick={(q.choices.find((c: any) => c.id === selected) || null) as any} />
          )}

          {(q.kind === "choice" || q.kind === "fill") && (
            <ul className="choices">
              {q.choices.map((c: any, i: number) => {
                const isSel = selected === c.id;
                return (
                  <li
                    key={c.id}
                    className="choice"
                    data-sel={isSel || undefined}
                    style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => setSelected(c.id)}
                  >
                    <span className="choice-key mono">{String.fromCharCode(65 + i)}</span>
                    <span className="choice-label">{c.label}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {q.kind === "match" && (
            <div className="match-grid">
              <ul className="match-col">
                <span className="eyebrow">English</span>
                {q.pairs.map((p: any) => {
                  const matched = matchPairs[p.left];
                  const isSel = matchSel?.side === "L" && matchSel.value === p.left;
                  return (
                    <li
                      key={p.left}
                      className="match-cell"
                      data-sel={isSel || undefined}
                      data-matched={!!matched || undefined}
                      onClick={() => (matched ? unmatchLeft(p.left) : pickMatch("L", p.left))}
                    >
                      <span className="serif" style={{ fontSize: 17 }}>
                        {p.left}
                      </span>
                      {matched && (
                        <span className="match-tag mono">
                          → {matched}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <ul className="match-col">
                <span className="eyebrow">Indonesian</span>
                {rightCol.map((r) => {
                  const used = matchedRights.has(r);
                  const isSel = matchSel?.side === "R" && matchSel.value === r;
                  return (
                    <li
                      key={r}
                      className="match-cell right"
                      data-sel={isSel || undefined}
                      data-used={used || undefined}
                      onClick={() => !used && pickMatch("R", r)}
                    >
                      {r}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* footer */}
          <div className="q-footer">
            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
              <button className="btn ghost" onClick={onExit}>
                Save & exit
              </button>
              <button className="btn accent lg" disabled={!canSubmit} onClick={submit}>
                {last ? "Submit & see score" : "Continue"}
                <ArrowRightIcon size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT — camera placeholder pane */}
        <aside className="camera-pane fade-up" style={{ animationDelay: "120ms" }}>
          <CameraPanel question={q} />
        </aside>
      </main>

      <style>{`
        .test-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
        }
        .test-head {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 18px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--line);
          background: color-mix(in oklch, var(--bg) 92%, transparent);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .icon-btn {
          width: 36px; height: 36px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: var(--surface);
          display: grid; place-items: center;
          cursor: pointer;
          color: var(--ink-2);
          transition: background 0.15s, color 0.15s, transform 0.15s;
        }
        .icon-btn:hover { background: var(--bg-2); color: var(--ink); }
        .head-progress { width: 100%; max-width: 720px; margin: 0 auto; }
        .head-meta {
          display: flex; align-items: center; gap: 10px;
          font-size: 12px;
          color: var(--ink-2);
        }
        .test-main {
          flex: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
          gap: 24px;
          padding: 28px;
          max-width: 1280px;
          width: 100%;
          margin: 0 auto;
        }

        /* Question pane */
        .q-pane {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          padding: 32px 32px 24px;
          display: flex; flex-direction: column;
          box-shadow: var(--shadow-sm);
        }
        .context {
          margin: 0 0 20px;
          padding: 16px 20px;
          border-left: 3px solid var(--accent);
          background: var(--accent-soft);
          border-radius: 0 var(--r-md) var(--r-md) 0;
          font-family: var(--font-display);
          font-style: italic;
          font-size: 18px;
          color: var(--ink);
          position: relative;
        }
        .quote-mark { color: var(--accent); margin-right: 6px; font-size: 24px; line-height: 0; }

        .choices {
          list-style: none;
          padding: 0;
          margin: 6px 0 22px;
          display: grid;
          gap: 10px;
        }
        .choice {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px;
          background: var(--surface);
          border: 1.5px solid var(--line);
          border-radius: var(--r-md);
          cursor: pointer;
          transition: border-color 0.18s, background 0.18s, transform 0.12s;
          animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both;
          position: relative;
        }
        .choice:hover { border-color: var(--ink-3); background: var(--bg-2); }
        .choice[data-sel] {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .choice[data-correct] {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .choice[data-wrong] {
          border-color: var(--rose);
          background: var(--rose-soft);
        }
        .choice-key {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: var(--bg-2);
          color: var(--ink-2);
          display: grid; place-items: center;
          font-size: 12px;
          flex-shrink: 0;
          border: 1px solid var(--line);
        }
        .choice[data-sel] .choice-key,
        .choice[data-correct] .choice-key {
          background: var(--accent); color: white; border-color: transparent;
        }
        .choice[data-wrong] .choice-key { background: var(--rose); color: white; border-color: transparent; }
        .choice-label { flex: 1; font-weight: 500; font-size: 15px; }
        .choice-icon {
          margin-left: auto;
          width: 22px; height: 22px;
          border-radius: 999px;
          background: var(--accent); color: white;
          display: grid; place-items: center;
        }
        .choice-icon.wrong { background: var(--rose); }

        /* match */
        .match-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin: 6px 0 22px;
        }
        .match-col {
          list-style: none;
          padding: 0; margin: 0;
          display: grid;
          gap: 8px;
        }
        .match-col > .eyebrow { padding: 0 4px 4px; }
        .match-cell {
          padding: 12px 14px;
          background: var(--surface);
          border: 1.5px solid var(--line);
          border-radius: var(--r-md);
          cursor: pointer;
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
          transition: border-color 0.18s, background 0.18s;
          font-size: 15px;
        }
        .match-cell.right { font-family: var(--font-display); font-style: italic; }
        .match-cell:hover { border-color: var(--ink-3); }
        .match-cell[data-sel]     { border-color: var(--accent); background: var(--accent-soft); }
        .match-cell[data-matched] { border-color: color-mix(in oklch, var(--accent), white 50%); background: color-mix(in oklch, var(--accent-soft), white 40%); }
        .match-cell[data-used]    { opacity: 0.4; cursor: default; }
        .match-cell[data-correct] { border-color: var(--accent); background: var(--accent-soft); }
        .match-cell[data-wrong]   { border-color: var(--rose); background: var(--rose-soft); }
        .match-tag { font-size: 11px; color: var(--accent-ink); }

        .q-footer { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--line-2); }

        .feedback {
          padding: 16px 18px;
          border-radius: var(--r-md);
          background: var(--accent-soft);
          display: grid; gap: 14px;
        }
        .feedback.bad { background: var(--rose-soft); }
        .feedback-row {
          display: flex; align-items: flex-start; gap: 14px;
        }
        .feedback-row p {
          font-family: var(--font-display);
          font-size: 15.5px;
          line-height: 1.5;
          color: var(--ink);
        }
        .feedback-pill {
          flex-shrink: 0;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 12px;
          background: var(--accent); color: white;
        }
        .feedback.bad .feedback-pill { background: var(--rose); }
        .feedback .btn { justify-self: end; }

        /* responsive */
        @media (max-width: 980px) {
          .test-main {
            grid-template-columns: 1fr;
            padding: 18px;
          }
          .q-pane { padding: 24px 22px; }
        }
        @media (max-width: 520px) {
          .test-head { padding: 12px 14px; gap: 10px; }
          .q-pane { padding: 20px 18px; border-radius: var(--r-lg); }
          .match-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function FillSentence({ sentence, pick }: { sentence: string; pick: { id: string; label: string } | null }) {
  const parts = sentence.split("__");
  return (
    <div
      style={{
        margin: "0 0 22px",
        padding: "20px 22px",
        background: "var(--bg-2)",
        borderRadius: "var(--r-md)",
        border: "1px dashed var(--line)",
        fontSize: 20,
        lineHeight: 1.5,
        fontFamily: "var(--font-display)",
        color: "var(--ink)",
      }}
    >
      {parts[0]}
      <span
        style={{
          display: "inline-block",
          minWidth: 110,
          padding: "2px 12px",
          margin: "0 4px",
          borderBottom: pick ? "2px solid var(--accent)" : "2px dashed var(--ink-3)",
          textAlign: "center",
          color: pick ? "var(--accent-ink)" : "var(--ink-3)",
          fontStyle: pick ? "italic" : "normal",
          fontWeight: 600,
          transition: "color 0.2s, border-color 0.2s",
        }}
      >
        {pick ? pick.label : "  ?  "}
      </span>
      {parts[1]}
    </div>
  );
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// ---- Camera Placeholder ----------------------------------------------------
function EyeMark({
  cx, cy, open, gx, gy, label,
}: { cx: number; cy: number; open: boolean; gx: number; gy: number; label: string }) {
  const irisX = cx + gx;
  const irisY = cy + gy;
  return (
    <g>
      {open ? (
        <>
          {/* eye outline (lemon shape) */}
          <path
            d={`M ${cx - 2.4} ${cy} Q ${cx} ${cy - 1.6}, ${cx + 2.4} ${cy} Q ${cx} ${cy + 1.6}, ${cx - 2.4} ${cy} Z`}
            fill="oklch(0.95 0.04 65 / 0.18)"
            stroke="oklch(0.95 0.04 65)"
            strokeWidth="0.35"
          />
          <circle cx={irisX} cy={irisY} r="0.9" fill="oklch(0.7 0.14 145)" />
          <circle cx={irisX} cy={irisY} r="0.35" fill="oklch(0.18 0.01 85)" />
        </>
      ) : (
        // closed eye = a small dash
        <line
          x1={cx - 2.2}
          x2={cx + 2.2}
          y1={cy}
          y2={cy}
          stroke="oklch(0.95 0.04 65)"
          strokeWidth="0.5"
        />
      )}
      <text
        x={cx}
        y={cy - 2.5}
        fill="oklch(0.95 0.04 65)"
        fontSize="1.5"
        fontFamily="JetBrains Mono, monospace"
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

function CameraPanel({ question }: { question: any }) {
  const [armed, setArmed] = useState_T(false);
  const [tick, setTick] = useState_T(0);
  const [tabBlurs, setTabBlurs] = useState_T(0);
  const [lastEvent, setLastEvent] = useState_T<{ kind: string; sev: "low" | "med" | "high"; t: number } | null>(null);

  useEffect_T(() => {
    if (!armed) return;
    const t = setInterval(() => setTick((x) => (x + 1) % 1000), 80);
    return () => clearInterval(t);
  }, [armed]);

  // Mock proctoring: count tab/window blur events
  useEffect_T(() => {
    function onVis() {
      if (document.hidden) {
        setTabBlurs((n) => n + 1);
        setLastEvent({ kind: "tab_blur", sev: "high", t: Date.now() });
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Drift the simulated face center
  const faceX = 50 + Math.sin(tick / 14) * 5;
  const faceY = 46 + Math.cos(tick / 19) * 3;
  const blink = (tick % 30) > 27; // brief blink every ~2.4s
  // gaze drift (-1..1)
  const gx = Math.sin(tick / 9) * 0.3;
  const gy = Math.cos(tick / 13) * 0.2;

  // integrity score (mock): drops with tab blurs
  const integrity = Math.max(20, 100 - tabBlurs * 22);
  const intState: "ok" | "warn" | "bad" =
    integrity >= 85 ? "ok" : integrity >= 60 ? "warn" : "bad";

  return (
    <div className="cam-card">
      <div className="cam-head">
        <span className="eyebrow">Camera assist · proctoring</span>
        <span
          className="mono"
          style={{
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 999,
            background: armed ? "var(--rose-soft)" : "var(--bg-2)",
            color: armed ? "var(--rose)" : "var(--ink-3)",
            border: "1px solid var(--line)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            className="rec-dot"
            style={{
              width: 6, height: 6, borderRadius: 999,
              background: armed ? "var(--rose)" : "var(--ink-3)",
              animation: armed ? "pulse-ring 1.6s ease-out infinite" : "none",
            }}
          />
          {armed ? "LIVE" : "STANDBY"}
        </span>
      </div>

      <div className="cam-stage">
        {!armed && (
          <div className="cam-empty">
            <div className="cam-empty-glyph">
              <CameraIcon size={28} />
            </div>
            <p className="serif" style={{ margin: "12px 0 6px", fontSize: 19, letterSpacing: "-0.01em" }}>
              Face & eye detection
            </p>
            <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13, maxWidth: 240, textAlign: "center" }}>
              Lumen will track face presence, eye openness and gaze direction during the test.
              Plug your detector into <span className="mono">window.LumenCamera</span>.
            </p>
            <button className="btn ghost" style={{ marginTop: 16 }} onClick={() => setArmed(true)}>
              <CameraIcon size={14} /> Enable preview
            </button>
          </div>
        )}

        {armed && (
          <>
            <div className="cam-feed" aria-label="camera preview placeholder">
              <div className="cam-grid" />
              <div className="cam-scan" />
              {["tl", "tr", "bl", "br"].map((c) => (
                <i key={c} className={`tick ${c}`} />
              ))}

              {/* SVG overlay with face oval + eye landmarks */}
              <svg
                className="cam-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {/* face oval */}
                <ellipse
                  cx={faceX}
                  cy={faceY}
                  rx="16"
                  ry="21"
                  fill="none"
                  stroke="oklch(0.85 0.13 65)"
                  strokeWidth="0.5"
                  strokeDasharray="1 1"
                />
                {/* face landmark dots (jawline + nose) */}
                {Array.from({ length: 9 }).map((_, i) => {
                  const a = (i / 8) * Math.PI + Math.PI / 2;
                  return (
                    <circle
                      key={"jaw" + i}
                      cx={faceX + Math.cos(a) * 15.5}
                      cy={faceY + Math.sin(a) * 20.5}
                      r="0.4"
                      fill="oklch(0.85 0.13 65)"
                    />
                  );
                })}
                {/* nose */}
                <circle cx={faceX} cy={faceY + 2} r="0.5" fill="oklch(0.85 0.13 65)" />
                <circle cx={faceX} cy={faceY + 5} r="0.5" fill="oklch(0.85 0.13 65)" />

                {/* LEFT eye */}
                <EyeMark
                  cx={faceX - 5}
                  cy={faceY - 4}
                  open={!blink}
                  gx={gx}
                  gy={gy}
                  label="L"
                />
                {/* RIGHT eye */}
                <EyeMark
                  cx={faceX + 5}
                  cy={faceY - 4}
                  open={!blink}
                  gx={gx}
                  gy={gy}
                  label="R"
                />

                {/* mouth */}
                <path
                  d={`M ${faceX - 4} ${faceY + 9} Q ${faceX} ${faceY + 10.5} ${faceX + 4} ${faceY + 9}`}
                  fill="none"
                  stroke="oklch(0.85 0.13 65)"
                  strokeWidth="0.5"
                />
              </svg>

              {/* status chip on feed */}
              <div className="feed-chip mono">
                face 0.{(92 + (tick % 7)).toString().padStart(2, "0")} · gaze on
                {blink ? " · blink" : ""}
              </div>

              <div className="cam-watermark mono">CAM://device-0 · 30 fps</div>
            </div>

            {/* integrity row */}
            <div className="integrity" data-state={intState}>
              <div className="int-meta">
                <span className="eyebrow">Integrity</span>
                <span className="serif" style={{ fontSize: 20 }}>
                  {integrity}<span style={{ color: "var(--ink-3)", fontSize: 13 }}>/100</span>
                </span>
              </div>
              <ul className="int-list">
                <li data-ok>
                  <CheckIcon size={11} />
                  Face visible
                </li>
                <li data-ok={!blink || undefined}>
                  <CheckIcon size={11} />
                  Both eyes open
                </li>
                <li data-ok>
                  <CheckIcon size={11} />
                  Gaze on screen
                </li>
                <li data-warn={tabBlurs > 0 || undefined}>
                  <XIcon size={11} />
                  Tab focus · {tabBlurs} blur{tabBlurs === 1 ? "" : "s"}
                </li>
              </ul>
            </div>

            {lastEvent && Date.now() - lastEvent.t < 6000 && (
              <div className="proct-toast scale-in" data-sev={lastEvent.sev}>
                <strong>Reported to admin · {lastEvent.kind}</strong>
                <span>Logged at {new Date(lastEvent.t).toLocaleTimeString()}.</span>
              </div>
            )}

            <button
              className="btn ghost"
              style={{ alignSelf: "stretch", marginTop: 6 }}
              onClick={() => setArmed(false)}
            >
              Disable preview
            </button>
          </>
        )}
      </div>

      <div className="cam-context">
        <span className="eyebrow">Question context for model</span>
        <div className="ctx-rows mono">
          <div>
            <span className="k">id</span>
            <span className="v">{question.id}</span>
          </div>
          <div>
            <span className="k">kind</span>
            <span className="v">{question.kind}</span>
          </div>
          <div>
            <span className="k">category</span>
            <span className="v">{question.category.split(" · ")[0]}</span>
          </div>
          <div>
            <span className="k">target</span>
            <span className="v">
              {question.kind === "match" ? "speech · each pair" : "speech · chosen option"}
            </span>
          </div>
        </div>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 12,
            color: "var(--ink-3)",
            lineHeight: 1.5,
          }}
        >
          Plug your model into <span className="mono">window.LumenCamera</span> — it receives the
          question payload above and can stream a confidence score back.
        </p>
      </div>

      <style>{`
        .cam-card {
          height: 100%;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          box-shadow: var(--shadow-sm);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: sticky;
          top: 88px;
          align-self: start;
        }
        .cam-head {
          display: flex; justify-content: space-between; align-items: center;
        }
        .cam-stage {
          display: flex; flex-direction: column;
        }
        .cam-empty {
          display: flex; flex-direction: column; align-items: center;
          padding: 36px 16px;
          background: var(--bg-2);
          border: 1.5px dashed var(--line);
          border-radius: var(--r-lg);
        }
        .cam-empty-glyph {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: var(--surface);
          border: 1px solid var(--line);
          display: grid; place-items: center;
          color: var(--ink-2);
          animation: floaty 4s ease-in-out infinite;
        }
        .cam-feed {
          aspect-ratio: 4/3;
          width: 100%;
          background: oklch(0.18 0.01 85);
          background-image:
            radial-gradient(circle at 30% 20%, oklch(0.28 0.02 158 / 0.45), transparent 55%),
            radial-gradient(circle at 70% 80%, oklch(0.22 0.02 220 / 0.4), transparent 55%);
          border-radius: var(--r-lg);
          position: relative;
          overflow: hidden;
          color: white;
        }
        .cam-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(oklch(1 0 0 / 0.06) 1px, transparent 1px),
            linear-gradient(90deg, oklch(1 0 0 / 0.06) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .cam-scan {
          position: absolute; left: 0; right: 0; height: 80px;
          background: linear-gradient(180deg, transparent, oklch(0.7 0.13 158 / 0.18), transparent);
          animation: scan 2.4s linear infinite;
        }
        @keyframes scan {
          0%   { top: -20%; }
          100% { top: 110%; }
        }
        .tick {
          position: absolute; width: 18px; height: 18px;
          border: 2px solid oklch(0.85 0.05 158);
        }
        .tick.tl { top: 12px; left: 12px; border-right: 0; border-bottom: 0; }
        .tick.tr { top: 12px; right: 12px; border-left: 0; border-bottom: 0; }
        .tick.bl { bottom: 12px; left: 12px; border-right: 0; border-top: 0; }
        .tick.br { bottom: 12px; right: 12px; border-left: 0; border-top: 0; }
        .bbox {
          position: absolute;
          border: 1.5px solid oklch(0.85 0.13 65);
          border-radius: 4px;
          box-shadow: 0 0 0 1px oklch(0 0 0 / 0.3);
          transition: left 0.4s ease, top 0.4s ease;
        }
        .bbox-tag {
          position: absolute;
          left: -1px; top: -22px;
          background: oklch(0.85 0.13 65);
          color: oklch(0.2 0.05 65);
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .cam-watermark {
          position: absolute;
          left: 12px; bottom: 10px;
          font-size: 10px;
          color: oklch(0.85 0.05 158);
          opacity: 0.7;
        }
        .cam-svg {
          position: absolute;
          inset: 0;
          width: 100%; height: 100%;
        }
        .feed-chip {
          position: absolute;
          top: 12px; right: 12px;
          font-size: 10px;
          padding: 4px 8px;
          background: oklch(0 0 0 / 0.55);
          color: oklch(0.85 0.05 158);
          border-radius: 999px;
          border: 1px solid oklch(0.85 0.13 65 / 0.5);
          letter-spacing: 0.04em;
        }
        .integrity {
          margin-top: 12px;
          padding: 14px 16px;
          background: var(--bg-2);
          border: 1px solid var(--line);
          border-left: 3px solid var(--accent);
          border-radius: var(--r-md);
          display: grid;
          gap: 8px;
        }
        .integrity[data-state="warn"] { border-left-color: var(--amber); }
        .integrity[data-state="bad"]  { border-left-color: var(--rose); }
        .int-meta { display: flex; justify-content: space-between; align-items: baseline; }
        .int-list {
          list-style: none; padding: 0; margin: 0;
          display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px;
        }
        .int-list li {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px;
          color: var(--ink-3);
        }
        .int-list li[data-ok]   { color: var(--accent-ink); }
        .int-list li[data-warn] { color: var(--rose); }
        .int-list li[data-warn] svg { color: var(--rose); }
        .proct-toast {
          margin-top: 10px;
          padding: 10px 12px;
          background: var(--rose-soft);
          border: 1px solid color-mix(in oklch, var(--rose), white 60%);
          border-radius: var(--r-md);
          font-size: 12px;
          display: grid;
          gap: 2px;
        }
        .proct-toast strong { color: var(--rose); font-size: 12px; }
        .proct-toast span   { color: var(--ink-3); font-family: var(--font-mono); font-size: 11px; }
        .cam-context {
          padding: 14px 16px;
          background: var(--bg-2);
          border-radius: var(--r-md);
        }
        .ctx-rows { display: grid; gap: 6px; margin-top: 8px; font-size: 12px; }
        .ctx-rows > div { display: flex; gap: 10px; }
        .ctx-rows .k { color: var(--ink-3); width: 76px; flex-shrink: 0; }
        .ctx-rows .v { color: var(--ink); }
        @media (max-width: 980px) {
          .cam-card { position: static; }
          .cam-feed { aspect-ratio: 16/9; }
        }
      `}</style>
    </div>
  );
}

(window as any).TestScreen = TestScreen;
