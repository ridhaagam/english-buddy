import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProgressBar, ArrowRightIcon, ModuleGlyph } from "../../components/ui";
import { api } from "../../lib/api";

const TOPICS = ["All", "Vocabulary", "Grammar", "Listening", "Speaking", "Writing"];

type Props = { onStartTest: (moduleId?: string) => void };

export function LibraryScreen({ onStartTest }: Props) {
  const [topic, setTopic] = useState("All");
  const { data: library = [] } = useQuery({
    queryKey: ["library", topic],
    queryFn: () => api.library.list(topic !== "All" ? { topic: topic.toLowerCase() } : undefined),
  });

  const avgHigh = library.filter((x: any) => x.high_score !== null).length
    ? Math.round(library.filter((x: any) => x.high_score !== null).reduce((a: number, b: any) => a + (b.high_score || 0), 0) / library.filter((x: any) => x.high_score !== null).length)
    : 0;

  const topicColors: Record<string, string> = {
    vocabulary: "158", grammar: "65", listening: "220", speaking: "25", writing: "300",
  };

  return (
    <div className="container">
      <header className="lib-head fade-up">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="serif" style={{ fontSize: 40, margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
            Pick a <span className="serif-it">topic</span> and practice.
          </h1>
          <p style={{ color: "var(--ink-2)", margin: 0, maxWidth: 520 }}>
            Every module is reusable — your highest score is saved and you can practice again anytime.
          </p>
        </div>
        <div className="lib-stats">
          <div><span className="eyebrow">Modules</span><strong className="serif">{library.length}</strong></div>
          <div><span className="eyebrow">Avg high score</span><strong className="serif">{avgHigh}%</strong></div>
        </div>
      </header>

      <div className="topic-bar fade-up" style={{ animationDelay: "120ms" }}>
        {TOPICS.map((t) => (
          <button key={t} className="topic-chip" data-active={topic === t ? true : undefined} onClick={() => setTopic(t)}>{t}</button>
        ))}
      </div>

      {library.length === 0 && (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-3)" }}>
          <p className="serif" style={{ fontSize: 20 }}>No modules yet in this topic.</p>
        </div>
      )}

      <ul className="lib-grid">
        {library.map((it: any, i: number) => {
          const c = topicColors[it.topic] || "158";
          return (
            <li key={it.id} className="lib-tile fade-up" style={{ animationDelay: `${180 + i * 50}ms`, ["--c" as any]: c }}>
              <div className="tile-top">
                <div className="tile-glyph" aria-hidden="true"><ModuleGlyph topic={it.topic} /></div>
                <span className="tile-level mono">{it.cefr_level}</span>
              </div>
              <div className="tile-body">
                <span className="eyebrow" style={{ textTransform: "capitalize" }}>{it.topic}</span>
                <h3 className="serif" style={{ margin: "4px 0 10px", fontSize: 19 }}>{it.title}</h3>
                <div className="tile-meta mono">
                  <span>{it.questions_count} questions</span>
                  <span className="dot-sep" />
                  <span>{it.my_attempts} attempts</span>
                </div>
              </div>
              <div className="tile-score">
                {it.high_score !== null ? (
                  <>
                    <div className="hs">
                      <span className="eyebrow">High score</span>
                      <span className="hs-val serif">{it.high_score}%</span>
                    </div>
                    <ProgressBar value={(it.high_score || 0) / 100} />
                  </>
                ) : (
                  <div className="hs-empty">
                    <span className="eyebrow">Not attempted yet</span>
                    <p className="mono" style={{ margin: 0, fontSize: 11, color: "var(--ink-3)" }}>Try this one →</p>
                  </div>
                )}
              </div>
              <button className="btn ghost tile-action" onClick={() => onStartTest(it.id)}>
                {it.high_score !== null ? "Practice again" : "Start practice"}
                <ArrowRightIcon size={14} />
              </button>
            </li>
          );
        })}
      </ul>

      <style>{`
        .lib-head { display:grid; grid-template-columns:1.4fr 1fr; gap:24px; align-items:end; margin-bottom:22px; }
        .lib-stats { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .lib-stats>div { background:var(--surface); border:1px solid var(--line); border-radius:var(--r-md); padding:14px 16px; display:flex; flex-direction:column; gap:4px; }
        .lib-stats strong { font-size:26px; letter-spacing:-0.02em; }
        .topic-bar { display:flex; gap:6px; overflow-x:auto; padding:4px 0 18px; scrollbar-width:none; }
        .topic-bar::-webkit-scrollbar { display:none; }
        .lib-grid { list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
        .lib-tile { background:var(--surface); border:1px solid var(--line); border-radius:var(--r-xl); padding:18px; display:flex; flex-direction:column; gap:14px; transition:transform 0.2s ease,box-shadow 0.2s ease,border-color 0.2s ease; position:relative; overflow:hidden; }
        .lib-tile::before { content:""; position:absolute; inset:0 0 auto 0; height:4px; background:oklch(0.7 0.14 var(--c)); }
        .lib-tile:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); border-color:oklch(0.7 0.14 var(--c)/0.5); }
        .tile-top { display:flex; align-items:center; justify-content:space-between; }
        .tile-glyph { width:44px;height:44px; border-radius:12px; background:oklch(0.95 0.04 var(--c)); color:oklch(0.4 0.1 var(--c)); display:grid; place-items:center; }
        .tile-level { font-size:10px; background:var(--bg-2); padding:4px 8px; border-radius:6px; color:var(--ink-3); border:1px solid var(--line); }
        .tile-meta { display:flex; align-items:center; gap:8px; font-size:11px; color:var(--ink-3); }
        .tile-score { display:flex; flex-direction:column; gap:8px; }
        .hs { display:flex; justify-content:space-between; align-items:baseline; }
        .hs-val { font-size:24px; color:oklch(0.4 0.1 var(--c)); letter-spacing:-0.02em; }
        .hs-empty { padding:10px 12px; background:var(--bg-2); border-radius:var(--r-sm); display:flex; flex-direction:column; gap:2px; }
        .tile-action { margin-top:auto; width:100%; }
        @media(max-width:720px) { .lib-head{grid-template-columns:1fr} .lib-grid{grid-template-columns:1fr} }
        @media(max-width:480px) { .lib-stats{grid-template-columns:1fr} }
      `}</style>
    </div>
  );
}
