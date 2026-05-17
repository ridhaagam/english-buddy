// src/screens/Results.tsx — recording playback + answer list (no correct answers shown)
const { useState: useState_R } = React;

type ResultsProps = {
  result: {
    total: number;
    correct: number;
    timeMs: number;
    answers: { questionId: string; correct: boolean; selection: any }[];
  };
  onAgain: () => void;
  onHome: () => void;
};

function ResultsScreen({ result, onAgain, onHome }: ResultsProps) {
  const pct = Math.round((result.correct / result.total) * 100);
  const QUESTIONS = (window as any).LUMEN_DATA.QUESTIONS as any[];
  const xp = result.correct * 40 + 60;

  // tier for score color, but no correct/wrong per-question
  const tier = pct >= 90 ? "great" : pct >= 75 ? "good" : "ok";

  return (
    <div className="container">
      {/* HERO: score + recording */}
      <section className="r-hero fade-up">
        <div className="r-recording">
          <RecordingPlayer durationMs={result.timeMs} />
        </div>

        <div className="r-score">
          <p className="eyebrow">Session complete</p>
          <h1 className="serif" style={{ fontSize: 36, margin: "6px 0 14px", letterSpacing: "-0.02em" }}>
            Nice work, <span className="serif-it">your recording is saved.</span>
          </h1>

          <div className="r-ring-wrap">
            <Ring value={pct / 100} tier={tier} />
            <div className="r-ring-center">
              <span className="serif" style={{ fontSize: 56, letterSpacing: "-0.02em" }}>
                {pct}
                <span style={{ fontSize: 22, color: "var(--ink-3)", marginLeft: 2 }}>%</span>
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                YOUR SCORE
              </span>
            </div>
          </div>

          <div className="r-meta mono">
            <span>
              {formatTimeR(result.timeMs)} · {result.total} questions
            </span>
            <span className="dot-sep" />
            <span>+{xp} XP</span>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button className="btn accent" onClick={onAgain}>
              Try again
              <ArrowRightIcon size={14} />
            </button>
            <button className="btn ghost" onClick={onHome}>
              Back to dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ANSWER LIST — no correct/wrong shown */}
      <section className="card r-list fade-up" style={{ animationDelay: "160ms" }}>
        <div className="r-list-head">
          <div>
            <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>
              Your answers
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13 }}>
              Here’s what you picked for each question. The correct answers are kept private so
              you can try this practice again with a fresh mind.
            </p>
          </div>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {result.answers.length} answered
          </span>
        </div>

        <ol className="r-rows">
          {result.answers.map((a, i) => {
            const q = QUESTIONS.find((x: any) => x.id === a.questionId);
            if (!q) return null;
            return (
              <li key={a.questionId} className="r-row" style={{ animationDelay: `${220 + i * 50}ms` }}>
                <div className="r-row-num mono">{String(i + 1).padStart(2, "0")}</div>
                <div className="r-row-body">
                  <span className="eyebrow">{q.category}</span>
                  <p className="serif" style={{ margin: "4px 0 8px", fontSize: 17, lineHeight: 1.35 }}>
                    {q.prompt}
                  </p>
                  <UserSelection q={q} selection={a.selection} />
                </div>
              </li>
            );
          })}
        </ol>

        <div className="r-list-foot">
          <span style={{ color: "var(--ink-3)", fontSize: 13 }}>
            Want to know how you did?
          </span>
          <button className="btn accent" onClick={onAgain}>
            Practice again
            <ArrowRightIcon size={14} />
          </button>
        </div>
      </section>

      <style>{`
        .r-hero {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
        }
        .r-recording {
          background: black;
          border-radius: var(--r-xl);
          overflow: hidden;
          position: relative;
          aspect-ratio: 16/10;
          min-width: 0;
        }
        .r-score {
          padding: 28px 28px 24px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          box-shadow: var(--shadow-sm);
          display: flex; flex-direction: column;
        }
        .r-ring-wrap {
          position: relative;
          display: grid; place-items: center;
          margin: 8px 0 12px;
        }
        .r-ring-center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 2px;
        }
        .r-meta {
          display: flex; align-items: center; gap: 10px;
          font-size: 12px; color: var(--ink-2);
        }
        .dot-sep { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-3); }

        .r-list { padding: 24px 26px; }
        .r-list-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 18px;
          margin-bottom: 18px;
        }
        .r-rows {
          list-style: none; padding: 0; margin: 0;
          display: grid; gap: 10px;
        }
        .r-row {
          display: grid;
          grid-template-columns: 36px 1fr;
          gap: 14px;
          padding: 16px 18px;
          background: var(--bg-2);
          border-radius: var(--r-md);
          border: 1px solid var(--line-2);
          animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both;
        }
        .r-row-num {
          color: var(--ink-3);
          font-size: 12px;
          padding-top: 2px;
        }
        .r-row-body { min-width: 0; }

        .r-list-foot {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid var(--line-2);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        @media (max-width: 920px) {
          .r-hero { grid-template-columns: 1fr; }
          .r-recording { aspect-ratio: 16/9; min-height: 0; }
        }
        @media (max-width: 520px) {
          .r-list-head { flex-direction: column; }
          .r-list-foot { flex-direction: column; align-items: stretch; }
        }

        /* selection cards */
        .sel-empty {
          padding: 10px 12px;
          background: var(--surface);
          border: 1px dashed var(--line);
          border-radius: var(--r-sm);
        }
        .sel-card {
          padding: 12px 14px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sel-label {
          font-size: 10px;
          letter-spacing: 0.12em;
          color: var(--ink-3);
        }
        .sel-pairs { display: grid; gap: 6px; margin-top: 2px; }
        .sel-pair {
          display: grid;
          grid-template-columns: 1fr 18px 1fr;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }
        @media (max-width: 520px) {
          .sel-pair { grid-template-columns: 1fr 16px 1fr; font-size: 13px; }
        }
      `}</style>
    </div>
  );
}

// ---- User selection display (no right/wrong indicators) ----------------------
function UserSelection({ q, selection }: { q: any; selection: any }) {
  if (selection == null || selection === undefined || (q.kind !== "match" && !selection)) {
    return (
      <div className="sel-empty">
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
          NOT ANSWERED
        </span>
      </div>
    );
  }

  if (q.kind === "choice" || q.kind === "fill") {
    const picked = q.choices.find((c: any) => c.id === selection);
    if (!picked) return null;
    return (
      <div className="sel-card">
        <span className="sel-label mono">YOU PICKED</span>
        <span className="serif" style={{ fontSize: 16 }}>
          {picked.label}
        </span>
      </div>
    );
  }

  if (q.kind === "match") {
    const pairs = selection as Record<string, string>;
    return (
      <div className="sel-card">
        <span className="sel-label mono">YOUR PAIRS</span>
        <div className="sel-pairs">
          {q.pairs.map((p: any) => (
            <div key={p.left} className="sel-pair">
              <span className="serif" style={{ fontWeight: 500 }}>{p.left}</span>
              <span className="mono" style={{ color: "var(--ink-3)" }}>→</span>
              <span className="serif-it">
                {pairs[p.left] || <span style={{ color: "var(--ink-3)" }}>—</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// ---- Recording player (mock) ------------------------------------------------
function RecordingPlayer({ durationMs }: { durationMs: number }) {
  const [playing, setPlaying] = useState_R(false);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const [isFs, setIsFs] = useState_R(false);
  const total = Math.max(20, Math.round(durationMs / 1000));

  React.useEffect(() => {
    const handler = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  function toggleFullscreen() {
    if (!stageRef.current) return;
    if (!document.fullscreenElement) {
      stageRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }

  // tick the bar a bit when playing (just for animation feel)
  const [t, setT] = useState_R(0);
  React.useEffect(() => {
    if (!playing) return;
    const i = setInterval(() => setT((x) => (x + 1) % total), 1000);
    return () => clearInterval(i);
  }, [playing, total]);

  return (
    <div className="rp" ref={stageRef} data-fs={isFs || undefined}>
      <div className="rp-stage">
        <div className="rp-bg" />
        {/* abstract face */}
        <div className="rp-face">
          <span className="rp-eye e1" />
          <span className="rp-eye e2" />
          <span className="rp-mouth" />
        </div>
        {/* waveform */}
        <div className="rp-wave" data-playing={playing || undefined}>
          {Array.from({ length: 36 }).map((_, i) => (
            <i key={i} style={{ animationDelay: `${i * 0.04}s` }} />
          ))}
        </div>
        {/* REC badge */}
        <span className="rp-rec mono">
          <span className="rp-rec-dot" />
          REC · saved
        </span>
        {/* play overlay */}
        {!playing && (
          <button className="rp-big" onClick={() => setPlaying(true)} aria-label="Play recording">
            <PlayGlyph />
          </button>
        )}
      </div>

      <div className="rp-controls">
        <button
          className="rp-play"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <PauseGlyph /> : <PlayGlyph small />}
        </button>
        <div className="rp-bar">
          <span style={{ width: `${(t / total) * 100}%` }} />
        </div>
        <span className="mono" style={{ color: "white", fontSize: 11, opacity: 0.85 }}>
          {fmt(t)} / {fmt(total)}
        </span>
        <button
          className="rp-fs"
          onClick={toggleFullscreen}
          aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
          title={isFs ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFs ? <FsCollapse /> : <FsExpand />}
        </button>
      </div>

      <style>{`
        .rp { position: absolute; inset: 0; }
        .rp[data-fs] { background: black; }
        .rp[data-fs] .rp-stage { position: absolute; inset: 0; }
        .rp[data-fs] .rp-face {
          width: 180px; height: 200px;
        }
        .rp[data-fs] .rp-wave {
          bottom: 110px;
        }
        .rp-stage {
          position: absolute; inset: 0;
          overflow: hidden;
        }
        .rp-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(circle at 30% 28%, oklch(0.55 0.16 158), transparent 55%),
            radial-gradient(circle at 70% 75%, oklch(0.4 0.1 220), transparent 55%),
            oklch(0.2 0.04 158);
        }
        .rp-face {
          position: absolute;
          left: 50%; top: 44%;
          transform: translate(-50%, -50%);
          width: 96px; height: 110px;
          border-radius: 50% 50% 46% 46% / 60% 60% 40% 40%;
          background: oklch(0.78 0.06 158 / 0.6);
          box-shadow: 0 0 0 14px oklch(0.78 0.06 158 / 0.18);
        }
        .rp-eye {
          position: absolute; width: 9px; height: 9px;
          background: oklch(0.12 0.02 158);
          border-radius: 50%;
          top: 42px;
        }
        .rp-eye.e1 { left: 24px; }
        .rp-eye.e2 { right: 24px; }
        .rp-mouth {
          position: absolute; bottom: 22px; left: 50%;
          transform: translateX(-50%);
          width: 32px; height: 12px;
          border-radius: 0 0 30px 30px;
          background: oklch(0.12 0.02 158);
        }
        .rp-wave {
          position: absolute;
          bottom: 70px; left: 12%; right: 12%;
          height: 38px;
          display: flex; align-items: center; gap: 3px;
        }
        .rp-wave i {
          flex: 1;
          background: oklch(0.88 0.1 158);
          border-radius: 2px;
          height: 18%;
          opacity: 0.55;
        }
        .rp-wave[data-playing] i {
          animation: wave 1.4s ease-in-out infinite;
          opacity: 1;
        }
        @keyframes wave {
          0%, 100% { height: 18%; }
          50%      { height: 90%; }
        }
        .rp-rec {
          position: absolute;
          top: 14px; left: 14px;
          font-size: 11px;
          color: white;
          padding: 5px 10px;
          background: oklch(0 0 0 / 0.5);
          border-radius: 999px;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .rp-rec-dot {
          width: 7px; height: 7px;
          border-radius: 999px;
          background: var(--rose);
          animation: pulse-ring 1.6s infinite;
        }
        .rp-big {
          position: absolute;
          inset: 0; margin: auto;
          width: 72px; height: 72px;
          border-radius: 999px;
          background: oklch(1 0 0 / 0.95);
          color: var(--ink);
          border: 0;
          cursor: pointer;
          display: grid; place-items: center;
          box-shadow: 0 8px 24px oklch(0 0 0 / 0.35);
          transition: transform 0.18s ease;
        }
        .rp-big:hover { transform: scale(1.06); }

        .rp-controls {
          position: absolute;
          left: 14px; right: 14px; bottom: 14px;
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px;
          background: oklch(0 0 0 / 0.5);
          backdrop-filter: blur(8px);
          border-radius: var(--r-md);
        }
        .rp-play {
          width: 36px; height: 36px;
          border-radius: 999px;
          background: white; color: black;
          border: 0; cursor: pointer;
          display: grid; place-items: center;
        }
        .rp-bar {
          flex: 1; height: 4px;
          background: oklch(1 0 0 / 0.25);
          border-radius: 999px; overflow: hidden;
        }
        .rp-bar span {
          display: block; height: 100%;
          background: white;
          transition: width 1s linear;
        }
        .rp-fs {
          width: 32px; height: 32px;
          border-radius: 8px;
          background: oklch(1 0 0 / 0.08);
          color: white;
          border: 0;
          cursor: pointer;
          display: grid; place-items: center;
          flex-shrink: 0;
        }
        .rp-fs:hover { background: oklch(1 0 0 / 0.18); }
      `}</style>
    </div>
  );
}

function FsExpand() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
    </svg>
  );
}
function FsCollapse() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
    </svg>
  );
}

function PlayGlyph({ small }: { small?: boolean }) {
  const s = small ? 14 : 28;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}
function PauseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4.5" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1.2" />
    </svg>
  );
}

function Ring({ value, tier }: { value: number; tier: "great" | "good" | "ok" }) {
  const r = 92;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value);
  const grad = tier === "ok" ? "g-ok" : tier === "good" ? "g-good" : "g-great";
  return (
    <svg viewBox="0 0 220 220" width="220" height="220" style={{ display: "block" }}>
      <circle cx="110" cy="110" r={r} stroke="var(--line)" strokeWidth="12" fill="none" />
      <circle
        cx="110" cy="110" r={r}
        stroke={`url(#${grad})`}
        strokeWidth="12" fill="none"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 110 110)"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
      <defs>
        <linearGradient id="g-great" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.7 0.14 145)" />
          <stop offset="100%" stopColor="oklch(0.55 0.12 158)" />
        </linearGradient>
        <linearGradient id="g-good" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.14 80)" />
          <stop offset="100%" stopColor="oklch(0.62 0.14 65)" />
        </linearGradient>
        <linearGradient id="g-ok" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.7 0.14 30)" />
          <stop offset="100%" stopColor="oklch(0.55 0.16 25)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function formatTimeR(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

(window as any).ResultsScreen = ResultsScreen;
