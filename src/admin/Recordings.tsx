// src/admin/Recordings.tsx — user recordings table + player modal
const { useState: useState_Rc } = React;

function AdminRecordings() {
  const seed = (window as any).ADMIN_DATA.ADMIN_RECORDINGS;
  const [recs, setRecs] = useState_Rc(seed);
  const [topic, setTopic] = (useLocalState as any)("admin.recordings.topic", "All");
  const [tier, setTier] = (useLocalState as any)("admin.recordings.tier", "All");
  const [search, setSearch] = (useLocalState as any)("admin.recordings.search", "");
  const [open, setOpen] = useState_Rc<any | null>(null);

  const topics = ["All", "Vocabulary", "Grammar", "Listening", "Speaking", "Writing"];
  const tiers = ["All", "Flagged", "Below 70%", "Above 90%"];

  const filtered = recs.filter((r: any) => {
    if (topic !== "All" && r.topic !== topic) return false;
    if (tier === "Flagged" && !r.flagged) return false;
    if (tier === "Below 70%" && r.score >= 70) return false;
    if (tier === "Above 90%" && r.score < 90) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.user.name.toLowerCase().includes(s) && !r.user.email.toLowerCase().includes(s) && !r.moduleTitle.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  function toggleFlag(id: string) {
    setRecs(recs.map((r: any) => r.id === id ? { ...r, flagged: !r.flagged } : r));
  }

  return (
    <div>
      <header className="rc-head fade-up">
        <div>
          <p className="eyebrow">User recordings</p>
          <h2 className="serif" style={{ margin: "4px 0 4px", fontSize: 26, letterSpacing: "-0.02em" }}>
            {recs.length} sessions · <span className="serif-it">{recs.filter((r: any) => r.flagged).length} flagged</span>
          </h2>
          <p style={{ margin: 0, color: "var(--ink-2)" }}>
            Every practice session is recorded so you can review pronunciation, posture, and
            integrity flags.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost">Export CSV</button>
          <button className="btn accent">Bulk review →</button>
        </div>
      </header>

      <div className="rc-toolbar fade-up" style={{ animationDelay: "100ms" }}>
        <div className="topic-chips">
          {topics.map((t) => (
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
        <div className="rc-filters">
          <select className="rc-select" value={tier} onChange={(e) => setTier(e.target.value)}>
            {tiers.map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="search">
            <SearchG3 />
            <input
              placeholder="Search by learner or module…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <ul className="rc-list">
        {filtered.map((r: any, i: number) => (
          <li
            key={r.id}
            className="rc-row fade-up"
            style={{ animationDelay: `${120 + i * 50}ms`, ["--c" as any]: r.hue }}
            onClick={() => setOpen(r)}
          >
            <div className="rc-thumb">
              <RecThumb hue={r.hue} />
              <span className="thumb-play"><PlayG3 /></span>
              <span className="thumb-dur mono">{r.duration}</span>
            </div>
            <div className="rc-body">
              <div className="rc-userline">
                <Avatar name={r.user.name} size={26} />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontWeight: 600 }}>{r.user.name}</strong>
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{r.user.email}</div>
                </div>
              </div>
              <div className="rc-mod">
                <TopicBadge topic={r.topic} />
                <span style={{ fontWeight: 500 }}>{r.moduleTitle}</span>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{r.takenAt}</div>
            </div>
            <div className="rc-score">
              <ScorePill score={r.score} />
              <button
                className={"flag-btn" + (r.flagged ? " on" : "")}
                onClick={(e) => { e.stopPropagation(); toggleFlag(r.id); }}
                title={r.flagged ? "Unflag" : "Flag for review"}
                type="button"
              >
                <FlagG2 />
              </button>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rc-empty card">
            <p className="serif" style={{ margin: 0, fontSize: 18 }}>No recordings match those filters.</p>
            <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13 }}>Try clearing search or selecting a different topic.</p>
          </li>
        )}
      </ul>

      {open && <AdminPlayerModal rec={open} onClose={() => setOpen(null)} onToggleFlag={() => toggleFlag(open.id)} />}

      <style>{`
        .rc-head {
          display: flex; justify-content: space-between; align-items: end;
          gap: 18px; margin-bottom: 18px; flex-wrap: wrap;
        }
        .rc-toolbar {
          display: flex; justify-content: space-between; align-items: center;
          gap: 14px; margin-bottom: 14px; flex-wrap: wrap;
        }
        .topic-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .topic-chip {
          background: transparent; border: 1px solid var(--line);
          padding: 7px 12px; border-radius: 999px;
          font-size: 12px; color: var(--ink-2); cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .topic-chip:hover { background: var(--bg-2); color: var(--ink); }
        .topic-chip[data-active] { background: var(--ink); color: white; border-color: var(--ink); }
        .rc-filters { display: flex; gap: 10px; }
        .rc-select {
          font: inherit; padding: 8px 12px; border-radius: 10px;
          background: var(--surface); border: 1px solid var(--line);
          color: var(--ink); outline: none;
        }
        .search {
          display: flex; align-items: center; gap: 8px;
          background: var(--surface); border: 1px solid var(--line);
          border-radius: 10px; padding: 6px 12px;
          width: 260px;
          color: var(--ink-3);
        }
        .search input { border: 0; outline: none; background: transparent; font: inherit; flex: 1; }

        .rc-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
        .rc-row {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
          padding: 10px;
          display: grid;
          grid-template-columns: 160px 1fr auto;
          gap: 18px;
          align-items: center;
          cursor: pointer;
          transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
        }
        .rc-row:hover {
          transform: translateY(-1px);
          border-color: var(--ink-3);
          box-shadow: var(--shadow-md);
        }
        .rc-thumb {
          position: relative;
          aspect-ratio: 16/10;
          border-radius: var(--r-md);
          overflow: hidden;
          background: oklch(0.2 0.04 var(--c));
        }
        .thumb-play {
          position: absolute; inset: 0; margin: auto;
          width: 36px; height: 36px;
          border-radius: 999px;
          background: oklch(1 0 0 / 0.95); color: var(--ink);
          display: grid; place-items: center;
          box-shadow: 0 4px 14px oklch(0 0 0 / 0.25);
          transition: transform 0.2s;
        }
        .rc-row:hover .thumb-play { transform: scale(1.08); }
        .thumb-dur {
          position: absolute; bottom: 6px; right: 6px;
          font-size: 10px; padding: 2px 6px;
          background: oklch(0 0 0 / 0.55); color: white;
          border-radius: 4px;
        }
        .rc-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .rc-userline { display: flex; align-items: center; gap: 10px; }
        .rc-mod { display: flex; align-items: center; gap: 8px; font-size: 14px; }

        .rc-score {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 0 12px;
        }
        .flag-btn {
          width: 32px; height: 32px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid var(--line);
          color: var(--ink-3);
          cursor: pointer;
          display: grid; place-items: center;
          transition: background 0.15s, color 0.15s;
        }
        .flag-btn:hover { background: var(--bg-2); color: var(--ink); }
        .flag-btn.on {
          background: var(--rose-soft); color: var(--rose); border-color: oklch(0.85 0.08 25);
        }

        .rc-empty { padding: 36px 22px; text-align: center; }

        @media (max-width: 720px) {
          .rc-row { grid-template-columns: 100px 1fr; grid-template-rows: auto auto; }
          .rc-score {
            grid-column: 1 / -1;
            flex-direction: row; justify-content: flex-end;
            padding: 8px 0 0;
            border-top: 1px solid var(--line-2);
          }
          .search { width: 100%; }
        }
      `}</style>
    </div>
  );
}

// ---- Recording thumbnail ---------------------------------------------------
function RecThumb({ hue }: { hue: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }} aria-hidden="true">
      <span
        style={{
          position: "absolute", inset: 0,
          background:
            `radial-gradient(circle at 30% 30%, oklch(0.55 0.16 ${hue}), transparent 55%),` +
            `radial-gradient(circle at 70% 70%, oklch(0.35 0.1 ${hue}), transparent 55%),` +
            `oklch(0.22 0.04 ${hue})`,
        }}
      />
      <span
        style={{
          position: "absolute",
          left: "50%", top: "44%",
          transform: "translate(-50%, -50%)",
          width: 44, height: 50,
          borderRadius: "50% 50% 46% 46% / 60% 60% 40% 40%",
          background: `oklch(0.78 0.06 ${hue} / 0.55)`,
          boxShadow: `0 0 0 8px oklch(0.78 0.06 ${hue} / 0.18)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 8, right: 8, bottom: 6,
          height: 14,
          display: "flex", gap: 2, alignItems: "center",
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <i
            key={i}
            style={{
              flex: 1,
              background: `oklch(0.85 0.1 ${hue})`,
              borderRadius: 2,
              height: `${20 + Math.sin(i * 1.2) * 30 + Math.cos(i * 2) * 18}%`,
              opacity: 0.85,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---- Admin player modal ----------------------------------------------------
function AdminPlayerModal({ rec, onClose, onToggleFlag }: { rec: any; onClose: () => void; onToggleFlag: () => void }) {
  const [playing, setPlaying] = useState_Rc(false);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const [isFs, setIsFs] = useState_Rc(false);

  // Track native fullscreen state
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

  // Escape to close
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="player-back fade-in" onClick={onClose}>
      <div className="adm-player scale-in" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn close-btn" onClick={onClose} aria-label="Close" title="Close (Esc)">
          <XG />
        </button>

        <div className="adm-stage" ref={stageRef} data-fs={isFs || undefined}>
          <RecThumb hue={rec.hue} />
          <span className="rec-pill mono">
            <span className="rec-dot" />
            REC · {rec.takenAt}
          </span>
          {!playing && (
            <button className="rp-big" onClick={() => setPlaying(true)} aria-label="Play recording">
              <PlayG3 size={28} />
            </button>
          )}
          <button
            className="fs-btn"
            onClick={toggleFullscreen}
            aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFs ? "Exit fullscreen (F)" : "Fullscreen (F)"}
          >
            {isFs ? <CollapseG /> : <ExpandG />}
          </button>
          <div className="adm-bar">
            <button className="ctrl-min" onClick={() => setPlaying((p) => !p)}>
              {playing ? <PauseG3 /> : <PlayG3 />}
            </button>
            <div className="ctrl-track"><span style={{ width: playing ? "42%" : "0%" }} /></div>
            <span className="mono" style={{ color: "white", fontSize: 11, opacity: 0.85 }}>
              {playing ? "0:32" : "0:00"} / {rec.duration}
            </span>
          </div>
        </div>

        <div className="adm-body scroll-y">
          <div className="adm-body-top">
            <div>
              <span className="eyebrow">{rec.topic}</span>
              <h2 className="serif" style={{ margin: "4px 0 0", fontSize: 22, letterSpacing: "-0.01em" }}>
                {rec.moduleTitle}
              </h2>
            </div>
            <ScorePill score={rec.score} />
          </div>

          <div className="adm-grid">
            <Stat label="Learner" value={rec.user.name} sub={rec.user.email} />
            <Stat label="Duration" value={rec.duration} sub="real time" />
            <Stat label="Submitted" value={rec.takenAt} sub="device timezone" />
            <Stat label="Integrity" value={rec.flagged ? "Flagged" : "Clean"} tone={rec.flagged ? "warn" : "ok"} sub="auto-check" />
          </div>

          <AdminAnswersPanel rec={rec} />

          <div className="adm-foot">
            <button className={"btn ghost" + (rec.flagged ? " on" : "")} onClick={onToggleFlag}>
              <FlagG2 /> {rec.flagged ? "Remove flag" : "Flag for review"}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn ghost">Download .webm</button>
              <button className="btn accent">Send feedback to learner</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .player-back {
          position: fixed; inset: 0; z-index: 50;
          background: oklch(0.1 0.01 85 / 0.55);
          backdrop-filter: blur(4px);
          display: grid; place-items: center;
          padding: 16px;
        }
        .adm-player {
          width: 100%;
          max-width: 920px;
          max-height: calc(100vh - 32px);
          background: var(--surface);
          border-radius: var(--r-xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .close-btn {
          position: absolute; top: 12px; right: 12px;
          z-index: 4;
          background: oklch(0 0 0 / 0.5) !important;
          color: white !important;
          border: 0 !important;
          width: 34px; height: 34px;
        }
        .close-btn:hover { background: oklch(0 0 0 / 0.7) !important; }
        .adm-stage {
          position: relative;
          aspect-ratio: 16/9;
          background: black;
          flex-shrink: 0;
        }
        .adm-stage[data-fs] {
          aspect-ratio: auto;
          width: 100%; height: 100%;
        }
        .fs-btn {
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
          transition: background 0.15s;
        }
        .fs-btn:hover { background: oklch(0 0 0 / 0.75); }
        .adm-stage[data-fs] .fs-btn { bottom: 70px; }
        .rec-pill {
          position: absolute; top: 14px; left: 14px;
          font-size: 11px; color: white;
          background: oklch(0 0 0 / 0.5);
          padding: 5px 10px; border-radius: 999px;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .rec-dot { width: 7px; height: 7px; border-radius: 999px; background: var(--rose); animation: pulse-ring 1.6s infinite; }
        .rp-big {
          position: absolute;
          inset: 0; margin: auto;
          width: 72px; height: 72px;
          border-radius: 999px;
          background: oklch(1 0 0 / 0.95); color: var(--ink);
          border: 0; cursor: pointer;
          display: grid; place-items: center;
          box-shadow: 0 8px 24px oklch(0 0 0 / 0.35);
        }
        .adm-bar {
          position: absolute;
          left: 14px; right: 14px; bottom: 14px;
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px;
          background: oklch(0 0 0 / 0.5);
          backdrop-filter: blur(8px);
          border-radius: var(--r-md);
        }
        .ctrl-min {
          width: 32px; height: 32px;
          border-radius: 999px;
          background: white; color: black;
          border: 0; cursor: pointer;
          display: grid; place-items: center;
        }
        .ctrl-track { flex: 1; height: 4px; background: oklch(1 0 0 / 0.25); border-radius: 999px; overflow: hidden; }
        .ctrl-track span { display: block; height: 100%; background: white; transition: width 0.4s; }

        .adm-body { padding: 22px 26px 20px; flex: 1; min-height: 0; }
        .adm-body-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
        .adm-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-bottom: 22px;
        }
        .adm-foot {
          display: flex; justify-content: space-between; align-items: center;
          gap: 10px; flex-wrap: wrap;
        }
        .adm-foot .btn.on { background: var(--rose-soft); color: var(--rose); border-color: oklch(0.85 0.08 25); }

        /* answers panel */
        .ans-panel { margin-bottom: 22px; }
        .ans-panel-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px; gap: 10px;
        }
        .ans-summary {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px;
          padding: 4px 10px;
          background: var(--bg-2);
          border-radius: 999px;
        }
        .ans-summary .ok { color: var(--accent-ink); font-weight: 600; }
        .ans-summary .bad { color: var(--rose); font-weight: 600; }

        .ans-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column;
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          overflow: hidden;
        }
        .ans-item {
          padding: 12px 14px;
          border-bottom: 1px solid var(--line-2);
          display: grid;
          grid-template-columns: 28px 1fr;
          gap: 12px;
        }
        .ans-item:last-child { border-bottom: 0; }
        .ans-item[data-correct] { background: oklch(0.985 0.02 158 / 0.5); }
        .ans-item[data-wrong]   { background: oklch(0.985 0.02 25 / 0.5); }
        .ans-num {
          width: 24px; height: 24px;
          border-radius: 999px;
          background: var(--bg-2);
          color: var(--ink-3);
          display: grid; place-items: center;
          font-size: 11px;
          margin-top: 1px;
        }
        .ans-item[data-correct] .ans-num { background: var(--accent); color: white; }
        .ans-item[data-wrong]   .ans-num { background: var(--rose);   color: white; }
        .ans-body { min-width: 0; }
        .ans-prompt {
          margin: 0 0 8px;
          font-family: var(--font-display);
          font-size: 15px;
          line-height: 1.4;
          color: var(--ink);
        }
        .ans-context {
          margin: 0 0 8px;
          padding: 6px 10px;
          background: var(--bg-2);
          border-left: 2px solid var(--ink-3);
          border-radius: 0 6px 6px 0;
          font-style: italic;
          font-size: 13px;
          color: var(--ink-2);
        }
        .ans-row {
          display: grid;
          grid-template-columns: minmax(140px, 1fr) minmax(140px, 1fr);
          gap: 8px;
        }
        .ans-card {
          padding: 8px 10px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 8px;
          display: flex; flex-direction: column; gap: 4px;
          min-width: 0;
        }
        .ans-card.user[data-tier="bad"] {
          border-color: oklch(0.85 0.1 25);
          background: var(--rose-soft);
        }
        .ans-card.correct {
          border-color: color-mix(in oklch, var(--accent), white 60%);
          background: var(--accent-soft);
        }
        .ans-card .lab {
          font-size: 10px;
          font-family: var(--font-mono);
          letter-spacing: 0.1em;
          color: var(--ink-3);
        }
        .ans-card.correct .lab { color: var(--accent-ink); }
        .ans-card.user[data-tier="bad"] .lab { color: var(--rose); }
        .ans-card .val {
          font-size: 14px;
          font-weight: 500;
          color: var(--ink);
          font-family: var(--font-display);
          line-height: 1.3;
        }
        .ans-card .val.empty {
          font-style: italic; color: var(--ink-3); font-family: var(--font-ui);
        }

        .ans-pairs {
          display: grid; gap: 4px;
          font-size: 13px;
        }
        .ans-pairs .pair {
          display: grid;
          grid-template-columns: 1fr 14px 1fr 14px;
          gap: 6px;
          align-items: center;
          padding: 4px 8px;
          border-radius: 6px;
          background: var(--surface);
          border: 1px solid var(--line-2);
        }
        .ans-pairs .pair[data-ok]  { background: var(--accent-soft); border-color: color-mix(in oklch, var(--accent), white 65%); }
        .ans-pairs .pair[data-bad] { background: var(--rose-soft);   border-color: oklch(0.88 0.08 25); }
        .ans-pairs .arrow { color: var(--ink-3); font-family: var(--font-mono); font-size: 11px; }
        .ans-pairs .check { color: var(--accent-ink); }
        .ans-pairs .cross { color: var(--rose); }

        .ans-explain {
          margin: 10px 0 0;
          padding: 8px 10px;
          background: var(--accent-soft);
          border-radius: 6px;
          font-size: 12px;
          color: var(--accent-ink);
          display: flex;
          gap: 8px;
        }
        .ans-explain strong { font-weight: 600; }

        @media (max-width: 540px) {
          .ans-row { grid-template-columns: 1fr; }
          .ans-pairs .pair { grid-template-columns: 1fr 12px 1fr 12px; }
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" }) {
  const bg = tone === "warn" ? "var(--rose-soft)" : tone === "ok" ? "var(--accent-soft)" : "var(--bg-2)";
  const ink = tone === "warn" ? "var(--rose)" : tone === "ok" ? "var(--accent-ink)" : "var(--ink)";
  return (
    <div style={{ padding: "12px 14px", background: bg, borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: 2 }}>
      <span className="eyebrow" style={{ color: tone ? ink : undefined }}>{label}</span>
      <strong className="serif" style={{ fontSize: 18, color: ink, letterSpacing: "-0.01em" }}>{value}</strong>
      {sub && <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{sub}</span>}
    </div>
  );
}

// ---- Answers panel (admin-only view of user's answers + correct ones) -----
type MockAnswer = {
  kind: "choice" | "fill" | "match";
  prompt: string;
  context?: string;
  // for choice/fill
  userPickLabel?: string;
  correctLabel?: string;
  // for match
  userPairs?: { left: string; userRight: string; correctRight: string; ok: boolean }[];
  isCorrect: boolean;
  explain?: string;
};

function buildAnswersFor(rec: any): MockAnswer[] {
  // Pull from the learner question bank for realism
  const QS: any[] = ((window as any).LUMEN_DATA?.QUESTIONS as any[]) || [];
  if (QS.length === 0) return [];

  // Match topic when possible; fall back to any
  const topicMap: Record<string, RegExp> = {
    Vocabulary: /vocabulary/i,
    Grammar:    /grammar/i,
  };
  const filter = topicMap[rec.topic];
  let pool = filter ? QS.filter((q) => filter.test(q.category)) : QS;
  if (pool.length < 5) pool = QS;

  // Deterministic shuffle based on rec.id so each recording shows stable answers
  const seed = [...rec.id].reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
  const ordered = [...pool].sort((a, b) => {
    const ha = ((seed + a.id.charCodeAt(1)) * 9301 + 49297) % 233280;
    const hb = ((seed + b.id.charCodeAt(1)) * 9301 + 49297) % 233280;
    return ha - hb;
  });

  const count = Math.min(6, ordered.length);
  const numCorrect = Math.round((rec.score / 100) * count);
  const picked = ordered.slice(0, count);

  return picked.map((q, i) => {
    const isCorrect = i < numCorrect;
    if (q.kind === "match") {
      // build pair selections
      const userPairs = q.pairs.map((p: any, pi: number) => {
        // when isCorrect, all pairs correct; when not, scramble the last few
        let userRight = p.right;
        if (!isCorrect && pi >= Math.max(0, q.pairs.length - 2)) {
          // swap with another pair's right
          const other = q.pairs[(pi + 1) % q.pairs.length];
          userRight = other.right;
        }
        return { left: p.left, userRight, correctRight: p.right, ok: userRight === p.right };
      });
      return {
        kind: "match" as const,
        prompt: q.prompt,
        userPairs,
        isCorrect,
        explain: q.explain,
      };
    } else {
      const correct = q.choices.find((c: any) => c.id === q.answer);
      let userChoice;
      if (isCorrect) {
        userChoice = correct;
      } else {
        // pick a wrong choice deterministically
        const wrongs = q.choices.filter((c: any) => c.id !== q.answer);
        userChoice = wrongs[(seed + i) % wrongs.length];
      }
      return {
        kind: q.kind as "choice" | "fill",
        prompt: q.prompt,
        context: q.context || (q.kind === "fill" ? q.sentence : undefined),
        userPickLabel: userChoice?.label,
        correctLabel: correct?.label,
        isCorrect,
        explain: q.explain,
      };
    }
  });
}

function AdminAnswersPanel({ rec }: { rec: any }) {
  const answers = buildAnswersFor(rec);
  if (answers.length === 0) return null;
  const correctCount = answers.filter((a) => a.isCorrect).length;

  return (
    <section className="ans-panel">
      <div className="ans-panel-head">
        <div>
          <span className="eyebrow">Answer breakdown</span>
          <h3 className="serif" style={{ margin: "2px 0 0", fontSize: 16, letterSpacing: "-0.01em" }}>
            What they picked vs. the correct answer
          </h3>
        </div>
        <span className="ans-summary mono">
          <span className="ok">{correctCount}</span>
          <span style={{ color: "var(--ink-3)" }}>/</span>
          <span>{answers.length}</span>
          <span style={{ color: "var(--ink-3)" }}>correct</span>
        </span>
      </div>

      <ul className="ans-list">
        {answers.map((a, i) => (
          <li
            key={i}
            className="ans-item"
            data-correct={a.isCorrect || undefined}
            data-wrong={!a.isCorrect || undefined}
          >
            <span className="ans-num mono">
              {a.isCorrect ? <MicroCheck /> : <MicroX />}
            </span>
            <div className="ans-body">
              <p className="ans-prompt">{a.prompt}</p>
              {a.context && <p className="ans-context">{a.context}</p>}

              {a.kind !== "match" ? (
                <div className="ans-row">
                  <div className="ans-card user" data-tier={a.isCorrect ? "ok" : "bad"}>
                    <span className="lab">USER PICKED</span>
                    <span className={"val" + (a.userPickLabel ? "" : " empty")}>
                      {a.userPickLabel || "Not answered"}
                    </span>
                  </div>
                  <div className="ans-card correct">
                    <span className="lab">CORRECT ANSWER</span>
                    <span className="val">{a.correctLabel}</span>
                  </div>
                </div>
              ) : (
                <div className="ans-pairs">
                  {a.userPairs?.map((p, pi) => (
                    <div
                      key={pi}
                      className="pair"
                      data-ok={p.ok || undefined}
                      data-bad={!p.ok || undefined}
                    >
                      <span style={{ fontWeight: 500 }}>{p.left}</span>
                      <span className="arrow">→</span>
                      <span style={{ fontStyle: "italic" }}>
                        {p.userRight}
                        {!p.ok && (
                          <span className="mono" style={{ marginLeft: 6, fontSize: 10, color: "var(--ink-3)" }}>
                            (correct: {p.correctRight})
                          </span>
                        )}
                      </span>
                      <span className={p.ok ? "check" : "cross"}>
                        {p.ok ? <MicroCheck /> : <MicroX />}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {a.explain && (
                <div className="ans-explain">
                  <strong>Why:</strong>
                  <span>{a.explain}</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MicroCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5 9 17l11-11" />
    </svg>
  );
}
function MicroX() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

// glyphs
function G4({ children, size = 14 }: any) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
function SearchG3() { return <G4><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></G4>; }
function PlayG3({ size = 14 }: any) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>; }
function PauseG3() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>; }
function FlagG2() { return <G4><path d="M4 21V4M4 4h12l-2 4 2 4H4" /></G4>; }
function XG() { return <G4><path d="M6 6l12 12M18 6 6 18" /></G4>; }
function ExpandG()   { return <G4><path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" /></G4>; }
function CollapseG() { return <G4><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" /></G4>; }

(window as any).AdminRecordings = AdminRecordings;
