// src/admin/Listening.tsx — audio import with local Qwen-1B GGUF + Whisper pipeline (mocked)
const { useState: useState_Ls, useRef: useRef_Ls, useEffect: useEffect_Ls } = React;

type LsPhase = "drop" | "loading-model" | "transcribing" | "review" | "done";

type Segment = {
  start: number; // sec
  end: number;
  text: string;
  confidence: number; // 0-1
};

type LsQuestion = {
  id: string;
  prompt: string;
  segmentIdx: number;
  choices: { id: string; label: string }[];
  answer: string;
  include: boolean;
};

// stable mocked transcript so the user can see a realistic result
const MOCK_SEGMENTS: Segment[] = [
  { start: 0.0,  end: 4.2,  text: "Good afternoon, and welcome back to the evening news.",            confidence: 0.97 },
  { start: 4.2,  end: 10.5, text: "Heavy rain across the city has reduced visibility on the highway.", confidence: 0.94 },
  { start: 10.5, end: 16.8, text: "Drivers are advised to slow down and use their headlights.",        confidence: 0.91 },
  { start: 16.8, end: 22.0, text: "Forecasts say the storm will continue until early Friday morning.", confidence: 0.88 },
  { start: 22.0, end: 28.4, text: "In other news, a new research lab opened downtown today.",         confidence: 0.95 },
  { start: 28.4, end: 34.1, text: "The lab focuses on computer vision and image restoration.",        confidence: 0.93 },
  { start: 34.1, end: 40.0, text: "We'll be right back after a short break.",                          confidence: 0.96 },
];

const MOCK_QUESTIONS: LsQuestion[] = [
  {
    id: "lq1",
    prompt: "What has happened on the highway?",
    segmentIdx: 1,
    choices: [
      { id: "a", label: "Visibility has improved" },
      { id: "b", label: "Visibility has been reduced by heavy rain" },
      { id: "c", label: "There is a new traffic camera" },
      { id: "d", label: "The highway has been closed" },
    ],
    answer: "b",
    include: true,
  },
  {
    id: "lq2",
    prompt: "How long will the storm last?",
    segmentIdx: 3,
    choices: [
      { id: "a", label: "Until Thursday night" },
      { id: "b", label: "Until early Friday morning" },
      { id: "c", label: "Through the weekend" },
      { id: "d", label: "Only a few more hours" },
    ],
    answer: "b",
    include: true,
  },
  {
    id: "lq3",
    prompt: "What does the new lab focus on?",
    segmentIdx: 5,
    choices: [
      { id: "a", label: "Robotics and drones" },
      { id: "b", label: "Climate forecasting" },
      { id: "c", label: "Computer vision and image restoration" },
      { id: "d", label: "Natural language processing" },
    ],
    answer: "c",
    include: true,
  },
  {
    id: "lq4",
    prompt: "What does the reporter say at the end?",
    segmentIdx: 6,
    choices: [
      { id: "a", label: "Goodbye and goodnight" },
      { id: "b", label: "We'll be right back after a short break" },
      { id: "c", label: "Stay tuned for the weather report" },
      { id: "d", label: "Subscribe to our podcast" },
    ],
    answer: "b",
    include: true,
  },
];

function AdminListening() {
  const [phase, setPhase] = useState_Ls<LsPhase>("drop");
  const [file, setFile] = useState_Ls<File | null>(null);
  const [drag, setDrag] = useState_Ls(false);
  const [loadProg, setLoadProg] = useState_Ls(0);
  const [loadStage, setLoadStage] = useState_Ls(0);
  const [segments, setSegments] = useState_Ls<Segment[]>([]);
  const [questions, setQuestions] = useState_Ls<LsQuestion[]>([]);
  const [moduleName, setModuleName] = useState_Ls(
    "Listening · imported " + new Date().toLocaleDateString()
  );
  const [playing, setPlaying] = useState_Ls(false);
  const [curSeg, setCurSeg] = useState_Ls(0);
  const inputRef = useRef_Ls<HTMLInputElement>(null);

  // loading-model phase: 4 stages (load whisper.cpp, load qwen-1b, warmup, ready)
  const loadStages = [
    "Initializing local model runtime (WebGPU)",
    "Loading whisper-small.bin (242 MB)",
    "Loading qwen2-1.5b-instruct-q4_K_M.gguf (1.1 GB)",
    "Warming up tokens · ready",
  ];

  function pickFile(f: File) {
    setFile(f);
    setPhase("loading-model");
    setLoadProg(0); setLoadStage(0);
    let p = 0, stage = 0;
    const tick = () => {
      p += 4 + Math.random() * 7;
      if (p >= 100) {
        stage += 1;
        if (stage >= loadStages.length) {
          setLoadProg(100); setLoadStage(loadStages.length - 1);
          setTimeout(startTranscribing, 400);
          return;
        }
        setLoadStage(stage); p = 0;
        setLoadProg(0);
      } else {
        setLoadProg(p);
      }
      setTimeout(tick, 110);
    };
    setTimeout(tick, 200);
  }

  function startTranscribing() {
    setPhase("transcribing");
    setSegments([]);
    let idx = 0;
    const t = setInterval(() => {
      if (idx >= MOCK_SEGMENTS.length) {
        clearInterval(t);
        // synthesize comprehension questions
        setQuestions(MOCK_QUESTIONS);
        setTimeout(() => setPhase("review"), 350);
        return;
      }
      setSegments((s) => [...s, MOCK_SEGMENTS[idx]]);
      idx += 1;
    }, 520);
  }

  // fake audio playback for review phase
  useEffect_Ls(() => {
    if (!playing) return;
    if (segments.length === 0) return;
    const total = segments[segments.length - 1].end;
    let t = segments[curSeg]?.start || 0;
    const i = setInterval(() => {
      t += 0.5;
      const idx = segments.findIndex((s) => t >= s.start && t < s.end);
      if (idx === -1 || t > total) {
        setPlaying(false);
        setCurSeg(0);
        return;
      }
      setCurSeg(idx);
    }, 350);
    return () => clearInterval(i);
  }, [playing, segments, curSeg]);

  function reset() {
    setPhase("drop"); setFile(null); setSegments([]); setQuestions([]); setLoadProg(0); setLoadStage(0); setPlaying(false); setCurSeg(0);
  }

  const totalDur = segments.length ? segments[segments.length - 1].end : 0;
  const includedQs = questions.filter((q) => q.include).length;

  return (
    <div>
      <header className="ls-head fade-up">
        <div>
          <p className="eyebrow">Listening import</p>
          <h2 className="serif" style={{ margin: "4px 0 4px", fontSize: 26, letterSpacing: "-0.02em" }}>
            Audio in, <span className="serif-it">listening drill out.</span>
          </h2>
          <p style={{ margin: 0, color: "var(--ink-2)", maxWidth: 560 }}>
            Upload an MP3 or WAV. We transcribe it locally with Whisper, then use{" "}
            <span className="mono" style={{ fontSize: 12, background: "var(--bg-2)", padding: "1px 6px", borderRadius: 4 }}>
              qwen2-1.5b-instruct.gguf
            </span>{" "}
            to draft comprehension questions. No cloud upload required.
          </p>
        </div>
        <ImportStepperLs phase={phase} />
      </header>

      {/* DROP */}
      {phase === "drop" && (
        <div
          className={"dropzone-ls fade-up " + (drag ? "drag" : "")}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.ogg,audio/*"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
          />
          <div className="ls-glyph">
            <MicLg />
            <span className="ring r1" />
            <span className="ring r2" />
          </div>
          <h3 className="serif" style={{ margin: "20px 0 6px", fontSize: 22, letterSpacing: "-0.02em" }}>
            Drop your audio file
          </h3>
          <p style={{ margin: 0, color: "var(--ink-2)" }}>MP3, WAV, M4A · up to 60 minutes</p>
          <button className="btn ghost" style={{ marginTop: 18 }} onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
            Choose audio
          </button>

          <div className="model-row">
            <ModelChip name="whisper-small" size="242 MB" tag="ASR" />
            <ModelChip name="qwen2-1.5b-instruct" size="1.1 GB" tag="LLM · q4_K_M" />
            <ModelChip name="WebGPU" size="local" tag="runtime" />
          </div>
        </div>
      )}

      {/* LOADING MODEL */}
      {phase === "loading-model" && (
        <div className="card processing fade-up">
          <div className="file-chip">
            <AudioGlyph />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file?.name || "audio.mp3"}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                {file ? `${Math.round(file.size / 1024)} KB` : "—"} · preparing local model
              </div>
            </div>
            <button className="btn ghost" onClick={reset} style={{ padding: "8px 12px", fontSize: 12 }}>Cancel</button>
          </div>

          <div className="proc-status">
            <ProgressBar value={loadProg / 100} />
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{Math.round(loadProg)}%</span>
          </div>

          <ul className="proc-log mono">
            {loadStages.map((s, i) => (
              <li
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  color: i < loadStage ? "var(--accent-ink)" : i === loadStage ? "var(--ink)" : "var(--ink-3)",
                }}
              >
                <span
                  style={{
                    width: 14, height: 14, borderRadius: 999,
                    background: i < loadStage ? "var(--accent)" : i === loadStage ? "var(--accent-soft)" : "var(--bg-2)",
                    border: "1px solid var(--line)",
                    display: "grid", placeItems: "center",
                    color: i < loadStage ? "white" : "var(--ink-3)",
                    flexShrink: 0,
                  }}
                >
                  {i < loadStage ? <CheckMicro2 /> : i === loadStage ? <span className="dot-pulse" /> : null}
                </span>
                <span style={{ fontSize: 12 }}>{s}</span>
              </li>
            ))}
          </ul>

          <div className="local-note">
            <span className="mono" style={{ fontSize: 10, color: "var(--accent-ink)", background: "var(--accent-soft)", padding: "2px 8px", borderRadius: 999, letterSpacing: "0.08em" }}>
              LOCAL
            </span>
            <span style={{ color: "var(--ink-3)", fontSize: 12 }}>
              Your audio never leaves this device. Inference runs on WebGPU when available.
            </span>
          </div>
        </div>
      )}

      {/* TRANSCRIBING (live) */}
      {phase === "transcribing" && (
        <div className="card transcribe fade-up">
          <div className="trans-head">
            <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>Transcribing</h3>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
              {segments.length}/{MOCK_SEGMENTS.length} segments
            </span>
          </div>
          <div className="wave-track">
            {Array.from({ length: 56 }).map((_, i) => (
              <i key={i} style={{ animationDelay: `${(i % 12) * 0.06}s`, opacity: i < (segments.length / MOCK_SEGMENTS.length) * 56 ? 1 : 0.3 }} />
            ))}
          </div>
          <div className="trans-list">
            {segments.map((s, i) => (
              <div key={i} className="trans-seg fade-up">
                <span className="mono trans-ts">{fmtSec(s.start)}</span>
                <p>{s.text}</p>
                <span className="mono trans-conf" data-low={s.confidence < 0.9 || undefined}>
                  {Math.round(s.confidence * 100)}%
                </span>
              </div>
            ))}
            {segments.length === MOCK_SEGMENTS.length && (
              <div className="trans-seg" style={{ background: "var(--accent-soft)" }}>
                <span className="mono trans-ts" style={{ color: "var(--accent-ink)" }}>QWEN</span>
                <p>Drafting comprehension questions from the transcript…</p>
                <span className="mono trans-conf">···</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REVIEW */}
      {phase === "review" && (
        <div className="review fade-up">
          {/* PLAYER */}
          <div className="card ls-player">
            <div className="ls-player-stage">
              <div className="ls-player-bg" />
              <div className="ls-wave-anim" data-playing={playing || undefined}>
                {Array.from({ length: 60 }).map((_, i) => (
                  <i key={i} style={{ animationDelay: `${i * 0.04}s` }} />
                ))}
              </div>
              <span className="mono" style={{ position: "absolute", top: 14, left: 14, fontSize: 11, color: "white", background: "oklch(0 0 0 / 0.45)", padding: "4px 10px", borderRadius: 999 }}>
                {file?.name || "audio.mp3"} · {fmtSec(totalDur)}
              </span>
            </div>
            <div className="ls-player-controls">
              <button className="ctrl" onClick={() => setPlaying((p) => !p)} aria-label="play/pause">
                {playing ? <PauseG2 /> : <PlayG2 />}
              </button>
              <div className="ls-segs">
                {segments.map((s, i) => (
                  <button
                    key={i}
                    className="ls-seg-tick"
                    data-active={i === curSeg || undefined}
                    onClick={() => { setCurSeg(i); setPlaying(true); }}
                    title={`${fmtSec(s.start)} — ${s.text.slice(0, 40)}…`}
                    style={{ flex: s.end - s.start }}
                  />
                ))}
              </div>
              <span className="mono" style={{ fontSize: 11, color: "white", opacity: 0.85 }}>
                {fmtSec(segments[curSeg]?.start || 0)} / {fmtSec(totalDur)}
              </span>
            </div>
            <div className="ls-now-playing">
              <span className="eyebrow">Now</span>
              <p>{segments[curSeg]?.text}</p>
            </div>
          </div>

          {/* SEGMENT TABLE + QUESTIONS */}
          <div className="ls-grid">
            <div className="card">
              <div className="rt-head">
                <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>Transcript</h3>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{segments.length} segments</span>
              </div>
              <ul className="seg-list">
                {segments.map((s, i) => (
                  <li
                    key={i}
                    className="seg-row"
                    data-active={i === curSeg || undefined}
                    onClick={() => setCurSeg(i)}
                  >
                    <span className="mono seg-ts">{fmtSec(s.start)}</span>
                    <input
                      className="cell-in"
                      value={s.text}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSegments((ss) => ss.map((x, j) => j === i ? { ...x, text: v } : x));
                      }}
                    />
                    <span className="mono seg-conf" data-low={s.confidence < 0.9 || undefined}>
                      {Math.round(s.confidence * 100)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <div className="rt-head">
                <h3 className="serif" style={{ margin: 0, fontSize: 18 }}>
                  Generated questions <span className="mono" style={{ fontSize: 10, color: "var(--accent-ink)", background: "var(--accent-soft)", padding: "2px 6px", borderRadius: 4, letterSpacing: "0.08em", marginLeft: 6 }}>QWEN</span>
                </h3>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{includedQs}/{questions.length} selected</span>
              </div>
              <ul className="ls-q-list">
                {questions.map((q, i) => (
                  <li key={q.id} className="ls-q" data-off={!q.include || undefined}>
                    <div className="ls-q-head">
                      <label className="ls-q-toggle">
                        <input
                          type="checkbox"
                          checked={q.include}
                          onChange={() => setQuestions(questions.map((x, j) => j === i ? { ...x, include: !x.include } : x))}
                        />
                        <span className="mono">Q{i + 1}</span>
                      </label>
                      <input
                        className="cell-in"
                        value={q.prompt}
                        onChange={(e) => {
                          const v = e.target.value;
                          setQuestions(questions.map((x, j) => j === i ? { ...x, prompt: v } : x));
                        }}
                      />
                      <button
                        className="row-act"
                        onClick={() => { setCurSeg(q.segmentIdx); setPlaying(true); }}
                        title="Play from segment"
                      ><PlayG2 size={12} /></button>
                    </div>
                    <ul className="ls-q-choices">
                      {q.choices.map((c, ci) => (
                        <li key={c.id} data-correct={c.id === q.answer || undefined}>
                          <button
                            className="choice-mark2"
                            onClick={() => setQuestions(questions.map((x, j) => j === i ? { ...x, answer: c.id } : x))}
                            type="button"
                          >
                            {c.id === q.answer ? <DotFilled2 /> : <DotOpen2 />}
                          </button>
                          <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                            {String.fromCharCode(65 + ci)}
                          </span>
                          <input
                            className="cell-in"
                            value={c.label}
                            onChange={(e) => {
                              const v = e.target.value;
                              const next = q.choices.map((x, k) => k === ci ? { ...x, label: v } : x);
                              setQuestions(questions.map((x, j) => j === i ? { ...x, choices: next } : x));
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card ls-publish">
            <div className="field" style={{ flex: 1 }}>
              <label>Module name</label>
              <input value={moduleName} onChange={(e) => setModuleName(e.target.value)} />
            </div>
            <button className="btn ghost" onClick={reset}>← Use a different audio</button>
            <button className="btn accent" onClick={() => setPhase("done")} disabled={includedQs === 0}>
              Create listening drill <ArrowR2 />
            </button>
          </div>
        </div>
      )}

      {/* DONE */}
      {phase === "done" && (
        <div className="done-card card fade-up">
          <div className="done-glyph"><CheckBigG2 /></div>
          <h2 className="serif" style={{ margin: "16px 0 6px", fontSize: 26, letterSpacing: "-0.02em" }}>
            Listening drill ready
          </h2>
          <p style={{ color: "var(--ink-2)", margin: "0 0 20px" }}>
            "<strong>{moduleName}</strong>" has been added as a draft with{" "}
            <strong>{includedQs}</strong> questions and {segments.length} audio segments.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn ghost" onClick={reset}>Import another</button>
            <button className="btn accent">Open module editor <ArrowR2 /></button>
          </div>
        </div>
      )}

      <style>{`
        .ls-head {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: end;
          margin-bottom: 22px;
        }
        .dropzone-ls {
          background: var(--surface);
          border: 2px dashed var(--line);
          border-radius: var(--r-xl);
          padding: 54px 30px;
          text-align: center;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s;
          display: flex; flex-direction: column; align-items: center;
        }
        .dropzone-ls:hover, .dropzone-ls.drag {
          background: oklch(0.96 0.04 220 / 0.4);
          border-color: oklch(0.5 0.13 220);
        }
        .ls-glyph {
          position: relative;
          width: 88px; height: 88px;
          border-radius: 50%;
          background: var(--bg-2);
          color: oklch(0.35 0.1 220);
          display: grid; place-items: center;
        }
        .ls-glyph .ring {
          position: absolute; inset: -8px;
          border-radius: 50%;
          border: 2px solid oklch(0.5 0.13 220);
          opacity: 0;
          animation: ring 2s ease-out infinite;
        }
        .ls-glyph .ring.r2 { animation-delay: 1s; }
        @keyframes ring {
          0%   { transform: scale(0.85); opacity: 0.55; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        .model-row {
          margin-top: 26px;
          display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
        }

        .processing { padding: 22px 24px; }
        .file-chip {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          background: var(--bg-2);
          border-radius: var(--r-md);
          margin-bottom: 16px;
        }
        .proc-status { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
        .proc-log { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 12px; }
        .local-note {
          margin-top: 18px;
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          background: var(--bg-2);
          border-radius: var(--r-sm);
        }

        .transcribe { padding: 22px 24px; }
        .trans-head { display: flex; justify-content: space-between; margin-bottom: 14px; align-items: center; }
        .wave-track {
          height: 50px;
          background: oklch(0.2 0.04 220);
          border-radius: 8px;
          padding: 8px;
          display: flex; gap: 2px; align-items: center;
          margin-bottom: 16px;
        }
        .wave-track i {
          flex: 1;
          background: oklch(0.7 0.14 220);
          border-radius: 2px;
          height: 50%;
          animation: wave2 1.4s ease-in-out infinite;
        }
        @keyframes wave2 {
          0%, 100% { height: 18%; }
          50%      { height: 90%; }
        }
        .trans-list { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
        .trans-seg {
          display: grid;
          grid-template-columns: 60px 1fr 40px;
          gap: 12px; align-items: center;
          padding: 10px 12px;
          background: var(--bg-2);
          border-radius: 8px;
        }
        .trans-ts { font-size: 11px; color: var(--ink-3); }
        .trans-seg p { margin: 0; font-size: 14px; font-family: var(--font-display); }
        .trans-conf { font-size: 11px; color: var(--accent-ink); text-align: right; }
        .trans-conf[data-low] { color: oklch(0.55 0.16 25); }

        .review { display: flex; flex-direction: column; gap: 14px; }
        .ls-player { padding: 0; overflow: hidden; }
        .ls-player-stage {
          position: relative;
          aspect-ratio: 16/4.5;
          background: oklch(0.16 0.04 220);
          overflow: hidden;
        }
        .ls-player-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(circle at 30% 50%, oklch(0.45 0.16 220), transparent 60%),
            radial-gradient(circle at 70% 50%, oklch(0.3 0.1 158), transparent 60%);
        }
        .ls-wave-anim {
          position: absolute; inset: 0;
          display: flex; gap: 3px;
          padding: 22px 20px;
          align-items: center;
        }
        .ls-wave-anim i {
          flex: 1;
          background: oklch(0.85 0.1 220);
          border-radius: 2px;
          height: 22%;
          opacity: 0.45;
        }
        .ls-wave-anim[data-playing] i {
          animation: wave2 1.4s ease-in-out infinite;
          opacity: 1;
        }
        .ls-player-controls {
          padding: 12px 16px;
          background: oklch(0.18 0.02 220);
          display: flex; align-items: center; gap: 12px;
          color: white;
        }
        .ctrl {
          width: 36px; height: 36px;
          border-radius: 999px;
          background: white; color: black;
          border: 0; cursor: pointer;
          display: grid; place-items: center;
        }
        .ls-segs { flex: 1; display: flex; gap: 2px; }
        .ls-seg-tick {
          height: 6px; border-radius: 999px;
          background: oklch(1 0 0 / 0.25);
          border: 0; cursor: pointer; padding: 0;
        }
        .ls-seg-tick[data-active] { background: white; }
        .ls-now-playing {
          padding: 14px 18px;
          background: var(--bg-2);
        }
        .ls-now-playing p {
          margin: 4px 0 0;
          font-family: var(--font-display);
          font-size: 18px;
          font-style: italic;
          color: var(--ink);
        }

        .ls-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 14px;
        }
        .ls-grid .card { padding: 16px 18px; }
        .rt-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .seg-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; max-height: 540px; overflow-y: auto; }
        .seg-row {
          display: grid;
          grid-template-columns: 56px 1fr 36px;
          gap: 10px; align-items: center;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
        }
        .seg-row:hover { background: var(--bg-2); }
        .seg-row[data-active] { background: var(--accent-soft); }
        .seg-ts { font-size: 11px; color: var(--ink-3); }
        .seg-conf { font-size: 11px; color: var(--accent-ink); text-align: right; }
        .seg-conf[data-low] { color: oklch(0.55 0.16 25); }
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

        .ls-q-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; max-height: 540px; overflow-y: auto; }
        .ls-q {
          padding: 12px 14px;
          background: var(--bg-2);
          border-radius: 10px;
          transition: opacity 0.15s;
        }
        .ls-q[data-off] { opacity: 0.45; }
        .ls-q-head {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
          align-items: center;
          margin-bottom: 8px;
        }
        .ls-q-toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; }
        .ls-q-toggle .mono { color: var(--ink-3); }
        .ls-q-choices {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 4px;
        }
        .ls-q-choices li {
          display: grid;
          grid-template-columns: 22px 14px 1fr;
          align-items: center;
          gap: 8px;
          padding: 4px 6px;
          border-radius: 6px;
        }
        .ls-q-choices li[data-correct] { background: var(--accent-soft); }
        .choice-mark2 {
          width: 20px; height: 20px;
          border-radius: 50%;
          background: white;
          border: 1px solid var(--line);
          cursor: pointer;
          display: grid; place-items: center;
          padding: 0;
        }

        .ls-publish {
          padding: 14px 16px;
          display: flex; gap: 12px;
          align-items: flex-end;
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

        @media (max-width: 980px) {
          .ls-head { grid-template-columns: 1fr; }
          .ls-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function ModelChip({ name, size, tag }: { name: string; size: string; tag: string }) {
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 10px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 999,
        fontSize: 11,
        color: "var(--ink-2)",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: "oklch(0.5 0.13 220)" }} />
      {name}
      <span style={{ color: "var(--ink-3)" }}>· {size}</span>
      <span style={{ background: "var(--bg-2)", padding: "1px 6px", borderRadius: 4, color: "var(--ink-3)" }}>{tag}</span>
    </span>
  );
}

function ImportStepperLs({ phase }: { phase: LsPhase }) {
  const steps = ["drop", "loading-model", "transcribing", "review", "done"] as LsPhase[];
  const labels: Record<LsPhase, string> = {
    "drop": "Upload", "loading-model": "Load model", "transcribing": "Transcribe", "review": "Review", "done": "Done",
  };
  const visible: LsPhase[] = ["drop", "loading-model", "transcribing", "review", "done"];
  const idx = visible.indexOf(phase);
  return (
    <ol className="stepper mono">
      {visible.map((s, i) => (
        <li key={s} data-active={idx === i || undefined} data-done={idx > i || undefined}>
          <span className="stp-num">{i + 1}</span>
          <span className="stp-lbl">{labels[s]}</span>
        </li>
      ))}
    </ol>
  );
}

function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

// glyphs
function G3({ children, size = 14 }: any) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
function MicLg() {
  return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
}
function AudioGlyph() { return <G3 size={20}><path d="M3 12h3l3-7 6 14 3-7h3"/></G3>; }
function PlayG2({ size = 14 }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>; }
function PauseG2() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>; }
function ArrowR2() { return <G3><path d="M5 12h14M13 6l6 6-6 6"/></G3>; }
function CheckMicro2() { return <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9 17l11-11"/></svg>; }
function CheckBigG2() { return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9 17l11-11"/></svg>; }
function DotFilled2() { return <svg width="10" height="10" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="var(--accent)"/></svg>; }
function DotOpen2()   { return <svg width="10" height="10" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="none" stroke="var(--ink-3)" strokeWidth="2"/></svg>; }

(window as any).AdminListening = AdminListening;
