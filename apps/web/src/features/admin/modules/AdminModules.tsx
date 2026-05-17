import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, EditIcon, TrashIcon, CheckIcon, XIcon, ArrowRightIcon } from "../../../components/ui";
import { api } from "../../../lib/api";

const TOPICS = ["vocabulary", "grammar", "listening", "speaking", "writing"];
const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];

type Q = { id?: string; kind: string; prompt: string; payload: any };
type ModuleForm = {
  title: string; topic: string; cefr_level: string; description: string;
  source_kind: string; status: string; questions: Q[];
};

const blank: ModuleForm = {
  title: "", topic: "vocabulary", cefr_level: "B1", description: "",
  source_kind: "manual", status: "draft", questions: [],
};

const blankQ: Q = { kind: "choice", prompt: "", payload: { choices: [], answer: "" } };

export function AdminModules() {
  const qc = useQueryClient();
  const { data: modules = [], isLoading } = useQuery({ queryKey: ["admin-modules"], queryFn: () => api.admin.modules.list() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<ModuleForm>(blank);
  const [qIdx, setQIdx] = useState<number | null>(null);

  const upsert = useMutation({
    mutationFn: (d: any) => editing ? api.admin.modules.update(editing.id, d) : api.admin.modules.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-modules"] }); closeDrawer(); },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.admin.modules.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-modules"] }),
  });

  const publish = useMutation({
    mutationFn: (id: string) => api.admin.modules.publish(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-modules"] }),
  });

  function openNew() { setEditing(null); setForm(blank); setQIdx(null); setOpen(true); }
  function openEdit(m: any) {
    setEditing(m);
    setForm({ title: m.title, topic: m.topic, cefr_level: m.cefr_level, description: m.description || "", source_kind: m.source_kind || "manual", status: m.status, questions: m.questions || [] });
    setQIdx(null);
    setOpen(true);
  }
  function closeDrawer() { setOpen(false); setEditing(null); setForm(blank); setQIdx(null); }

  function setF(k: keyof ModuleForm, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  function addQ() {
    const qs = [...form.questions, { ...blankQ, payload: JSON.parse(JSON.stringify(blankQ.payload)) }];
    setForm((f) => ({ ...f, questions: qs }));
    setQIdx(qs.length - 1);
  }

  function delQ(i: number) {
    const qs = form.questions.filter((_, idx) => idx !== i);
    setForm((f) => ({ ...f, questions: qs }));
    setQIdx(null);
  }

  function setQ(i: number, k: keyof Q, v: any) {
    const qs = form.questions.map((q, idx) => idx === i ? { ...q, [k]: v } : q);
    setForm((f) => ({ ...f, questions: qs }));
  }

  function setQPayload(i: number, v: any) {
    const qs = form.questions.map((q, idx) => idx === i ? { ...q, payload: v } : q);
    setForm((f) => ({ ...f, questions: qs }));
  }

  const curQ = qIdx !== null ? form.questions[qIdx] : null;

  return (
    <div className="container adm-page">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="serif" style={{ fontSize: 36, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Modules</h1>
          <p style={{ color: "var(--ink-2)", margin: 0 }}>Create and manage all practice modules.</p>
        </div>
        <button className="btn accent" style={{ marginTop: 8 }} onClick={openNew}>
          <PlusIcon size={14} /> New module
        </button>
      </header>

      {isLoading && <div style={{ color: "var(--ink-3)" }}>Loading…</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["Title", "Topic", "Level", "Questions", "Status", ""].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(modules as any[]).map((m: any) => (
              <tr key={m.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                <td style={tdStyle}><span style={{ fontWeight: 600 }}>{m.title}</span></td>
                <td style={tdStyle}><span className="mono" style={{ fontSize: 11, textTransform: "capitalize", padding: "3px 8px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink-2)", border: "1px solid var(--line)" }}>{m.topic}</span></td>
                <td style={tdStyle}><span className="mono" style={{ fontSize: 12 }}>{m.cefr_level}</span></td>
                <td style={tdStyle}>{m.questions_count ?? 0}</td>
                <td style={tdStyle}>
                  <span className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: m.status === "published" ? "var(--accent-soft)" : "var(--bg-2)", color: m.status === "published" ? "var(--accent-ink)" : "var(--ink-3)", border: "1px solid var(--line)" }}>
                    {m.status}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {m.status !== "published" && (
                      <button className="btn ghost sm" onClick={() => publish.mutate(m.id)}>Publish</button>
                    )}
                    <button className="icon-btn" onClick={() => openEdit(m)}><EditIcon size={14} /></button>
                    <button className="icon-btn" onClick={() => { if (confirm("Delete?")) del.mutate(m.id); }}><TrashIcon size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {modules.length === 0 && !isLoading && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--ink-3)" }}>No modules yet. Create one!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="drawer-overlay" onClick={(e) => e.target === e.currentTarget && closeDrawer()}>
          <div className="drawer fade-up">
            <div className="drawer-head">
              <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>{editing ? "Edit module" : "New module"}</h2>
              <button className="icon-btn" onClick={closeDrawer}><XIcon size={16} /></button>
            </div>

            <div className="drawer-body">
              <div className="drawer-cols">
                <div className="drawer-left">
                  <div className="field">
                    <label>Title</label>
                    <input value={form.title} onChange={(e) => setF("title", e.target.value)} placeholder="Module title" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="field">
                      <label>Topic</label>
                      <select value={form.topic} onChange={(e) => setF("topic", e.target.value)}>
                        {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>CEFR level</label>
                      <select value={form.cefr_level} onChange={(e) => setF("cefr_level", e.target.value)}>
                        {CEFR.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label>Description</label>
                    <textarea value={form.description} onChange={(e) => setF("description", e.target.value)} rows={3} placeholder="What will students learn?" />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <p className="eyebrow" style={{ margin: 0 }}>Questions ({form.questions.length})</p>
                    <button className="btn ghost sm" onClick={addQ}><PlusIcon size={12} /> Add</button>
                  </div>
                  <div className="q-list">
                    {form.questions.map((q, i) => (
                      <div key={i} className={`q-item${qIdx === i ? " active" : ""}`} onClick={() => setQIdx(i)}>
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{i + 1}.</span>
                        <span style={{ flex: 1, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.prompt || "(no prompt)"}</span>
                        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{q.kind}</span>
                        <button className="icon-btn" style={{ opacity: 0.5 }} onClick={(e) => { e.stopPropagation(); delQ(i); }}><TrashIcon size={12} /></button>
                      </div>
                    ))}
                    {form.questions.length === 0 && <p style={{ color: "var(--ink-3)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No questions yet.</p>}
                  </div>
                </div>

                {curQ && qIdx !== null && (
                  <div className="drawer-right">
                    <p className="eyebrow" style={{ margin: "0 0 12px" }}>Question {qIdx + 1}</p>
                    <div className="field">
                      <label>Type</label>
                      <select value={curQ.kind} onChange={(e) => {
                        const kind = e.target.value;
                        const payload = kind === "match" ? { pairs: [] } : kind === "fill" ? { sentence: "", choices: [], answer: "" } : { choices: [], answer: "" };
                        setQ(qIdx, "kind", kind);
                        setQPayload(qIdx, payload);
                      }}>
                        <option value="choice">Multiple choice</option>
                        <option value="fill">Fill in blank</option>
                        <option value="match">Match pairs</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Prompt</label>
                      <input value={curQ.prompt} onChange={(e) => setQ(qIdx, "prompt", e.target.value)} placeholder="Question prompt" />
                    </div>

                    {(curQ.kind === "choice" || curQ.kind === "fill") && (
                      <QuestionChoiceEditor q={curQ} onChange={(p) => setQPayload(qIdx, p)} />
                    )}
                    {curQ.kind === "match" && (
                      <QuestionMatchEditor q={curQ} onChange={(p) => setQPayload(qIdx, p)} />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="drawer-foot">
              <button className="btn ghost" onClick={closeDrawer}>Cancel</button>
              <button className="btn accent" disabled={upsert.isPending} onClick={() => upsert.mutate(form)}>
                {upsert.isPending ? "Saving…" : "Save module"} <ArrowRightIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .adm-page { padding-top: 28px; }
        .drawer-overlay { position:fixed; inset:0; background:oklch(0 0 0/0.4); z-index:100; display:flex; justify-content:flex-end; }
        .drawer { background:var(--bg); width:min(780px,96vw); height:100%; display:flex; flex-direction:column; overflow:hidden; box-shadow:var(--shadow-lg); }
        .drawer-head { display:flex; justify-content:space-between; align-items:center; padding:20px 24px; border-bottom:1px solid var(--line); background:var(--surface); flex-shrink:0; }
        .drawer-body { flex:1; overflow-y:auto; padding:20px 24px; }
        .drawer-foot { padding:16px 24px; border-top:1px solid var(--line); display:flex; justify-content:flex-end; gap:10px; background:var(--surface); flex-shrink:0; }
        .drawer-cols { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .drawer-left { display:flex; flex-direction:column; gap:12px; }
        .drawer-right { display:flex; flex-direction:column; gap:12px; padding-left:20px; border-left:1px solid var(--line); }
        .q-list { display:flex; flex-direction:column; gap:4px; max-height:240px; overflow-y:auto; }
        .q-item { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:var(--r-sm); border:1px solid var(--line); cursor:pointer; transition:border-color 0.15s,background 0.15s; }
        .q-item:hover { border-color:var(--ink-3); }
        .q-item.active { border-color:var(--accent); background:var(--accent-soft); }
        @media(max-width:600px) { .drawer-cols{grid-template-columns:1fr} .drawer-right{border-left:none;border-top:1px solid var(--line);padding-left:0;padding-top:20px} }
      `}</style>
    </div>
  );
}

function QuestionChoiceEditor({ q, onChange }: { q: Q; onChange: (p: any) => void }) {
  const choices = q.payload?.choices ?? [];
  const correct = q.payload?.answer ?? "";
  const sentence = q.payload?.sentence ?? "";

  function setChoice(i: number, label: string) {
    const c = choices.map((ch: any, idx: number) => idx === i ? { ...ch, label } : ch);
    onChange({ ...q.payload, choices: c });
  }
  function addChoice() {
    const id = `c${Date.now()}`;
    onChange({ ...q.payload, choices: [...choices, { id, label: "" }] });
  }
  function delChoice(i: number) {
    onChange({ ...q.payload, choices: choices.filter((_: any, idx: number) => idx !== i) });
  }

  return (
    <>
      {q.kind === "fill" && (
        <div className="field">
          <label>Sentence (use __ for blank)</label>
          <input value={sentence} onChange={(e) => onChange({ ...q.payload, sentence: e.target.value })} placeholder="She __ the cat." />
        </div>
      )}
      <div className="field">
        <label>Choices</label>
        {choices.map((c: any, i: number) => (
          <div key={c.id} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <input type="radio" name={`correct-${q.id ?? "new"}`} checked={correct === c.id} onChange={() => onChange({ ...q.payload, answer: c.id })} />
            <input style={{ flex: 1 }} value={c.label} onChange={(e) => setChoice(i, e.target.value)} placeholder={`Choice ${i + 1}`} />
            <button className="icon-btn" onClick={() => delChoice(i)}><TrashIcon size={12} /></button>
          </div>
        ))}
        <button className="btn ghost sm" style={{ marginTop: 4 }} onClick={addChoice}><PlusIcon size={12} /> Add choice</button>
      </div>
    </>
  );
}

function QuestionMatchEditor({ q, onChange }: { q: Q; onChange: (p: any) => void }) {
  const pairs = q.payload?.pairs ?? [];

  function setPair(i: number, k: "left" | "right", v: string) {
    const p = pairs.map((pair: any, idx: number) => idx === i ? { ...pair, [k]: v } : pair);
    onChange({ ...q.payload, pairs: p });
  }
  function addPair() {
    onChange({ ...q.payload, pairs: [...pairs, { left: "", right: "" }] });
  }
  function delPair(i: number) {
    onChange({ ...q.payload, pairs: pairs.filter((_: any, idx: number) => idx !== i) });
  }

  return (
    <div className="field">
      <label>Pairs (left → right)</label>
      {pairs.map((p: any, i: number) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <input value={p.left} onChange={(e) => setPair(i, "left", e.target.value)} placeholder="Term" />
          <span style={{ color: "var(--ink-3)" }}>→</span>
          <input value={p.right} onChange={(e) => setPair(i, "right", e.target.value)} placeholder="Meaning" />
          <button className="icon-btn" onClick={() => delPair(i)}><TrashIcon size={12} /></button>
        </div>
      ))}
      <button className="btn ghost sm" style={{ marginTop: 4 }} onClick={addPair}><PlusIcon size={12} /> Add pair</button>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600, background: "var(--bg-2)" };
const tdStyle: React.CSSProperties = { padding: "14px 16px", verticalAlign: "middle", fontSize: 14 };
