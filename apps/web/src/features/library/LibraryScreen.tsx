import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProgressBar, ArrowRightIcon, ModuleGlyph, LayersIcon } from "../../components/ui";
import { api } from "../../lib/api";
import "./LibraryScreen.css";

const TOPICS = ["All", "Vocabulary", "Grammar", "Listening", "Speaking", "Writing"];

type Props = { onStartTest: (moduleId?: string) => void };

export function LibraryScreen({ onStartTest }: Props) {
  const [topic, setTopic] = useState("All");
  const { data: library = [] } = useQuery({
    queryKey: ["library", topic],
    queryFn: () => api.library.list(topic !== "All" ? { topic: topic.toLowerCase() } : undefined),
  });

  const topicColors: Record<string, string> = {
    vocabulary: "158", grammar: "65", listening: "220", speaking: "25", writing: "300",
  };

  const isModuleClosed = (m: any): boolean => {
    if (m.is_closed) return true;
    if (m.deadline && new Date(m.deadline) < new Date()) return true;
    return false;
  };

  // Separate exam modules from regular practice modules
  const examModules = useMemo(() => (library as any[]).filter((m: any) => m.is_exam), [library]);
  const practiceLibrary = useMemo(() => (library as any[]).filter((m: any) => !m.is_exam), [library]);

  // Group modules by course; modules with no course go into "Other"
  const groups = useMemo(() => {
    const map = new Map<string, { id: string | null; title: string; modules: any[] }>();
    for (const m of practiceLibrary as any[]) {
      const key = m.course_id ?? "__other__";
      if (!map.has(key)) {
        map.set(key, { id: m.course_id ?? null, title: m.course_title ?? "Other", modules: [] });
      }
      map.get(key)!.modules.push(m);
    }
    // Sort: named courses first (alphabetically), "Other" last
    const entries = Array.from(map.values());
    entries.sort((a, b) => {
      if (a.id === null) return 1;
      if (b.id === null) return -1;
      return a.title.localeCompare(b.title);
    });
    return entries;
  }, [library]);

  const isEmpty = (library as any[]).length === 0 && examModules.length === 0;
  const avgHigh = (library as any[]).filter((x: any) => x.high_score !== null).length
    ? Math.round((library as any[]).filter((x: any) => x.high_score !== null).reduce((a: number, b: any) => a + (b.high_score || 0), 0) / (library as any[]).filter((x: any) => x.high_score !== null).length)
    : 0;

  const hasCourses = groups.some((g) => g.id !== null);

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
          <div><span className="eyebrow">Modules</span><strong className="serif">{(library as any[]).length}</strong></div>
          <div><span className="eyebrow">Avg high score</span><strong className="serif">{avgHigh}%</strong></div>
        </div>
      </header>

      <div className="topic-bar fade-up" style={{ animationDelay: "120ms" }}>
        {TOPICS.map((t) => (
          <button key={t} className="topic-chip" data-active={topic === t ? true : undefined} onClick={() => setTopic(t)}>{t}</button>
        ))}
      </div>

      {isEmpty && (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-3)" }}>
          <LayersIcon size={40} />
          <p className="serif" style={{ fontSize: 20, marginTop: 16 }}>No modules available yet.</p>
          <p style={{ fontSize: 14, color: "var(--ink-3)", marginTop: 4 }}>Your instructor will assign modules to you soon.</p>
        </div>
      )}

      {/* Exam Corner — timed exams shown before regular practice modules */}
      {examModules.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>🎓</span>
            <h2 className="serif" style={{ margin: 0, fontSize: 22, letterSpacing: "-0.015em" }}>Exam Corner</h2>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
              {examModules.length} exam{examModules.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ul className="lib-grid">
            {examModules.map((it: any, i: number) => {
              const c = topicColors[it.topic] || "158";
              const closed = isModuleClosed(it);
              return (
                <li key={it.id} className={`lib-tile fade-up${closed ? " lib-tile-closed" : ""}`} style={{ animationDelay: `${180 + i * 50}ms`, ["--c" as any]: c, borderColor: "oklch(0.85 0.07 55)", background: "oklch(0.985 0.015 55)" }}>
                  <div className="tile-top">
                    <div className="tile-glyph" aria-hidden="true"><ModuleGlyph topic={it.topic} /></div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span className="mono" style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: "oklch(0.93 0.08 55)", color: "oklch(0.45 0.12 55)", border: "1px solid oklch(0.85 0.08 55)", fontWeight: 700 }}>EXAM</span>
                      {closed && <span className="tile-closed-badge mono">CLOSED</span>}
                      <span className="tile-level mono">{it.cefr_level}</span>
                    </div>
                  </div>
                  <div className="tile-body">
                    <span className="eyebrow" style={{ textTransform: "capitalize" }}>{it.topic}</span>
                    <h3 className="serif" style={{ margin: "4px 0 10px", fontSize: 19 }}>{it.title}</h3>
                    <div className="tile-meta mono">
                      <span>{it.questions_count} questions</span>
                      <span className="dot-sep" />
                      <span>{it.my_attempts} attempt{it.my_attempts !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="tile-score">
                    {it.high_score !== null ? (
                      <>
                        <div className="hs">
                          <span className="eyebrow">Score</span>
                          <span className="hs-val serif">{it.high_score}%</span>
                        </div>
                        <ProgressBar value={(it.high_score || 0) / 100} />
                      </>
                    ) : (
                      <div className="hs-empty">
                        <span className="eyebrow">Not attempted</span>
                        <p className="mono" style={{ margin: 0, fontSize: 11, color: "var(--ink-3)" }}>Results hidden until revealed</p>
                      </div>
                    )}
                  </div>
                  {closed ? (
                    <button className="btn ghost tile-action" disabled>
                      Module closed
                    </button>
                  ) : (
                    <button className="btn ghost tile-action" style={{ borderColor: "oklch(0.78 0.1 55)", color: "oklch(0.45 0.12 55)" }} onClick={() => onStartTest(it.id)}>
                      {it.my_attempts > 0 ? "Retake exam" : "Start exam"}
                      <ArrowRightIcon size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Grouped sections (only show headers when there are real courses) */}
      {groups.map((group) => (
        <div key={group.id ?? "__other__"} style={{ marginBottom: 32 }}>
          {hasCourses && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              {group.id ? <LayersIcon size={14} /> : null}
              <h2 className="serif" style={{ margin: 0, fontSize: 22, letterSpacing: "-0.015em" }}>{group.title}</h2>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                {group.modules.length} module{group.modules.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          <ul className="lib-grid">
            {group.modules.map((it: any, i: number) => {
              const c = topicColors[it.topic] || "158";
              const closed = isModuleClosed(it);
              return (
                <li key={it.id} className={`lib-tile fade-up${closed ? " lib-tile-closed" : ""}`} style={{ animationDelay: `${180 + i * 50}ms`, ["--c" as any]: c }}>
                  <div className="tile-top">
                    <div className="tile-glyph" aria-hidden="true"><ModuleGlyph topic={it.topic} /></div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      {closed && <span className="tile-closed-badge mono">CLOSED</span>}
                      <span className="tile-level mono">{it.cefr_level}</span>
                    </div>
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
                  {closed ? (
                    <button className="btn ghost tile-action" disabled>
                      Module closed
                    </button>
                  ) : (
                    <button className="btn ghost tile-action" onClick={() => onStartTest(it.id)}>
                      {it.high_score !== null ? "Practice again" : "Start practice"}
                      <ArrowRightIcon size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

    </div>
  );
}
