import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import {
  XIcon, ZapIcon, ClockIcon, CheckIcon, ArrowRightIcon, PlayIcon, ArrowLeftIcon,
  TrophyIcon, KeyboardIcon,
} from "../../components/ui";
import { sfx, getSoundSettings, setSoundSettings, primeAudio } from "./sounds";
import type { TypingLaunch } from "./TypingHome";
import "./TypingPractice.css";

type TWord = {
  id: string; word: string; phonetic?: string; pos?: string;
  translation?: string; example?: string; example_translation?: string;
  audio_url: string; deck_title?: string;
};

type Phase = "loading" | "playing" | "done" | "empty";

export function TypingPractice({
  launch, onExit, onProgress, onRedo, onNext,
}: {
  launch: TypingLaunch;
  onExit: () => void;
  onProgress?: () => void;
  onRedo: () => void;
  onNext?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [words, setWords] = useState<TWord[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  // ── Engine state ─────────────────────────────────────────────────────────
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState(0);
  const [shake, setShake] = useState(0);
  const [burst, setBurst] = useState(0);
  const [now, setNow] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const typedRef = useRef(0); // synchronous cursor so batched input advances correctly
  const wordErrorsRef = useRef(0);
  const correctKeysRef = useRef(0);
  const wrongKeysRef = useRef(0);
  const resultsRef = useRef<{ word_id: string; correct: boolean }[]>([]);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const [finalStats, setFinalStats] = useState<{ wpm: number; accuracy: number; durationMs: number; correctWords: number } | null>(null);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(getSoundSettings().enabled);

  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isDictation = launch.mode === "dictation";

  // ── Load words + open session ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list: TWord[] = launch.mode === "review"
          ? await api.typing.review(30)
          : (await api.typing.chapter(launch.deckId!, launch.chapterIndex)).words;
        if (cancelled) return;
        if (!list || list.length === 0) { setPhase("empty"); return; }
        setWords(list);
        setPhase("playing");
        try {
          const s = await api.typing.start({
            deck_id: launch.deckId, chapter_index: launch.chapterIndex, mode: launch.mode,
          });
          sessionIdRef.current = s.id;
        } catch { /* session is best-effort; practice still works */ }
      } catch {
        if (!cancelled) setPhase("empty");
      }
    })();
    return () => { cancelled = true; };
  }, [launch]);

  const current = words[idx];
  const target = current?.word ?? "";

  // ── Audio ────────────────────────────────────────────────────────────────
  const playAudio = useCallback(() => {
    const w = words[idx];
    if (!w) return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.pause();
    audioRef.current.src = api.typing.wordAudio(w.id);
    audioRef.current.play().catch(() => {});
  }, [words, idx]);

  // Silence any in-flight pronunciation when the screen unmounts (exit / remount).
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  // Speak each new word as it appears (both modes — hearing reinforces spelling).
  useEffect(() => {
    if (phase !== "playing") return;
    setRevealed(false);
    const t = setTimeout(playAudio, 220);
    return () => clearTimeout(t);
  }, [idx, phase, playAudio]);

  // ── Live timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const iv = setInterval(() => { if (startRef.current) setNow(Date.now()); }, 200);
    return () => clearInterval(iv);
  }, [phase]);

  // Keep the capture input focused.
  useEffect(() => {
    if (phase === "playing") inputRef.current?.focus();
  }, [phase, idx]);

  const finalize = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const durationMs = startRef.current ? Date.now() - startRef.current : 0;
    const total = words.length;
    const correctWords = resultsRef.current.filter((r) => r.correct).length;
    const totalKeys = correctKeysRef.current + wrongKeysRef.current;
    const accuracy = totalKeys ? Math.round((correctKeysRef.current / totalKeys) * 100) : 100;
    const minutes = durationMs / 60000;
    const wpm = minutes > 0 ? Math.round((correctKeysRef.current / 5) / minutes) : 0;
    setFinalStats({ wpm, accuracy, durationMs, correctWords });
    setPhase("done");
    sfx.finish();
    const sid = sessionIdRef.current;
    if (sid) {
      api.typing.finish(sid, {
        total, correct: correctWords, wrong_count: wrongKeysRef.current,
        accuracy, wpm, duration_ms: durationMs, results: resultsRef.current,
      }).then((res) => { setEarnedXp(res.xp_earned); onProgress?.(); }).catch(() => {});
    }
  }, [words, onProgress]);

  const handleChar = useCallback((raw: string) => {
    if (phase !== "playing") return;
    const w = words[idx];
    if (!w) return;
    primeAudio();
    if (startRef.current === null) { startRef.current = Date.now(); setNow(Date.now()); }

    const pos = typedRef.current; // read the live cursor, not the (async) state
    const expected = w.word[pos];
    const match = raw.length === 1 && raw.toLowerCase() === (expected ?? "").toLowerCase();

    if (match) {
      correctKeysRef.current += 1;
      sfx.key();
      const nextTyped = pos + 1;
      typedRef.current = nextTyped;
      if (nextTyped >= w.word.length) {
        // Word complete.
        resultsRef.current.push({ word_id: w.id, correct: wordErrorsRef.current === 0 });
        wordErrorsRef.current = 0;
        setBurst((b) => b + 1);
        sfx.correct();
        if (idx + 1 >= words.length) {
          setTyped(nextTyped);
          finalize();
        } else {
          typedRef.current = 0;
          setIdx((i) => i + 1);
          setTyped(0);
        }
      } else {
        setTyped(nextTyped);
      }
    } else {
      wrongKeysRef.current += 1;
      wordErrorsRef.current += 1;
      sfx.wrong();
      setShake((s) => s + 1);
    }
  }, [phase, words, idx, finalize]);

  const handleBackspace = useCallback(() => {
    // `typed` only ever advances on a correct key, so un-typing one removes a
    // correct keystroke — keeping WPM/accuracy honest on retype.
    const n = Math.max(0, typedRef.current - 1);
    if (n < typedRef.current) correctKeysRef.current = Math.max(0, correctKeysRef.current - 1);
    typedRef.current = n;
    setTyped(n);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") { e.preventDefault(); handleBackspace(); return; }
    if (e.key === "Escape") { e.preventDefault(); onExit(); return; }
    if (e.key === "Enter") { e.preventDefault(); playAudio(); return; }
    // Let modifier shortcuts (Ctrl/Cmd/Alt + key) pass through to the browser.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      handleChar(e.key);
      return;
    }
    // Other keys (Unidentified on some mobile IMEs) fall through to onBeforeInput.
  };

  const onBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
    const ie = e.nativeEvent as InputEvent;
    if (ie.inputType === "insertText" && ie.data) {
      e.preventDefault();
      for (const ch of ie.data) handleChar(ch);
    } else if (ie.inputType === "deleteContentBackward") {
      e.preventDefault();
      handleBackspace();
    }
  };

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundSettings({ enabled: next });
    if (next) primeAudio();
  }

  // ── Derived live stats ─────────────────────────────────────────────────
  const elapsed = startRef.current ? now - startRef.current : 0;
  const minutes = elapsed / 60000;
  const liveWpm = minutes > 0 ? Math.round((correctKeysRef.current / 5) / minutes) : 0;
  const totalKeys = correctKeysRef.current + wrongKeysRef.current;
  const liveAcc = totalKeys ? Math.round((correctKeysRef.current / totalKeys) * 100) : 100;
  const progressPct = words.length ? (idx / words.length) * 100 : 0;

  // ── Render ──────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="tp-shell"><div className="tp-center"><span className="dot-load"><i /><i /><i /></span></div></div>
    );
  }
  if (phase === "empty") {
    return (
      <div className="tp-shell">
        <div className="tp-center tp-empty">
          <KeyboardIcon size={32} />
          <p className="serif">Nothing to type here yet.</p>
          <p className="tp-empty-sub">
            {launch.mode === "review" ? "Your review book is empty — go nail some chapters first." : "This chapter has no words."}
          </p>
          <button className="btn" onClick={onExit}><ArrowLeftIcon size={15} /> Back</button>
        </div>
      </div>
    );
  }
  if (phase === "done" && finalStats) {
    return (
      <Results
        launch={launch}
        words={words}
        results={resultsRef.current}
        stats={finalStats}
        earnedXp={earnedXp}
        onExit={onExit}
        onRedo={onRedo}
        onNext={onNext}
      />
    );
  }

  return (
    <div className="tp-shell" onMouseDown={() => inputRef.current?.focus()}>
      {/* hidden capture input — focused; all real handling happens via events */}
      <input
        ref={inputRef}
        className="tp-capture"
        value=""
        onChange={() => {}}
        onKeyDown={onKeyDown}
        onBeforeInput={onBeforeInput}
        onBlur={(e) => {
          // Only grab focus back if it would otherwise fall to nothing — lets a
          // keyboard user Tab to the Exit / sound controls.
          if (phase === "playing" && !e.relatedTarget) setTimeout(() => inputRef.current?.focus(), 0);
        }}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        inputMode="text"
        aria-label="Type the word"
      />

      {/* top bar */}
      <div className="tp-top">
        <button className="tp-icon-btn" onClick={onExit} aria-label="Exit"><XIcon size={18} /></button>
        <div className="tp-top-mid">
          <span className="tp-deck-name">{current?.deck_title ?? launch.deckTitle}</span>
          <div className="tp-progress"><span style={{ width: `${progressPct}%` }} /></div>
        </div>
        <button className="tp-icon-btn" onClick={toggleSound} aria-label="Toggle sound" title={soundOn ? "Sound on" : "Sound off"}>
          {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
      </div>

      {/* HUD */}
      <div className="tp-hud">
        <Hud icon={<ZapIcon size={14} />} value={liveWpm} label="wpm" />
        <Hud icon={<CheckIcon size={14} />} value={`${liveAcc}%`} label="accuracy" />
        <Hud icon={<KeyboardIcon size={14} />} value={`${idx + 1}/${words.length}`} label="word" />
        <Hud icon={<ClockIcon size={14} />} value={`${Math.floor(elapsed / 1000)}s`} label="time" />
      </div>

      {/* Stage */}
      <div className="tp-stage" key={burst}>
        <div className="tp-glow" />
        <div className="tp-meta">
          <button className="tp-speaker" onClick={playAudio} aria-label="Play pronunciation">
            <PlayIcon size={16} />
          </button>
          {current?.phonetic && !isDictation && <span className="tp-phon mono">{current.phonetic}</span>}
          {current?.pos && !isDictation && <span className="tp-pos">{current.pos}</span>}
        </div>

        <div className={`tp-word ${shake ? "shaketrig" : ""}`} key={`${idx}-${shake}`}>
          {target.split("").map((ch, i) => {
            const state = i < typed ? "ok" : i === typed ? "cur" : "pending";
            const hidden = isDictation && !revealed && i >= typed;
            const display = ch === " " ? " " : (hidden ? "•" : ch);
            return (
              <span key={i} className={`tp-ch tp-${state} ${ch === " " ? "tp-space" : ""} ${hidden ? "tp-hidden" : ""}`}>
                {display}
              </span>
            );
          })}
        </div>

        <div className="tp-below">
          {isDictation && !revealed ? (
            <button className="tp-reveal" onClick={() => setRevealed(true)}>Reveal word</button>
          ) : (
            <>
              {current?.translation && <p className="tp-translation">{current.translation}</p>}
              {current?.example && (
                <p className="tp-example">
                  {current.example}
                  {current?.example_translation && <span className="tp-example-id"> — {current.example_translation}</span>}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <p className="tp-hint">
        Type the letters · <kbd>⏎</kbd> replay audio · <kbd>esc</kbd> exit
      </p>
    </div>
  );
}

function Hud({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="tp-hud-item">
      <span className="tp-hud-ico">{icon}</span>
      <span className="tp-hud-val mono">{value}</span>
      <span className="tp-hud-lbl">{label}</span>
    </div>
  );
}

// ── Results ──────────────────────────────────────────────────────────────────
function Results({
  launch, words, results, stats, earnedXp, onExit, onRedo, onNext,
}: {
  launch: TypingLaunch;
  words: TWord[];
  results: { word_id: string; correct: boolean }[];
  stats: { wpm: number; accuracy: number; durationMs: number; correctWords: number };
  earnedXp: number | null;
  onExit: () => void;
  onRedo: () => void;
  onNext?: () => void;
}) {
  const correctSet = useMemo(() => new Set(results.filter((r) => r.correct).map((r) => r.word_id)), [results]);
  const missed = words.filter((w) => !correctSet.has(w.id));
  const perfect = missed.length === 0;
  const seconds = Math.round(stats.durationMs / 1000);

  return (
    <div className="tp-shell tp-results-shell">
      <div className="tp-results scale-in">
        <div className={`tp-result-badge ${perfect ? "perfect" : ""}`}>
          {perfect ? <TrophyIcon size={30} /> : <CheckIcon size={30} />}
        </div>
        <h2 className="serif tp-result-title">{perfect ? "Flawless run!" : "Chapter complete"}</h2>
        <p className="tp-result-sub">
          {perfect ? "Every word, zero mistakes. Beautiful typing." : `${stats.correctWords} of ${words.length} words typed clean.`}
        </p>

        <div className="tp-result-stats">
          <ResStat value={stats.wpm} label="WPM" big />
          <ResStat value={`${stats.accuracy}%`} label="Accuracy" />
          <ResStat value={`${seconds}s`} label="Time" />
          {earnedXp !== null && <ResStat value={`+${earnedXp}`} label="XP" accent />}
        </div>

        {missed.length > 0 && (
          <div className="tp-missed">
            <p className="eyebrow">Added to your review book</p>
            <div className="tp-missed-list">
              {missed.map((w) => (
                <span key={w.id} className="tp-missed-chip">{w.word}</span>
              ))}
            </div>
          </div>
        )}

        <div className="tp-result-actions">
          <button className="btn ghost" onClick={onExit}><ArrowLeftIcon size={15} /> Decks</button>
          <button className="btn" onClick={onRedo}><PlayIcon size={15} /> Redo</button>
          {onNext && launch.mode !== "review" && launch.chapterCount != null && launch.chapterIndex + 1 < launch.chapterCount && (
            <button className="btn accent" onClick={onNext}>
              Next chapter <ArrowRightIcon size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResStat({ value, label, big, accent }: { value: number | string; label: string; big?: boolean; accent?: boolean }) {
  return (
    <div className={`tp-resstat ${big ? "big" : ""} ${accent ? "accent" : ""}`}>
      <span className="tp-resstat-val mono">{value}</span>
      <span className="tp-resstat-lbl">{label}</span>
    </div>
  );
}

const SoundOnIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
  </svg>
);
const SoundOffIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4z" /><path d="M22 9l-6 6M16 9l6 6" />
  </svg>
);
