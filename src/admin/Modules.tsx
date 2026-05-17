// src/admin/Modules.tsx — modules list + module editor with question CRUD
const { useState: useState_Md } = React;

type ModuleEditorState = {
  id: string | "new";
  title: string;
  topic: string;
  level: string;
  status: string;
  questions: any[];
};

function AdminModules() {
  const seed = (window as any).ADMIN_DATA.ADMIN_MODULES;
  const [mods, setMods] = useState_Md(seed);
  const [open, setOpen] = useState_Md<ModuleEditorState | null>(null);
  const [filter, setFilter] = (useLocalState as any)("admin.modules.filter", "All");
  const [search, setSearch] = (useLocalState as any)("admin.modules.search", "");

  const topics = ["All", "Vocabulary", "Grammar", "Listening", "Speaking", "Writing"];

  const filtered = mods.filter((m: any) =>
    (filter === "All" || m.topic === filter) &&
    (search === "" || m.title.toLowerCase().includes(search.toLowerCase()))
  );

  function startNew() {
    setOpen({
      id: "new",
      title: "",
      topic: "Vocabulary",
      level: "A2",
      status: "draft",
      questions: [],
    });
  }
  function startEdit(m: any) {
    setOpen({
      id: m.id,
      title: m.title,
      topic: m.topic,
      level: m.level,
      status: m.status,
      questions: JSON.parse(JSON.stringify(m.questions)),
    });
  }
  function save(s: ModuleEditorState) {
    if (s.id === "new") {
      const id = "m-" + Math.random().toString(36).slice(2, 7);
      setMods([
        { ...s, id, updatedAt: "Just now", attempts: 0, avgScore: 0 },
        ...mods,
      ]);
    } else {
      setMods(
        mods.map((m: any) =>
          m.id === s.id ? { ...m, ...s, updatedAt: "Just now" } : m
        )
      );
    }
    setOpen(null);
  }
  function del(id: string) {
    if (!confirm("Delete this module? This cannot be undone.")) return;
    setMods(mods.filter((m: any) => m.id !== id));
    if (open && open.id === id) setOpen(null);
  }

  return (
    <div>
      <header className="m-head fade-up">
        <div>
          <p className="eyebrow">Practice modules</p>
          <h2 className="serif" style={{ margin: "4px 0 4px", fontSize: 26, letterSpacing: "-0.02em" }}>
            {mods.length} modules · {mods.filter((m: any) => m.status === "published").length} published
          </h2>
          <p style={{ margin: 0, color: "var(--ink-2)" }}>
            Build a new module from scratch, or edit an existing one.
          </p>
        </div>
        <button className="btn accent" onClick={startNew}>
          <PlusG /> New module
        </button>
      </header>

      <div className="m-toolbar fade-up" style={{ animationDelay: "100ms" }}>
        <div className="topic-chips">
          {topics.map((t) => (
            <button
              key={t}
              className="topic-chip"
              data-active={filter === t || undefined}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="search">
          <SearchG />
          <input
            placeholder="Search modules…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card m-table-wrap fade-up" style={{ animationDelay: "160ms" }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Topic</th>
              <th>Level</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Attempts</th>
              <th style={{ textAlign: "right" }}>Avg score</th>
              <th style={{ textAlign: "right" }}>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((m: any) => (
              <tr key={m.id}>
                <td data-label="Module">
                  <button className="row-link" onClick={() => startEdit(m)}>
                    {m.title}
                  </button>
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                    {m.questions.length} questions
                  </div>
                </td>
                <td data-label="Topic"><TopicBadge topic={m.topic} /></td>
                <td data-label="Level" className="mono" style={{ fontSize: 12 }}>{m.level}</td>
                <td data-label="Status"><StatusBadge status={m.status} /></td>
                <td data-label="Attempts" style={{ textAlign: "right" }} className="mono">{m.attempts}</td>
                <td data-label="Avg score" style={{ textAlign: "right" }}>{m.avgScore > 0 ? `${m.avgScore}%` : "—"}</td>
                <td data-label="Updated" className="mono" style={{ textAlign: "right", color: "var(--ink-3)", fontSize: 12 }}>{m.updatedAt}</td>
                <td data-label="Actions" style={{ textAlign: "right" }}>
                  <div className="row-actions">
                    <button className="row-act" onClick={() => startEdit(m)} title="Edit"><PencilG /></button>
                    <button className="row-act" onClick={() => del(m.id)} title="Delete"><TrashG /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--ink-3)", padding: "32px 0" }}>
                  No modules match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <ModuleEditor
          state={open}
          onClose={() => setOpen(null)}
          onSave={save}
          onDelete={open.id !== "new" ? () => del(open.id as string) : undefined}
        />
      )}

      <style>{`
        .m-head {
          display: flex; justify-content: space-between; align-items: flex-end;
          gap: 18px; margin-bottom: 18px;
        }
        .m-toolbar {
          display: flex; justify-content: space-between; align-items: center;
          gap: 14px; margin-bottom: 14px;
          flex-wrap: wrap;
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
        .search {
          display: flex; align-items: center; gap: 8px;
          background: var(--surface); border: 1px solid var(--line);
          border-radius: 10px; padding: 6px 12px;
          width: min(280px, 100%);
          color: var(--ink-3);
        }
        .search input { border: 0; outline: none; background: transparent; font: inherit; flex: 1; }
        .m-table-wrap { padding: 4px 8px; overflow-x: auto; }
        .row-link {
          background: none; border: 0; padding: 0; font: inherit;
          font-weight: 600; color: var(--ink); cursor: pointer;
          text-align: left;
        }
        .row-link:hover { color: var(--accent-ink); }
        .row-actions { display: inline-flex; gap: 4px; }
        .row-act {
          width: 30px; height: 30px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid var(--line);
          color: var(--ink-2);
          cursor: pointer;
          display: grid; place-items: center;
        }
        .row-act:hover { background: var(--bg-2); color: var(--ink); }
      `}</style>
    </div>
  );
}

// ---- Module editor (drawer) ------------------------------------------------
function ModuleEditor({
  state,
  onClose,
  onSave,
  onDelete,
}: {
  state: ModuleEditorState;
  onClose: () => void;
  onSave: (s: ModuleEditorState) => void;
  onDelete?: () => void;
}) {
  const [s, setS] = useState_Md<ModuleEditorState>(state);
  const [activeQ, setActiveQ] = useState_Md<number | null>(s.questions.length ? 0 : null);

  function addQ(kind: "choice" | "fill" | "match") {
    const newQ: any =
      kind === "match"
        ? { id: "q" + Date.now(), kind, prompt: "Match each word with its meaning.", pairs: [{ left: "", right: "" }], explain: "" }
        : {
            id: "q" + Date.now(),
            kind,
            prompt: kind === "fill" ? "Complete the sentence." : "Pick the correct answer.",
            sentence: kind === "fill" ? "Heavy rain reduces __ on the highway." : undefined,
            choices: [
              { id: "a", label: "" },
              { id: "b", label: "" },
              { id: "c", label: "" },
              { id: "d", label: "" },
            ],
            answer: "a",
            explain: "",
          };
    setS({ ...s, questions: [...s.questions, newQ] });
    setActiveQ(s.questions.length);
  }
  function updateQ(idx: number, patch: any) {
    const next = s.questions.map((q: any, i: number) => (i === idx ? { ...q, ...patch } : q));
    setS({ ...s, questions: next });
  }
  function removeQ(idx: number) {
    const next = s.questions.filter((_: any, i: number) => i !== idx);
    setS({ ...s, questions: next });
    setActiveQ(Math.min(idx, next.length - 1));
  }

  const cur = activeQ !== null ? s.questions[activeQ] : null;
  const isNew = s.id === "new";

  return (
    <div className="drawer-back fade-in" onClick={onClose}>
      <div className="drawer scale-in" onClick={(e) => e.stopPropagation()}>
        <header className="drw-head">
          <div>
            <p className="eyebrow">{isNew ? "New module" : "Edit module"}</p>
            <h2 className="serif" style={{ margin: "4px 0 0", fontSize: 22, letterSpacing: "-0.02em" }}>
              {s.title || (isNew ? "Untitled module" : state.title)}
            </h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {onDelete && (
              <button className="btn ghost" onClick={onDelete} style={{ color: "var(--rose)" }}>
                <TrashG /> Delete
              </button>
            )}
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn accent" onClick={() => onSave(s)}>
              {isNew ? "Create module" : "Save changes"}
            </button>
          </div>
        </header>

        <div className="drw-body">
          {/* META */}
          <section className="drw-meta">
            <div className="field">
              <label>Title</label>
              <input value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} placeholder="e.g. Everyday vocabulary · Set 2" />
            </div>
            <div className="drw-meta-grid">
              <div className="field">
                <label>Topic</label>
                <select value={s.topic} onChange={(e) => setS({ ...s, topic: e.target.value })}>
                  {["Vocabulary","Grammar","Listening","Speaking","Writing"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Level</label>
                <select value={s.level} onChange={(e) => setS({ ...s, level: e.target.value })}>
                  {["A2","B1","B2","C1"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select value={s.status} onChange={(e) => setS({ ...s, status: e.target.value })}>
                  <option>draft</option>
                  <option>published</option>
                  <option>archived</option>
                </select>
              </div>
            </div>
          </section>

          {/* QUESTIONS */}
          <section className="drw-q">
            <div className="q-pane-left">
              <div className="q-list-head">
                <span className="eyebrow">{s.questions.length} questions</span>
                <div className="add-q-menu">
                  <button className="btn ghost" onClick={() => addQ("choice")}><PlusG /> Choice</button>
                  <button className="btn ghost" onClick={() => addQ("fill")}><PlusG /> Fill-blank</button>
                  <button className="btn ghost" onClick={() => addQ("match")}><PlusG /> Match</button>
                </div>
              </div>
              <ul className="q-list">
                {s.questions.map((q: any, i: number) => (
                  <li
                    key={q.id}
                    className="q-list-item"
                    data-active={activeQ === i || undefined}
                    onClick={() => setActiveQ(i)}
                  >
                    <span className="mono q-idx">{String(i + 1).padStart(2, "0")}</span>
                    <span className="q-summary">
                      <span className="mono q-kind">{q.kind}</span>
                      <span className="q-prompt">{q.prompt || <em style={{ color: "var(--ink-3)" }}>Untitled</em>}</span>
                    </span>
                    <button
                      className="row-act"
                      onClick={(e) => { e.stopPropagation(); removeQ(i); }}
                      title="Delete question"
                      style={{ width: 26, height: 26 }}
                    >
                      <TrashG />
                    </button>
                  </li>
                ))}
                {s.questions.length === 0 && (
                  <li className="q-empty">
                    <p className="serif" style={{ margin: 0, fontSize: 16 }}>No questions yet</p>
                    <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13 }}>
                      Use one of the buttons above to add your first question.
                    </p>
                  </li>
                )}
              </ul>
            </div>

            <div className="q-pane-right">
              {cur ? (
                <QuestionEditor q={cur} onChange={(patch) => updateQ(activeQ!, patch)} />
              ) : (
                <div className="q-empty">
                  <p className="serif" style={{ margin: 0, fontSize: 16 }}>Select a question</p>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13 }}>
                    Or add one from the left.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <style>{`
        .drawer-back {
          position: fixed; inset: 0; z-index: 50;
          background: oklch(0.1 0.01 85 / 0.55);
          backdrop-filter: blur(4px);
          display: grid;
          place-items: stretch;
        }
        .drawer {
          margin-left: auto;
          width: min(1100px, 96vw);
          height: 100vh;
          background: var(--bg);
          display: flex; flex-direction: column;
          box-shadow: -8px 0 40px oklch(0 0 0 / 0.18);
        }
        .drw-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--line);
          background: var(--surface);
          flex-wrap: wrap;
        }
        .drw-head h2 {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        @media (max-width: 720px) {
          .drw-head { padding: 12px 14px; }
          .drw-head .btn { padding: 8px 12px; font-size: 12px; }
          .drw-head h2 { font-size: 17px !important; }
        }
        .drw-body {
          flex: 1; overflow-y: auto;
          padding: 22px;
          display: flex; flex-direction: column; gap: 18px;
        }
        .drw-meta {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
          padding: 18px 20px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .drw-meta-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          gap: 12px;
        }
        .field select {
          font: inherit;
          padding: 12px 14px;
          border-radius: var(--r-md);
          border: 1px solid var(--line);
          background: var(--surface);
          color: var(--ink);
          outline: none;
        }
        .field select:focus, .field input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px var(--accent-soft);
        }

        .drw-q {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 14px;
          flex: 1;
          min-height: 0;
        }
        .q-pane-left, .q-pane-right {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
        }
        .q-pane-left { display: flex; flex-direction: column; }
        .q-list-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--line);
          gap: 8px;
        }
        .add-q-menu { display: flex; gap: 4px; flex-wrap: wrap; }
        .add-q-menu .btn { padding: 6px 10px; font-size: 12px; }
        .q-list { list-style: none; padding: 8px; margin: 0; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; flex: 1; }
        .q-list-item {
          display: grid;
          grid-template-columns: 28px 1fr auto;
          gap: 10px; align-items: center;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .q-list-item:hover { background: var(--bg-2); }
        .q-list-item[data-active] {
          background: var(--accent-soft);
          color: var(--accent-ink);
        }
        .q-idx { font-size: 11px; color: var(--ink-3); }
        .q-list-item[data-active] .q-idx { color: var(--accent-ink); }
        .q-summary { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
        .q-kind {
          font-size: 9px; letter-spacing: 0.1em;
          color: var(--ink-3); text-transform: uppercase;
        }
        .q-prompt {
          font-size: 13px;
          font-weight: 500;
          overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap;
        }
        .q-pane-right { padding: 18px 22px; overflow-y: auto; }
        .q-empty {
          padding: 36px 22px;
          text-align: center;
        }

        @media (max-width: 820px) {
          .drw-meta-grid { grid-template-columns: 1fr 1fr; }
          .drw-q { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

// ---- Question editor (right pane) ------------------------------------------
function QuestionEditor({ q, onChange }: { q: any; onChange: (patch: any) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="qe-top">
        <span className="mono" style={{ fontSize: 10, padding: "4px 8px", background: "var(--bg-2)", borderRadius: 4, letterSpacing: "0.1em" }}>
          {q.kind.toUpperCase()}
        </span>
      </div>

      <div className="field">
        <label>Prompt</label>
        <textarea
          rows={2}
          value={q.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="Write the question prompt…"
        />
      </div>

      {q.kind === "fill" && (
        <div className="field">
          <label>Sentence (use __ for the blank)</label>
          <input
            value={q.sentence || ""}
            onChange={(e) => onChange({ sentence: e.target.value })}
            placeholder="Heavy rain reduces __ on the highway."
          />
        </div>
      )}

      {(q.kind === "choice" || q.kind === "fill") && q.context !== undefined && (
        <div className="field">
          <label>Context (shown above choices)</label>
          <input value={q.context || ""} onChange={(e) => onChange({ context: e.target.value })} />
        </div>
      )}

      {(q.kind === "choice" || q.kind === "fill") && (
        <div className="field">
          <label>Choices · pick the correct one</label>
          <div className="choices-edit">
            {(q.choices || []).map((c: any, i: number) => (
              <div key={c.id} className="choice-edit-row" data-correct={q.answer === c.id || undefined}>
                <button
                  className="choice-mark"
                  onClick={() => onChange({ answer: c.id })}
                  title="Mark correct"
                  type="button"
                >
                  {q.answer === c.id ? <DotFilled /> : <DotOpen />}
                </button>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", width: 14 }}>{String.fromCharCode(65 + i)}</span>
                <input
                  value={c.label}
                  onChange={(e) => {
                    const next = q.choices.map((x: any, j: number) => j === i ? { ...x, label: e.target.value } : x);
                    onChange({ choices: next });
                  }}
                  placeholder="Choice text…"
                />
                <button
                  className="row-act"
                  onClick={() => onChange({ choices: q.choices.filter((_: any, j: number) => j !== i) })}
                  type="button"
                ><TrashG /></button>
              </div>
            ))}
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                const used = (q.choices || []).map((c: any) => c.id);
                const id = ["a","b","c","d","e","f","g"].find((c) => !used.includes(c)) || "x";
                onChange({ choices: [...(q.choices || []), { id, label: "" }] });
              }}
              style={{ alignSelf: "flex-start" }}
            >
              <PlusG /> Add choice
            </button>
          </div>
        </div>
      )}

      {q.kind === "match" && (
        <div className="field">
          <label>Pairs · left side and its match</label>
          <div className="choices-edit">
            {(q.pairs || []).map((p: any, i: number) => (
              <div key={i} className="pair-row">
                <input
                  value={p.left}
                  onChange={(e) => {
                    const next = q.pairs.map((x: any, j: number) => j === i ? { ...x, left: e.target.value } : x);
                    onChange({ pairs: next });
                  }}
                  placeholder="English word"
                />
                <span className="mono" style={{ color: "var(--ink-3)", padding: "0 4px" }}>→</span>
                <input
                  value={p.right}
                  onChange={(e) => {
                    const next = q.pairs.map((x: any, j: number) => j === i ? { ...x, right: e.target.value } : x);
                    onChange({ pairs: next });
                  }}
                  placeholder="Meaning"
                />
                <button
                  className="row-act"
                  type="button"
                  onClick={() => onChange({ pairs: q.pairs.filter((_: any, j: number) => j !== i) })}
                ><TrashG /></button>
              </div>
            ))}
            <button
              className="btn ghost"
              type="button"
              onClick={() => onChange({ pairs: [...(q.pairs || []), { left: "", right: "" }] })}
              style={{ alignSelf: "flex-start" }}
            >
              <PlusG /> Add pair
            </button>
          </div>
        </div>
      )}

      <div className="field">
        <label>Explanation (shown to admins only in stats)</label>
        <textarea
          rows={2}
          value={q.explain || ""}
          onChange={(e) => onChange({ explain: e.target.value })}
          placeholder="Why is this the correct answer?"
        />
      </div>

      <style>{`
        textarea {
          font: inherit;
          padding: 12px 14px;
          border-radius: var(--r-md);
          border: 1px solid var(--line);
          background: var(--surface);
          color: var(--ink);
          outline: none;
          resize: vertical;
          font-family: var(--font-ui);
        }
        textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }

        .qe-top { display: flex; align-items: center; gap: 8px; }
        .choices-edit { display: flex; flex-direction: column; gap: 8px; }
        .choice-edit-row, .pair-row {
          display: grid;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: var(--bg-2);
          border-radius: 10px;
          border: 1px solid transparent;
        }
        .choice-edit-row {
          grid-template-columns: 30px 18px 1fr 32px;
        }
        .choice-edit-row[data-correct] {
          background: var(--accent-soft);
          border-color: color-mix(in oklch, var(--accent), white 60%);
        }
        .pair-row { grid-template-columns: 1fr 18px 1fr 32px; }
        .choice-mark {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: white;
          border: 1px solid var(--line);
          cursor: pointer;
          display: grid; place-items: center;
        }
        .choice-edit-row[data-correct] .choice-mark { border-color: var(--accent); }
        .choice-edit-row input, .pair-row input {
          font: inherit;
          padding: 8px 10px;
          background: white;
          border: 1px solid var(--line);
          border-radius: 8px;
          color: var(--ink);
          outline: none;
        }
        .choice-edit-row input:focus, .pair-row input:focus {
          border-color: var(--accent);
        }
      `}</style>
    </div>
  );
}

// glyphs
function G({ children, size = 14 }: any) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
function PlusG()   { return <G><path d="M12 5v14M5 12h14"/></G>; }
function SearchG() { return <G><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></G>; }
function PencilG() { return <G><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4z"/></G>; }
function TrashG()  { return <G><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></G>; }
function DotFilled() { return <svg width="10" height="10" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="var(--accent)"/></svg>; }
function DotOpen()   { return <svg width="10" height="10" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="none" stroke="var(--ink-3)" strokeWidth="2"/></svg>; }

(window as any).AdminModules = AdminModules;
