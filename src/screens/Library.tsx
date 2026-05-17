// src/screens/Library.tsx — catalog of practice modules with highest scores
const { useState: useState_Li } = React;

type LibraryItem = {
  id: string;
  title: string;
  topic: string;
  level: "A2" | "B1" | "B2" | "C1";
  questions: number;
  highScore: number | null; // %; null = never attempted
  attempts: number;
  lastTaken: string | null;
  color: string; // accent for the tile
};

const LIB: LibraryItem[] = [
  {
    id: "vocab-daily-1",
    title: "Everyday vocabulary · Set 1",
    topic: "Vocabulary",
    level: "A2",
    questions: 12,
    highScore: 92,
    attempts: 4,
    lastTaken: "Today, 09:14",
    color: "158",
  },
  {
    id: "vocab-research",
    title: "Research vocabulary",
    topic: "Vocabulary",
    level: "B2",
    questions: 16,
    highScore: 87,
    attempts: 2,
    lastTaken: "Yesterday",
    color: "145",
  },
  {
    id: "grammar-simple-present",
    title: "Simple present tense",
    topic: "Grammar",
    level: "A2",
    questions: 10,
    highScore: 100,
    attempts: 3,
    lastTaken: "2 days ago",
    color: "65",
  },
  {
    id: "grammar-articles",
    title: "Articles: a / an / the",
    topic: "Grammar",
    level: "B1",
    questions: 14,
    highScore: 76,
    attempts: 1,
    lastTaken: "3 days ago",
    color: "75",
  },
  {
    id: "listening-news",
    title: "Listening · short news clips",
    topic: "Listening",
    level: "B1",
    questions: 8,
    highScore: 81,
    attempts: 2,
    lastTaken: "Last week",
    color: "220",
  },
  {
    id: "speaking-intro",
    title: "Speaking · self-introduction",
    topic: "Speaking",
    level: "A2",
    questions: 6,
    highScore: 68,
    attempts: 1,
    lastTaken: "Last week",
    color: "25",
  },
  {
    id: "writing-emails",
    title: "Writing · short emails",
    topic: "Writing",
    level: "B1",
    questions: 8,
    highScore: null,
    attempts: 0,
    lastTaken: null,
    color: "300",
  },
  {
    id: "vocab-deraining",
    title: "Image deraining · technical terms",
    topic: "Vocabulary",
    level: "C1",
    questions: 10,
    highScore: null,
    attempts: 0,
    lastTaken: null,
    color: "200",
  },
];

const TOPICS = ["All", "Vocabulary", "Grammar", "Listening", "Speaking", "Writing"];

type LibraryProps = {
  onStartTest: () => void;
};

function LibraryScreen({ onStartTest }: LibraryProps) {
  const [topic, setTopic] = (useLocalState as any)("learner.library.topic", "All");
  const filtered = topic === "All" ? LIB : LIB.filter((x) => x.topic === topic);

  return (
    <div className="container">
      <header className="lib-head fade-up">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="serif" style={{ fontSize: 40, margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
            Pick a <span className="serif-it">topic</span> and practice.
          </h1>
          <p style={{ color: "var(--ink-2)", margin: 0, maxWidth: 520 }}>
            Every module is reusable — your highest score is saved and you can
            practice again anytime.
          </p>
        </div>
        <div className="lib-stats">
          <div>
            <span className="eyebrow">Modules</span>
            <strong className="serif">{LIB.length}</strong>
          </div>
          <div>
            <span className="eyebrow">Avg high score</span>
            <strong className="serif">
              {Math.round(
                LIB.filter((x) => x.highScore !== null).reduce(
                  (a, b) => a + (b.highScore || 0),
                  0
                ) / LIB.filter((x) => x.highScore !== null).length
              )}
              %
            </strong>
          </div>
        </div>
      </header>

      <div className="topic-bar fade-up" style={{ animationDelay: "120ms" }}>
        {TOPICS.map((t) => (
          <button
            key={t}
            className="topic-chip"
            data-active={topic === t || undefined}
            onClick={() => setTopic(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="lib-grid">
        {filtered.map((it, i) => (
          <li
            key={it.id}
            className="lib-tile fade-up"
            style={{
              animationDelay: `${180 + i * 50}ms`,
              ["--c" as any]: it.color,
            }}
          >
            <div className="tile-top">
              <div className="tile-glyph" aria-hidden="true">
                <ModuleGlyph topic={it.topic} />
              </div>
              <span className="tile-level mono">{it.level}</span>
            </div>

            <div className="tile-body">
              <span className="eyebrow">{it.topic}</span>
              <h3 className="serif" style={{ margin: "4px 0 10px", fontSize: 19 }}>
                {it.title}
              </h3>
              <div className="tile-meta mono">
                <span>{it.questions} questions</span>
                <span className="dot-sep" />
                <span>{it.attempts} attempts</span>
              </div>
            </div>

            <div className="tile-score">
              {it.highScore !== null ? (
                <>
                  <div className="hs">
                    <span className="eyebrow">High score</span>
                    <span className="hs-val serif">{it.highScore}%</span>
                  </div>
                  <ProgressBar value={(it.highScore || 0) / 100} />
                </>
              ) : (
                <div className="hs-empty">
                  <span className="eyebrow">Not attempted yet</span>
                  <p className="mono" style={{ margin: 0, fontSize: 11, color: "var(--ink-3)" }}>
                    Try this one →
                  </p>
                </div>
              )}
            </div>

            <button className="btn ghost tile-action" onClick={onStartTest}>
              {it.highScore !== null ? "Practice again" : "Start practice"}
              <ArrowRightIcon size={14} />
            </button>
          </li>
        ))}
      </ul>

      <style>{`
        .lib-head {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 24px;
          align-items: end;
          margin-bottom: 22px;
        }
        .lib-stats {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        }
        .lib-stats > div {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          padding: 14px 16px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .lib-stats strong { font-size: 26px; letter-spacing: -0.02em; }

        .topic-bar {
          display: flex; gap: 6px; overflow-x: auto;
          padding: 4px 0 18px;
          scrollbar-width: none;
        }
        .topic-bar::-webkit-scrollbar { display: none; }
        .topic-chip {
          background: transparent;
          border: 1px solid var(--line);
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 13px;
          color: var(--ink-2);
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .topic-chip:hover { background: var(--bg-2); color: var(--ink); }
        .topic-chip[data-active] {
          background: var(--ink); color: white; border-color: var(--ink);
        }

        .lib-grid {
          list-style: none;
          padding: 0; margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .lib-tile {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-xl);
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .lib-tile::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 4px;
          background: oklch(0.7 0.14 var(--c));
        }
        .lib-tile:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: oklch(0.7 0.14 var(--c) / 0.5);
        }
        .tile-top {
          display: flex; align-items: center; justify-content: space-between;
        }
        .tile-glyph {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: oklch(0.95 0.04 var(--c));
          color: oklch(0.4 0.1 var(--c));
          display: grid; place-items: center;
        }
        .tile-level {
          font-size: 10px;
          background: var(--bg-2);
          padding: 4px 8px;
          border-radius: 6px;
          color: var(--ink-3);
          border: 1px solid var(--line);
        }
        .tile-meta {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; color: var(--ink-3);
        }
        .dot-sep { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-3); }
        .tile-score { display: flex; flex-direction: column; gap: 8px; }
        .hs { display: flex; justify-content: space-between; align-items: baseline; }
        .hs-val { font-size: 24px; color: oklch(0.4 0.1 var(--c)); letter-spacing: -0.02em; }
        .hs-empty {
          padding: 10px 12px;
          background: var(--bg-2);
          border-radius: var(--r-sm);
          display: flex; flex-direction: column; gap: 2px;
        }
        .tile-action {
          margin-top: auto;
          width: 100%;
        }

        @media (max-width: 720px) {
          .lib-head { grid-template-columns: 1fr; }
          .lib-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function ModuleGlyph({ topic }: { topic: string }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (topic) {
    case "Vocabulary":
      return (
        <svg {...common}>
          <path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z" />
          <path d="M4 17h13a3 3 0 0 1 3 3" />
          <path d="M8 9h8M8 12h6" />
        </svg>
      );
    case "Grammar":
      return (
        <svg {...common}>
          <path d="M4 5h16M4 12h10M4 19h7" />
          <circle cx="18" cy="17" r="3" />
        </svg>
      );
    case "Listening":
      return (
        <svg {...common}>
          <path d="M4 14a8 8 0 0 1 16 0v3a3 3 0 0 1-3 3h-1v-7h4" />
          <path d="M4 14v3a3 3 0 0 0 3 3h1v-7H4" />
        </svg>
      );
    case "Speaking":
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      );
    case "Writing":
      return (
        <svg {...common}>
          <path d="M4 20h16" />
          <path d="M14 4l6 6L8 22H2v-6z" />
        </svg>
      );
    default:
      return null;
  }
}

(window as any).LibraryScreen = LibraryScreen;
