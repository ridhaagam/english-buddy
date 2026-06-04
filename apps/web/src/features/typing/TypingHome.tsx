import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import {
  KeyboardIcon, ZapIcon, CheckIcon, FlameIcon, ArrowRightIcon, PlayIcon,
  TrophyIcon, BookOpenIcon, MicIcon,
} from "../../components/ui";
import "./TypingHome.css";

export type TypingLaunch = {
  deckId: string | null;
  deckTitle: string;
  chapterIndex: number;
  chapterCount?: number;
  mode: "type" | "dictation" | "review";
};

export function TypingHome({ onPlay }: { onPlay: (l: TypingLaunch) => void }) {
  const [mode, setMode] = useState<"type" | "dictation">("type");

  const decksQ = useQuery({ queryKey: ["typing-decks"], queryFn: api.typing.decks });
  const statsQ = useQuery({ queryKey: ["typing-stats"], queryFn: api.typing.stats });

  const stats = statsQ.data;
  const decks = decksQ.data ?? [];

  return (
    <div className="container tw-home">
      <header className="tw-hero fade-up">
        <div className="tw-hero-mark"><KeyboardIcon size={26} /></div>
        <div className="tw-hero-text">
          <p className="eyebrow">Typing trainer</p>
          <h1 className="serif tw-hero-title">Type the words into memory.</h1>
          <p className="tw-hero-sub">
            Hear each word, type it letter by letter, and watch your speed climb.
            Mistakes go straight to your review book.
          </p>
        </div>
        <div className="tw-hero-stats">
          <StatPill icon={<ZapIcon size={15} />} label="Best WPM" value={stats?.best_wpm ?? 0} />
          <StatPill icon={<CheckIcon size={15} />} label="Mastered" value={stats?.words_mastered ?? 0} />
          <StatPill icon={<FlameIcon size={15} />} label="Accuracy" value={stats ? `${stats.avg_accuracy}%` : "—"} />
        </div>
      </header>

      <div className="tw-modebar fade-up" style={{ animationDelay: "0.05s" }}>
        <span className="eyebrow">Mode</span>
        <div className="tw-seg" role="group" aria-label="Practice mode">
          <button aria-pressed={mode === "type"} className={mode === "type" ? "on" : ""} onClick={() => setMode("type")}>
            <BookOpenIcon size={15} /> See &amp; type
          </button>
          <button aria-pressed={mode === "dictation"} className={mode === "dictation" ? "on" : ""} onClick={() => setMode("dictation")}>
            <MicIcon size={15} /> Dictation
          </button>
        </div>
        <span className="tw-mode-hint">
          {mode === "type" ? "The word is shown — type along to learn the spelling." : "The word is hidden — listen and type what you hear."}
        </span>
      </div>

      {stats && stats.review_count > 0 && (
        <button
          className="tw-review-card fade-up"
          style={{ animationDelay: "0.1s" }}
          onClick={() => onPlay({ deckId: null, deckTitle: "Review", chapterIndex: 0, mode: "review" })}
        >
          <div className="tw-review-icon"><TrophyIcon size={20} /></div>
          <div className="tw-review-body">
            <strong>Review your tricky words</strong>
            <span>{stats.review_count} word{stats.review_count === 1 ? "" : "s"} you've missed are waiting. Nail them to clear your book.</span>
          </div>
          <ArrowRightIcon size={18} />
        </button>
      )}

      <div className="tw-deck-grid">
        {decksQ.isLoading && <div className="tw-loading"><span className="dot-load"><i /><i /><i /></span></div>}
        {decks.map((d: any, i: number) => {
          const pct = d.word_count ? Math.round((d.mastered_count / d.word_count) * 100) : 0;
          return (
            <article key={d.id} className="tw-deck fade-up" style={{ animationDelay: `${0.12 + i * 0.05}s` }}>
              <div className="tw-deck-top">
                <span className="tw-level">{d.cefr_level ?? "—"}</span>
                {d.best_wpm > 0 && <span className="tw-deck-wpm mono"><ZapIcon size={12} /> {d.best_wpm} wpm</span>}
              </div>
              <h2 className="serif tw-deck-title">{d.title}</h2>
              <p className="tw-deck-desc">{d.description}</p>

              <div className="tw-deck-prog">
                <div className="tw-deck-prog-bar"><span style={{ width: `${pct}%` }} /></div>
                <span className="mono tw-deck-prog-label">{d.mastered_count}/{d.word_count} mastered</span>
              </div>

              <div className="tw-chapters">
                {Array.from({ length: d.chapter_count }).map((_, ci) => (
                  <button
                    key={ci}
                    className="tw-chip"
                    onClick={() => onPlay({ deckId: d.id, deckTitle: d.title, chapterIndex: ci, chapterCount: d.chapter_count, mode })}
                    title={`Chapter ${ci + 1}`}
                    aria-label={`${d.title} — chapter ${ci + 1}`}
                  >
                    {ci + 1}
                  </button>
                ))}
              </div>

              <button
                className="btn accent tw-deck-go"
                onClick={() => onPlay({ deckId: d.id, deckTitle: d.title, chapterIndex: 0, chapterCount: d.chapter_count, mode })}
              >
                <PlayIcon size={15} /> Start chapter 1
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="tw-statpill">
      <span className="tw-statpill-ico">{icon}</span>
      <span className="tw-statpill-val mono">{value}</span>
      <span className="tw-statpill-lbl">{label}</span>
    </div>
  );
}
