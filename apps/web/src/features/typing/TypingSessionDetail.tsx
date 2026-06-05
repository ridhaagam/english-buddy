import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon, CheckIcon, XIcon, EyeIcon, ZapIcon, ClockIcon, PlayIcon, KeyboardIcon,
} from "../../components/ui";
import { api } from "../../lib/api";
import "./TypingSessionDetail.css";

const modeLabel: Record<string, string> = { type: "See & type", dictation: "Dictation", review: "Review" };

export function TypingSessionDetail({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { data: s, isLoading } = useQuery({
    queryKey: ["typing-session", sessionId],
    queryFn: () => api.typing.session(sessionId),
  });

  function play(url: string) {
    // audio_url is an absolute origin path (/api/v1/...); just attach the token
    // query since <audio> can't send an Authorization header.
    if (!audioRef.current) audioRef.current = new Audio();
    const token = localStorage.getItem("access_token");
    audioRef.current.pause();
    audioRef.current.src = `${url}${token ? `?token=${token}` : ""}`;
    audioRef.current.play().catch(() => {});
  }

  if (isLoading) {
    return <div className="container" style={{ paddingTop: 48, textAlign: "center" }}><div className="dot-load"><i /><i /><i /></div></div>;
  }
  if (!s) {
    return (
      <div className="container" style={{ paddingTop: 48 }}>
        <button className="btn ghost" onClick={onBack}><ArrowLeftIcon size={14} /> Back</button>
        <p style={{ color: "var(--ink-3)", marginTop: 24 }}>Session not found.</p>
      </div>
    );
  }

  const words: any[] = s.words ?? [];
  const clean = words.filter((w) => w.correct && !w.revealed).length;
  const peeked = words.filter((w) => w.revealed).length;
  const seconds = Math.round((s.duration_ms ?? 0) / 1000);

  return (
    <div className="container tsd">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 12, flexWrap: "wrap" }}>
        <button className="btn ghost" style={{ gap: 6 }} onClick={onBack}>
          <ArrowLeftIcon size={14} /> Back to practice history
        </button>
      </div>

      {/* Header */}
      <div className="card tsd-head fade-up">
        <div className="tsd-head-mark"><KeyboardIcon size={22} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="eyebrow" style={{ margin: "0 0 4px" }}>Typing session</p>
          <h1 className="serif" style={{ margin: "0 0 8px", fontSize: 28, letterSpacing: "-0.02em" }}>{s.deck_title}</h1>
          <div className="tsd-head-meta">
            <span className="mono tsd-pill">{modeLabel[s.mode] ?? s.mode}</span>
            {s.mode !== "review" && <span className="mono tsd-pill">chapter {s.chapter_index + 1}</span>}
            {s.finished_at && <span>{new Date(s.finished_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>}
            {seconds > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><ClockIcon size={12} /> {seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`}</span>}
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="tsd-stats fade-up" style={{ animationDelay: "0.05s" }}>
        <Stat value={`${s.wpm}`} label="WPM" icon={<ZapIcon size={13} />} accent />
        <Stat value={`${s.accuracy}%`} label="Accuracy" />
        <Stat value={words.length ? `${clean}/${s.total}` : `${s.correct}/${s.total}`} label="Clean words" />
        <Stat value={`+${s.xp_earned}`} label="XP earned" />
      </div>

      {/* Per-word breakdown */}
      <div className="card tsd-words fade-up" style={{ animationDelay: "0.1s" }}>
        <div className="tsd-words-head">
          <p className="eyebrow" style={{ margin: 0 }}>Words ({words.length || s.total})</p>
          {peeked > 0 && (
            <span className="tsd-peek-note"><EyeIcon size={12} /> {peeked} revealed</span>
          )}
        </div>

        {words.length === 0 ? (
          <p style={{ color: "var(--ink-3)", fontSize: 13, margin: "8px 0 0" }}>
            This run was recorded before per-word history was tracked — only the summary above is available.
          </p>
        ) : (
          <div className="tsd-word-list">
            {words.map((w, i) => {
              const state = w.revealed ? "peeked" : w.correct ? "clean" : "wrong";
              return (
                <div key={i} className={`tsd-word ${state}`}>
                  <div className={`tsd-word-ico ${state}`}>
                    {state === "clean" ? <CheckIcon size={13} /> : state === "peeked" ? <EyeIcon size={13} /> : <XIcon size={13} />}
                  </div>
                  <div className="tsd-word-main">
                    <div className="tsd-word-top">
                      <span className="tsd-word-text">{w.word}</span>
                      {w.phonetic && <span className="mono tsd-word-phon">{w.phonetic}</span>}
                    </div>
                    {w.translation && <span className="tsd-word-tr">{w.translation}</span>}
                  </div>
                  <span className={`tsd-word-tag ${state}`}>
                    {state === "clean" ? "Clean" : state === "peeked" ? "Revealed" : "Mistake"}
                  </span>
                  <button className="tsd-word-play" onClick={() => play(w.audio_url)} aria-label={`Play ${w.word}`}>
                    <PlayIcon size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, icon, accent }: { value: string; label: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`tsd-stat${accent ? " accent" : ""}`}>
      <span className="tsd-stat-val mono">{icon}{value}</span>
      <span className="tsd-stat-lbl">{label}</span>
    </div>
  );
}
