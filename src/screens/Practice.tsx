// src/screens/Practice.tsx — history of past sessions with recorded video playback
const { useState: useState_Pr } = React;

type Session = {
  id: string;
  title: string;
  topic: string;
  takenAt: string;
  duration: string;
  questions: number;
  score: number; // %
  correct: number;
  speakingScore: number; // 0-100
  pronScore: number;
  // a fake "recording" — gradient + waveform pattern
  bgHue: string;
};

const SESSIONS: Session[] = [
  {
    id: "s1",
    title: "Everyday vocabulary · Set 1",
    topic: "Vocabulary",
    takenAt: "Today · 09:14",
    duration: "8m 42s",
    questions: 12,
    score: 92,
    correct: 11,
    speakingScore: 88,
    pronScore: 84,
    bgHue: "158",
  },
  {
    id: "s2",
    title: "Simple present tense",
    topic: "Grammar",
    takenAt: "Yesterday · 19:02",
    duration: "9m 11s",
    questions: 10,
    score: 100,
    correct: 10,
    speakingScore: 0,
    pronScore: 0,
    bgHue: "65",
  },
  {
    id: "s3",
    title: "Research vocabulary",
    topic: "Vocabulary",
    takenAt: "Tue · 18:30",
    duration: "11m 03s",
    questions: 16,
    score: 87,
    correct: 14,
    speakingScore: 79,
    pronScore: 81,
    bgHue: "145",
  },
  {
    id: "s4",
    title: "Speaking · self-introduction",
    topic: "Speaking",
    takenAt: "Mon · 08:55",
    duration: "6m 20s",
    questions: 6,
    score: 68,
    correct: 4,
    speakingScore: 72,
    pronScore: 65,
    bgHue: "25",
  },
  {
    id: "s5",
    title: "Articles: a / an / the",
    topic: "Grammar",
    takenAt: "Last Sun · 21:08",
    duration: "9m 47s",
    questions: 14,
    score: 76,
    correct: 11,
    speakingScore: 0,
    pronScore: 0,
    bgHue: "75",
  },
];

type PracticeProps = {
  onStartTest: () => void;
};

function PracticeScreen({ onStartTest }: PracticeProps) {
  const [open, setOpen] = useState_Pr<string | null>(null);
  const cur = SESSIONS.find((x) => x.id === open) || null;

  return (
    <div className="container">
      <header className="prac-head fade-up">
        <div>
          <p className="eyebrow">Practice history</p>
          <h1 className="serif" style={{ fontSize: 40, margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
            Your <span className="serif-it">recordings</span>.
          </h1>
          <p style={{ color: "var(--ink-2)", margin: 0, maxWidth: 540 }}>
            Every practice session is saved with your camera recording so you can
            review how you did — exactly like the Duolingo English Test.
          </p>
        </div>
        <button className="btn accent lg" onClick={onStartTest}>
          New practice
          <ArrowRightIcon size={14} />
        </button>
      </header>

      <ul className="prac-list">
        {SESSIONS.map((s, i) => (
          <li
            key={s.id}
            className="prac-row fade-up"
            style={{ animationDelay: `${100 + i * 60}ms` }}
            onClick={() => setOpen(s.id)}
          >
            <div className="thumb" style={{ ["--c" as any]: s.bgHue }}>
              <FakeRecording hue={s.bgHue} />
              <div className="thumb-play">
                <PlayIcon size={20} />
              </div>
              <span className="thumb-dur mono">{s.duration}</span>
            </div>
            <div className="row-body">
              <div className="row-top">
                <span className="eyebrow">{s.topic}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  {s.takenAt}
                </span>
              </div>
              <h3 className="serif" style={{ margin: "4px 0 8px", fontSize: 19 }}>
                {s.title}
              </h3>
              <div className="row-meta mono">
                <span>{s.correct}/{s.questions} correct</span>
                <span className="dot-sep" />
                <span>{s.duration}</span>
                {s.speakingScore > 0 && (
                  <>
                    <span className="dot-sep" />
                    <span>Speaking {s.speakingScore}</span>
                  </>
                )}
              </div>
            </div>
            <div className="row-score">
              <div
                className="score-pill serif"
                data-tier={
                  s.score >= 90 ? "great" : s.score >= 75 ? "good" : "ok"
                }
              >
                {s.score}%
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                score
              </span>
            </div>
          </li>
        ))}
      </ul>

      {cur && <PlayerModal session={cur} onClose={() => setOpen(null)} onRetake={onStartTest} />}

      <style>{`
        .prac-head {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: end;
          margin-bottom: 22px;
        }
        .prac-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 10px;
        }
        .prac-row {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
          padding: 12px;
          display: grid;
          grid-template-columns: 200px 1fr auto;
          gap: 18px;
          align-items: center;
          cursor: pointer;
          transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
        }
        .prac-row:hover {
          transform: translateY(-1px);
          border-color: var(--ink-3);
          box-shadow: var(--shadow-md);
        }
        .thumb {
          position: relative;
          aspect-ratio: 16/10;
          border-radius: var(--r-md);
          overflow: hidden;
          background: oklch(0.2 0.02 var(--c));
          display: grid; place-items: center;
        }
        .thumb-play {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 44px; height: 44px;
          border-radius: 999px;
          background: oklch(1 0 0 / 0.92);
          color: var(--ink);
          display: grid; place-items: center;
          box-shadow: 0 4px 14px oklch(0 0 0 / 0.25);
          transition: transform 0.2s;
        }
        .prac-row:hover .thumb-play { transform: scale(1.08); }
        .thumb-dur {
          position: absolute;
          bottom: 8px; right: 8px;
          font-size: 10px;
          padding: 3px 6px;
          background: oklch(0 0 0 / 0.55);
          color: white;
          border-radius: 4px;
        }
        .row-body { display: flex; flex-direction: column; min-width: 0; }
        .row-top { display: flex; gap: 12px; align-items: center; }
        .row-meta {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: var(--ink-2);
          flex-wrap: wrap;
        }
        .dot-sep { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-3); }
        .row-score {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 0 18px;
        }
        .score-pill {
          font-size: 28px;
          letter-spacing: -0.02em;
          padding: 8px 16px;
          border-radius: 14px;
        }
        .score-pill[data-tier="great"] { background: var(--accent-soft); color: var(--accent-ink); }
        .score-pill[data-tier="good"]  { background: oklch(0.94 0.05 75); color: oklch(0.35 0.1 75); }
        .score-pill[data-tier="ok"]    { background: var(--rose-soft); color: var(--rose); }

        @media (max-width: 720px) {
          .prac-head { grid-template-columns: 1fr; }
          .prac-row {
            grid-template-columns: 120px 1fr;
            grid-template-rows: auto auto;
          }
          .row-score {
            grid-column: 1 / -1;
            flex-direction: row;
            justify-content: flex-end;
            padding: 0;
            border-top: 1px solid var(--line-2);
            padding-top: 8px;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}

// fake recording graphic — gradient + waveform pulse, animated
function FakeRecording({ hue }: { hue: string }) {
  return (
    <div className="fr" aria-hidden="true">
      <span className="fr-bg" />
      <span className="fr-face">
        <span className="fr-eye e1" />
        <span className="fr-eye e2" />
        <span className="fr-mouth" />
      </span>
      <div className="fr-wave">
        {Array.from({ length: 24 }).map((_, i) => (
          <i key={i} style={{ animationDelay: `${i * 0.04}s` }} />
        ))}
      </div>
      <style>{`
        .fr {
          position: absolute; inset: 0;
          overflow: hidden;
        }
        .fr-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(circle at 30% 30%, oklch(0.55 0.16 ${hue}), transparent 55%),
            radial-gradient(circle at 70% 70%, oklch(0.35 0.1 ${hue}), transparent 55%),
            oklch(0.22 0.04 ${hue});
        }
        /* abstract face silhouette */
        .fr-face {
          position: absolute;
          left: 50%; top: 42%;
          transform: translate(-50%, -50%);
          width: 56px; height: 64px;
          border-radius: 50% 50% 46% 46% / 60% 60% 40% 40%;
          background: oklch(0.7 0.06 ${hue} / 0.55);
          box-shadow: 0 0 0 8px oklch(0.7 0.06 ${hue} / 0.18);
        }
        .fr-eye {
          position: absolute;
          width: 6px; height: 6px;
          background: oklch(0.12 0.02 ${hue});
          border-radius: 50%;
          top: 26px;
        }
        .fr-eye.e1 { left: 14px; }
        .fr-eye.e2 { right: 14px; }
        .fr-mouth {
          position: absolute;
          bottom: 14px; left: 50%;
          transform: translateX(-50%);
          width: 18px; height: 8px;
          border-radius: 0 0 18px 18px;
          background: oklch(0.12 0.02 ${hue});
        }
        .fr-wave {
          position: absolute;
          bottom: 10px; left: 12px; right: 12px;
          height: 28px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 2px;
        }
        .fr-wave i {
          flex: 1;
          background: oklch(0.85 0.1 ${hue});
          border-radius: 2px;
          height: 30%;
          animation: wave 1.4s ease-in-out infinite;
        }
        @keyframes wave {
          0%, 100% { height: 18%; }
          50%      { height: 80%; }
        }
      `}</style>
    </div>
  );
}

// modal player
function PlayerModal({
  session,
  onClose,
  onRetake,
}: {
  session: Session;
  onClose: () => void;
  onRetake: () => void;
}) {
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const [isFs, setIsFs] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleFullscreen() {
    if (!stageRef.current) return;
    if (!document.fullscreenElement) {
      stageRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }

  return (
    <div className="player-backdrop fade-in" onClick={onClose}>
      <div className="player scale-in" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn player-close" onClick={onClose} aria-label="Close" title="Close (Esc)">
          <XIcon size={14} />
        </button>

        <div className="player-stage" ref={stageRef} data-fs={isFs || undefined}>
          <FakeRecording hue={session.bgHue} />
          <div className="player-controls">
            <button className="ctrl-play">
              <PlayIcon size={22} />
            </button>
            <div className="ctrl-bar">
              <span className="ctrl-bar-fill" />
            </div>
            <span className="mono" style={{ fontSize: 11, color: "white", opacity: 0.85 }}>
              0:00 / {session.duration}
            </span>
          </div>
          <button
            className="fs-btn-2"
            onClick={toggleFullscreen}
            aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFs ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFs ? <CollapseGP /> : <ExpandGP />}
          </button>
          <span
            className="mono"
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              fontSize: 11,
              color: "white",
              padding: "4px 10px",
              borderRadius: 999,
              background: "oklch(0 0 0 / 0.45)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--rose)", animation: "pulse-ring 1.6s infinite" }} />
            REC · {session.takenAt}
          </span>
        </div>

        <div className="player-body scroll-y">
          <span className="eyebrow">{session.topic}</span>
          <h2 className="serif" style={{ margin: "4px 0 14px", fontSize: 24, letterSpacing: "-0.01em" }}>
            {session.title}
          </h2>

          <div className="player-stats">
            <PlayerStat label="Overall score" value={`${session.score}%`} tone="accent" />
            <PlayerStat label="Correct" value={`${session.correct}/${session.questions}`} />
            <PlayerStat label="Duration" value={session.duration} />
            {session.speakingScore > 0 && (
              <PlayerStat label="Speaking" value={String(session.speakingScore)} />
            )}
            {session.pronScore > 0 && (
              <PlayerStat label="Pronunciation" value={String(session.pronScore)} />
            )}
          </div>

          <div className="player-actions">
            <button className="btn ghost" onClick={onClose}>Close</button>
            <button className="btn accent" onClick={onRetake}>
              Practice again
              <ArrowRightIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .player-backdrop {
          position: fixed; inset: 0; z-index: 50;
          background: oklch(0.1 0.01 85 / 0.55);
          backdrop-filter: blur(4px);
          display: grid; place-items: center;
          padding: 16px;
        }
        .player {
          width: 100%;
          max-width: 880px;
          max-height: calc(100vh - 32px);
          background: var(--surface);
          border-radius: var(--r-xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .player-close {
          position: absolute; top: 12px; right: 12px;
          z-index: 4;
          background: oklch(0 0 0 / 0.5) !important;
          color: white !important;
          border: 0 !important;
          width: 34px; height: 34px;
        }
        .player-close:hover { background: oklch(0 0 0 / 0.7) !important; }
        .player-stage {
          position: relative;
          aspect-ratio: 16/9;
          background: black;
          flex-shrink: 0;
        }
        .player-stage[data-fs] { aspect-ratio: auto; width: 100%; height: 100%; }
        .fs-btn-2 {
          position: absolute;
          bottom: 64px; right: 14px;
          z-index: 3;
          width: 34px; height: 34px;
          border-radius: 8px;
          background: oklch(0 0 0 / 0.5);
          color: white;
          border: 0;
          cursor: pointer;
          display: grid; place-items: center;
        }
        .fs-btn-2:hover { background: oklch(0 0 0 / 0.75); }
        .player-controls {
          position: absolute;
          left: 14px; right: 14px; bottom: 14px;
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px;
          background: oklch(0 0 0 / 0.45);
          backdrop-filter: blur(8px);
          border-radius: var(--r-md);
        }
        .ctrl-play {
          width: 38px; height: 38px;
          border-radius: 999px;
          background: white; color: black;
          border: 0;
          cursor: pointer;
          display: grid; place-items: center;
        }
        .ctrl-bar {
          flex: 1;
          height: 4px;
          background: oklch(1 0 0 / 0.25);
          border-radius: 999px;
          overflow: hidden;
        }
        .ctrl-bar-fill {
          display: block;
          width: 32%;
          height: 100%;
          background: white;
        }
        .player-body {
          padding: 24px 28px 22px;
          flex: 1;
          min-height: 0;
        }
        .player-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
          margin-bottom: 18px;
        }
        .player-actions {
          display: flex; gap: 10px; justify-content: flex-end;
        }
        @media (max-width: 520px) {
          .player-body { padding: 18px 18px 16px; }
        }
      `}</style>
    </div>
  );
}

function ExpandGP() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
    </svg>
  );
}
function CollapseGP() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
    </svg>
  );
}

function PlayerStat({ label, value, tone }: { label: string; value: string; tone?: "accent" }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: tone === "accent" ? "var(--accent-soft)" : "var(--bg-2)",
        borderRadius: "var(--r-md)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span className="eyebrow" style={{ color: tone === "accent" ? "var(--accent-ink)" : undefined }}>
        {label}
      </span>
      <strong
        className="serif"
        style={{
          fontSize: 22,
          letterSpacing: "-0.02em",
          color: tone === "accent" ? "var(--accent-ink)" : undefined,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

(window as any).PracticeScreen = PracticeScreen;
