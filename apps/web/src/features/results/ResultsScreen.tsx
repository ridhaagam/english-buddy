import { useEffect, useRef } from "react";
import { ArrowRightIcon, CheckIcon, XIcon, SparkleIcon } from "../../components/ui";
import "./ResultsScreen.css";

type Props = {
  result: any;
  onRetry: () => void;
  onHome: () => void;
};

export function ResultsScreen({ result, onRetry, onHome }: Props) {
  const pct = Math.round(result?.score_pct ?? 0);
  const xp = result?.xp_earned ?? 0;
  const timeMs = result?.timeMs ?? 0;
  const answers = result?.answers ?? [];
  const answersRevealed: boolean = result?.answers_revealed ?? true;
  const perfect = pct === 100;
  const passed = pct >= 70;

  const circleRef = useRef<SVGCircleElement>(null);
  const r = 54;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    if (!circleRef.current) return;
    const offset = circ * (1 - pct / 100);
    circleRef.current.style.transition = "none";
    circleRef.current.style.strokeDashoffset = String(circ);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!circleRef.current) return;
        circleRef.current.style.transition = "stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1)";
        circleRef.current.style.strokeDashoffset = String(offset);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    <div className="res-shell">
      <div className="res-card fade-up">
        <div className="res-top">
          <div className="score-ring-wrap">
            <svg viewBox="0 0 120 120" width="140" height="140">
              <circle cx="60" cy="60" r={r} stroke="var(--line)" strokeWidth="8" fill="none" />
              <circle ref={circleRef} cx="60" cy="60" r={r}
                stroke={perfect ? "url(#perfGrad)" : passed ? "url(#passGrad)" : "url(#failGrad)"}
                strokeWidth="8" fill="none"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ}
                transform="rotate(-90 60 60)"
              />
              <defs>
                <linearGradient id="perfGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.14 145)" />
                  <stop offset="100%" stopColor="oklch(0.55 0.12 158)" />
                </linearGradient>
                <linearGradient id="passGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.14 158)" />
                  <stop offset="100%" stopColor="oklch(0.55 0.12 158)" />
                </linearGradient>
                <linearGradient id="failGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.1 30)" />
                  <stop offset="100%" stopColor="oklch(0.55 0.1 25)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="score-label">
              <strong className="serif">{pct}%</strong>
              <span className="mono">score</span>
            </div>
          </div>

          <div className="res-headline">
            {perfect && <p className="eyebrow" style={{ color: "var(--accent-ink)" }}><SparkleIcon size={12} /> Perfect session!</p>}
            {!perfect && passed && <p className="eyebrow" style={{ color: "var(--accent-ink)" }}>Good work!</p>}
            {!passed && <p className="eyebrow" style={{ color: "oklch(0.55 0.1 25)" }}>Keep practising!</p>}
            <h1 className="serif" style={{ fontSize: 34, margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
              {perfect ? "Flawless!" : passed ? "Session complete." : "Almost there."}
            </h1>
            <p style={{ color: "var(--ink-2)", margin: 0 }}>
              {passed
                ? `You scored ${pct}% and earned ${xp} XP.`
                : `You scored ${pct}%. Review and try again to improve!`}
            </p>
          </div>
        </div>

        <div className="res-chips">
          <div className="chip">
            <span className="eyebrow">XP earned</span>
            <strong className="serif" style={{ fontSize: 22, color: "var(--accent-ink)" }}>+{xp}</strong>
          </div>
          <div className="chip">
            <span className="eyebrow">Time</span>
            <strong className="serif" style={{ fontSize: 22 }}>{formatTime(timeMs)}</strong>
          </div>
          <div className="chip">
            <span className="eyebrow">Questions</span>
            <strong className="serif" style={{ fontSize: 22 }}>{answers.length}</strong>
          </div>
        </div>

        {!answersRevealed && (
          <div style={{ padding: "14px 18px", borderRadius: "var(--r-md)", background: "oklch(0.97 0.03 85)", border: "1px solid oklch(0.88 0.06 85)" }}>
            <strong style={{ fontSize: 14 }}>Results not yet available</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)" }}>
              Correct answers will be revealed by your instructor at a later date.
            </p>
          </div>
        )}

        {answersRevealed && answers.length > 0 && (
          <div className="ans-list">
            <p className="eyebrow" style={{ marginBottom: 10 }}>Answer breakdown</p>
            {answers.map((a: any, i: number) => (
              <div key={i} className={`ans-block ${a.is_correct ? "ans-correct" : "ans-wrong"}`}>
                <div className="ans-row">
                  <div className={`ans-icon ${a.is_correct ? "correct" : "wrong"}`}>
                    {a.is_correct ? <CheckIcon size={12} /> : <XIcon size={12} />}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{a.prompt || `Question ${i + 1}`}</span>
                  <span className={`ans-verdict mono ${a.is_correct ? "v-correct" : "v-wrong"}`}>
                    {a.is_correct ? "Benar ✓" : "Salah ✗"}
                  </span>
                </div>

                {a.choices && a.choices.length > 0 && (
                  <div className="ans-choices">
                    {a.choices.map((c: any) => {
                      const isCorrect = c.id === a.correct_id;
                      const isChosen = c.id === a.chosen_id;
                      return (
                        <div key={c.id} className={`ans-choice ${isCorrect ? "ac-correct" : isChosen ? "ac-wrong" : "ac-neutral"}`}>
                          <span className="ac-key mono">{isCorrect ? "✓" : isChosen ? "✗" : c.id.toUpperCase()}</span>
                          <span className="ac-label">{c.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!a.choices?.length && !a.is_correct && a.correct_answer && (
                  <div style={{ marginTop: 6, paddingLeft: 36, fontSize: 13, color: "var(--ink-2)" }}>
                    Jawaban benar / Correct answer: <strong style={{ color: "oklch(0.4 0.12 158)" }}>{a.correct_answer}</strong>
                  </div>
                )}

                {a.explain && (
                  <div className="ans-explain">
                    <p className="eyebrow" style={{ fontSize: 10, marginBottom: 6, color: "var(--ink-3)" }}>Penjelasan / Explanation</p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a.explain}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="res-actions">
          <button className="btn ghost" onClick={onHome}>Back to home</button>
          <button className="btn accent lg" onClick={onRetry}>
            Practice again <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>

    </div>
  );
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
