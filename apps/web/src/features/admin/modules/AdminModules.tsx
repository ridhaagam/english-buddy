import { useState, Fragment, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, EditIcon, TrashIcon, XIcon, ArrowRightIcon, UsersIcon, CheckIcon } from "../../../components/ui";
import { api } from "../../../lib/api";
import "./AdminModules.css";

const TOPICS = ["vocabulary", "grammar", "listening", "speaking", "writing"];
const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];

type Q = { id?: string; kind: string; prompt: string; context?: string | null; sentence?: string | null; explain?: string | null; payload: any };
type ModuleForm = {
  title: string; topic: string; cefr_level: string; description: string;
  source_kind: string; status: string; questions: Q[];
};
type Settings = {
  deadline: string; is_closed: boolean; max_attempts: string; show_answers_after_deadline: boolean; reveal_at: string;
};

const blank: ModuleForm = {
  title: "", topic: "vocabulary", cefr_level: "B1", description: "",
  source_kind: "manual", status: "draft", questions: [],
};
const blankSettings: Settings = { deadline: "", is_closed: false, max_attempts: "", show_answers_after_deadline: false, reveal_at: "" };
const blankQ: Q = { kind: "choice", prompt: "", context: null, sentence: null, explain: null, payload: { choices: [], answer: "" } };

export function AdminModules() {
  const qc = useQueryClient();
  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["admin-modules"],
    queryFn: () => api.admin.modules.list(),
  });

  const [open, setOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [assignModuleId, setAssignModuleId] = useState<string | null>(null);
  const [form, setForm] = useState<ModuleForm>(blank);
  const [settings, setSettings] = useState<Settings>(blankSettings);
  const [qIdx, setQIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  function openNew() { setEditing(null); setForm(blank); setSettings(blankSettings); setQIdx(null); setOpen(true); }

  async function openEdit(m: any) {
    // Open the drawer immediately with basic metadata so it feels instant
    setEditing(m);
    setForm({
      title: m.title, topic: m.topic, cefr_level: m.cefr_level,
      description: m.description || "", source_kind: m.source_kind || "manual",
      status: m.status, questions: [],
    });
    setSettings({
      deadline: m.deadline ? m.deadline.slice(0, 16) : "",
      is_closed: m.is_closed || false,
      max_attempts: m.max_attempts != null ? String(m.max_attempts) : "",
      show_answers_after_deadline: m.show_answers_after_deadline !== false,
      reveal_at: m.reveal_at ? m.reveal_at.slice(0, 16) : "",
    });
    setQIdx(null);
    setOpen(true);
    setDetailLoading(true);
    try {
      const detail = await api.admin.modules.get(m.id);
      setForm((f) => ({
        ...f,
        title: detail.title,
        topic: detail.topic,
        cefr_level: detail.cefr_level,
        description: detail.description || "",
        source_kind: detail.source_kind || "manual",
        status: detail.status,
        questions: (detail.questions || []).map((q: any) => ({
          id: q.id,
          kind: q.kind,
          prompt: q.prompt,
          context: q.context ?? null,
          sentence: q.sentence ?? null,
          explain: q.explain ?? null,
          payload: q.payload ?? {},
        })),
      }));
      setSettings({
        deadline: detail.deadline ? detail.deadline.slice(0, 16) : "",
        is_closed: detail.is_closed || false,
        max_attempts: detail.max_attempts != null ? String(detail.max_attempts) : "",
        show_answers_after_deadline: detail.show_answers_after_deadline !== false,
        reveal_at: detail.reveal_at ? detail.reveal_at.slice(0, 16) : "",
      });
    } catch (err: any) {
      showToast("Failed to load module: " + (err.message || "unknown error"), false);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDrawer() { setOpen(false); setEditing(null); setForm(blank); setSettings(blankSettings); setQIdx(null); setDetailLoading(false); }
  function setF(k: keyof ModuleForm, v: any) { setForm((f) => ({ ...f, [k]: v })); }
  function setS(k: keyof Settings, v: any) { setSettings((s) => ({ ...s, [k]: v })); }

  function addQ() {
    const qs = [...form.questions, { ...blankQ, payload: JSON.parse(JSON.stringify(blankQ.payload)) }];
    setForm((f) => ({ ...f, questions: qs }));
    setQIdx(qs.length - 1);
  }
  function delQ(i: number) { setForm((f) => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) })); setQIdx(null); }
  function setQ(i: number, k: keyof Q, v: any) { setForm((f) => ({ ...f, questions: f.questions.map((q, idx) => idx === i ? { ...q, [k]: v } : q) })); }
  function setQPayload(i: number, v: any) { setForm((f) => ({ ...f, questions: f.questions.map((q, idx) => idx === i ? { ...q, payload: v } : q) })); }

  const curQ = qIdx !== null ? form.questions[qIdx] : null;

  async function handleSave() {
    setSaving(true);
    try {
      const res: any = await (editing
        ? api.admin.modules.update(editing.id, form)
        : api.admin.modules.create(form));
      const moduleId = editing?.id ?? res?.id;
      if (moduleId) {
        const deadline = settings.deadline ? `${settings.deadline}:00Z` : null;
        const reveal_at = settings.reveal_at ? `${settings.reveal_at}:00Z` : null;
        await api.admin.modules.updateSettings(moduleId, {
          deadline,
          reveal_at,
          is_closed: settings.is_closed,
          max_attempts: settings.max_attempts !== "" ? Number(settings.max_attempts) : null,
          show_answers_after_deadline: settings.show_answers_after_deadline,
        });
      }
      qc.invalidateQueries({ queryKey: ["admin-modules"] });
      showToast(editing ? "Module saved" : "Module created", true);
      closeDrawer();
    } catch (err: any) {
      showToast(err.message || "Save failed", false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.admin.modules.delete(id);
      qc.invalidateQueries({ queryKey: ["admin-modules"] });
      showToast("Module deleted", true);
    } catch (err: any) {
      showToast(err.message || "Delete failed", false);
    }
  }

  async function handlePublish(id: string) {
    try {
      await api.admin.modules.publish(id);
      qc.invalidateQueries({ queryKey: ["admin-modules"] });
      showToast("Module published", true);
    } catch (err: any) {
      showToast(err.message || "Publish failed", false);
    }
  }

  return (
    <div className="container adm-page">
      {toast && (
        <div className={`mod-toast${toast.ok ? " ok" : " err"}`}>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}
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

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["Title", "Topic", "Level", "Questions", "Status", "Access", ""].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(modules as any[]).map((m: any) => (
              <Fragment key={m.id}>
                <tr style={{ borderBottom: confirmDeleteId === m.id ? "none" : "1px solid var(--line-2)" }}>
                  <td data-label="Title" style={tdStyle}><span style={{ fontWeight: 600 }}>{m.title}</span></td>
                  <td data-label="Topic" style={tdStyle}><span className="mono" style={{ fontSize: 11, textTransform: "capitalize", padding: "3px 8px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink-2)", border: "1px solid var(--line)" }}>{m.topic}</span></td>
                  <td data-label="Level" style={tdStyle}><span className="mono" style={{ fontSize: 12 }}>{m.cefr_level}</span></td>
                  <td data-label="Questions" style={tdStyle}>{m.questions_count ?? 0}</td>
                  <td data-label="Status" style={tdStyle}>
                    <span className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: m.status === "published" ? "var(--accent-soft)" : "var(--bg-2)", color: m.status === "published" ? "var(--accent-ink)" : "var(--ink-3)", border: "1px solid var(--line)" }}>
                      {m.status}
                    </span>
                  </td>
                  <td data-label="Access" style={tdStyle}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {m.is_closed && (
                        <span className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "oklch(0.93 0.06 25)", color: "oklch(0.45 0.1 25)", border: "1px solid oklch(0.85 0.06 25)" }}>CLOSED</span>
                      )}
                      {m.deadline && !m.is_closed && (
                        <span className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "oklch(0.93 0.04 85)", color: "oklch(0.45 0.1 85)", border: "1px solid oklch(0.88 0.06 85)" }}>
                          Due {new Date(m.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {m.max_attempts && (
                        <span className="mono" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink-3)", border: "1px solid var(--line)" }}>
                          Max {m.max_attempts}
                        </span>
                      )}
                      {!m.is_closed && !m.deadline && !m.max_attempts && (
                        <span style={{ color: "var(--ink-3)", fontSize: 12 }}>Open</span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {m.status !== "published" && (
                        <button className="btn ghost sm" onClick={() => handlePublish(m.id)}>Publish</button>
                      )}
                      <button className="icon-btn" title="Assign learners" onClick={() => setAssignModuleId(m.id)}><UsersIcon size={14} /></button>
                      <button className="icon-btn" onClick={() => openEdit(m)}><EditIcon size={14} /></button>
                      <button
                        className="icon-btn"
                        style={{ color: confirmDeleteId === m.id ? "oklch(0.5 0.15 25)" : undefined }}
                        onClick={() => setConfirmDeleteId(confirmDeleteId === m.id ? null : m.id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                {confirmDeleteId === m.id && (
                  <tr>
                    <td colSpan={7} style={{ padding: 0, borderBottom: "1px solid var(--line-2)" }}>
                      <div className="del-confirm">
                        <span style={{ flex: 1, color: "oklch(0.45 0.1 25)" }}>
                          Delete <strong>{m.title}</strong>? This cannot be undone.
                        </span>
                        <button className="btn ghost sm" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        <button
                          style={{ padding: "5px 14px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, background: "oklch(0.5 0.15 25)", color: "white", border: "none", cursor: "pointer" }}
                          onClick={() => { handleDelete(m.id); setConfirmDeleteId(null); }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {modules.length === 0 && !isLoading && (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "var(--ink-3)" }}>No modules yet. Create one!</td></tr>
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
              {detailLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0 14px", color: "var(--ink-3)", fontSize: 13 }}>
                  <div className="dot-load" style={{ transform: "scale(0.7)" }}><i /><i /><i /></div>
                  Loading questions…
                </div>
              )}
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

                  {/* Access settings */}
                  <div style={{ paddingTop: 4, borderTop: "1px solid var(--line-2)" }}>
                    <p className="eyebrow" style={{ margin: "0 0 10px" }}>Access settings</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div className="field">
                        <label>Deadline</label>
                        <input type="datetime-local" value={settings.deadline}
                          onChange={(e) => setS("deadline", e.target.value)}
                          style={{ fontSize: 13 }} />
                      </div>
                      <div className="field">
                        <label>Max attempts</label>
                        <input type="number" min="1" value={settings.max_attempts}
                          onChange={(e) => setS("max_attempts", e.target.value)}
                          placeholder="Unlimited" />
                      </div>
                      <div className="field" style={{ gridColumn: "1 / -1" }}>
                        <label>Reveal answers at (learners see results after this time)</label>
                        <input type="datetime-local" value={settings.reveal_at}
                          onChange={(e) => setS("reveal_at", e.target.value)}
                          style={{ fontSize: 13 }} />
                        <span style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>Leave blank and check "Reveal answers" to show results immediately. Set a date to reveal after that time.</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" checked={settings.is_closed}
                          onChange={(e) => setS("is_closed", e.target.checked)} />
                        Close module (block new attempts)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" checked={settings.show_answers_after_deadline}
                          onChange={(e) => setS("show_answers_after_deadline", e.target.checked)} />
                        Reveal answers to learners
                      </label>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--line-2)" }}>
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
                    {form.questions.length === 0 && !detailLoading && <p style={{ color: "var(--ink-3)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No questions yet.</p>}
                  </div>
                </div>

                {curQ && qIdx !== null && (
                  <div className="drawer-right">
                    <p className="eyebrow" style={{ margin: "0 0 12px" }}>Question {qIdx + 1}</p>
                    <div className="field">
                      <label>Type</label>
                      <select value={curQ.kind} onChange={(e) => {
                        const kind = e.target.value;
                        const payload = kind === "match" ? { pairs: [] } : kind === "fill" ? { sentence: curQ.sentence || "", choices: [], answer: "" } : { choices: [], answer: "" };
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
              <button className="btn accent" disabled={saving || detailLoading} onClick={handleSave}>
                {saving ? "Saving…" : detailLoading ? "Loading…" : "Save module"} <ArrowRightIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {assignModuleId && (
        <AssignLearnersModal moduleId={assignModuleId} onClose={() => setAssignModuleId(null)} />
      )}

    </div>
  );
}

function QuestionChoiceEditor({ q, onChange }: { q: Q; onChange: (p: any) => void }) {
  const choices = q.payload?.choices ?? [];
  const correct = q.payload?.answer ?? "";
  const sentence = q.payload?.sentence ?? "";

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
          <div key={c.id} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center", width: "100%" }}>
            <input type="radio" name={`correct-${q.id ?? "new"}`} style={{ flexShrink: 0, width: "auto" }} checked={correct === c.id} onChange={() => onChange({ ...q.payload, answer: c.id })} />
            <input style={{ flex: 1, minWidth: 0 }} value={c.label} onChange={(e) => {
              const c2 = choices.map((ch: any, idx: number) => idx === i ? { ...ch, label: e.target.value } : ch);
              onChange({ ...q.payload, choices: c2 });
            }} placeholder={`Choice ${i + 1}`} />
            <button className="icon-btn" onClick={() => onChange({ ...q.payload, choices: choices.filter((_: any, idx: number) => idx !== i) })}><TrashIcon size={12} /></button>
          </div>
        ))}
        <button className="btn ghost sm" style={{ marginTop: 4 }} onClick={() => {
          const id = `c${Date.now()}`;
          onChange({ ...q.payload, choices: [...choices, { id, label: "" }] });
        }}><PlusIcon size={12} /> Add choice</button>
      </div>
    </>
  );
}

function QuestionMatchEditor({ q, onChange }: { q: Q; onChange: (p: any) => void }) {
  const pairs = q.payload?.pairs ?? [];
  return (
    <div className="field">
      <label>Pairs (left → right)</label>
      {pairs.map((p: any, i: number) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <input value={p.left} onChange={(e) => { const ps = pairs.map((pair: any, idx: number) => idx === i ? { ...pair, left: e.target.value } : pair); onChange({ ...q.payload, pairs: ps }); }} placeholder="Term" />
          <span style={{ color: "var(--ink-3)" }}>→</span>
          <input value={p.right} onChange={(e) => { const ps = pairs.map((pair: any, idx: number) => idx === i ? { ...pair, right: e.target.value } : pair); onChange({ ...q.payload, pairs: ps }); }} placeholder="Meaning" />
          <button className="icon-btn" onClick={() => onChange({ ...q.payload, pairs: pairs.filter((_: any, idx: number) => idx !== i) })}><TrashIcon size={12} /></button>
        </div>
      ))}
      <button className="btn ghost sm" style={{ marginTop: 4 }} onClick={() => onChange({ ...q.payload, pairs: [...pairs, { left: "", right: "" }] })}><PlusIcon size={12} /> Add pair</button>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600, background: "var(--bg-2)" };
const tdStyle: React.CSSProperties = { padding: "14px 16px", verticalAlign: "middle", fontSize: 14 };


// ──────────────────────────────────────────────
// Per-module learner assignment modal
// ──────────────────────────────────────────────

function AssignLearnersModal({ moduleId, onClose }: { moduleId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["module-assignments", moduleId],
    queryFn: () => api.admin.courses.getModuleAssignments(moduleId),
  });

  // Build initial selection from direct assignments
  const [directIds, setDirectIds] = useState<Set<string> | null>(null);

  // Once data loads, seed directIds from the response
  const learners: any[] = data?.learners ?? [];
  if (data && directIds === null) {
    setDirectIds(new Set(learners.filter((l: any) => l.access === "direct").map((l: any) => l.id)));
  }

  const selected = directIds ?? new Set<string>();

  const save = useMutation({
    mutationFn: () => api.admin.courses.setModuleAssignments(moduleId, Array.from(selected)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["module-assignments", moduleId] });
      onClose();
    },
  });

  function toggle(id: string) {
    setDirectIds((s) => {
      const n = new Set(s ?? []);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const filtered = learners.filter((l: any) =>
    !search || l.display_name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 400, display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-xl)", padding: "28px 24px", width: "100%", maxWidth: 480, boxShadow: "var(--shadow-md)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>Assign learners</h3>
          <button className="icon-btn" onClick={onClose}><XIcon size={16} /></button>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-2)" }}>
          Check learners for direct access to this module. Course-enrolled learners already have access but are shown for reference.
        </p>
        <input className="input" style={{ width: "100%", marginBottom: 10, boxSizing: "border-box" }}
          placeholder="Search learners…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        {isLoading ? (
          <p style={{ color: "var(--ink-3)", fontSize: 13 }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "var(--ink-3)", fontSize: 13 }}>No learners found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 340, overflowY: "auto" }}>
            {filtered.map((l: any) => {
              const viaCourse = l.access === "course";
              const isDirect = selected.has(l.id);
              return (
                <label key={l.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  borderRadius: "var(--r-sm)",
                  background: isDirect ? "var(--accent-soft)" : viaCourse ? "oklch(0.96 0.02 158)" : "var(--bg-2)",
                  border: `1px solid ${isDirect ? "var(--accent)" : viaCourse ? "oklch(0.82 0.05 158)" : "var(--line-2)"}`,
                  cursor: viaCourse ? "default" : "pointer",
                  opacity: viaCourse ? 0.8 : 1,
                }}>
                  <input type="checkbox" checked={isDirect || viaCourse} disabled={viaCourse}
                    onChange={() => !viaCourse && toggle(l.id)}
                    style={{ accentColor: "var(--accent)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{l.display_name}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)" }}>{l.email}</span>
                  </div>
                  {viaCourse && <span className="mono" style={{ fontSize: 10, color: "oklch(0.45 0.1 158)", flexShrink: 0 }}>via course</span>}
                  {isDirect && !viaCourse && <CheckIcon size={12} />}
                </label>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn accent" disabled={save.isPending || isLoading} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save assignments"}
          </button>
        </div>
      </div>
    </div>
  );
}
