import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, TrashIcon, XIcon, EditIcon, UsersIcon, BookOpenIcon, CheckIcon, LayersIcon } from "../../../components/ui";
import { api } from "../../../lib/api";

export function AdminCourses() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="container adm-page">
      <header style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="serif" style={{ fontSize: 36, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Courses</h1>
          <p style={{ color: "var(--ink-2)", margin: 0 }}>Group modules into courses and assign learners.</p>
        </div>
        <button className="btn accent" style={{ gap: 6 }} onClick={() => setCreateOpen(true)}>
          <PlusIcon size={14} /> New course
        </button>
      </header>

      <div className="courses-layout">
        <CourseList selectedId={selectedId} onSelect={setSelectedId} />
        {selectedId ? (
          <CourseDetail courseId={selectedId} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="card courses-empty-panel">
            <LayersIcon size={32} />
            <p style={{ margin: "12px 0 0", color: "var(--ink-3)", fontSize: 14 }}>Select a course to manage its modules and learners</p>
          </div>
        )}
      </div>

      {createOpen && <CreateCourseModal onClose={() => setCreateOpen(false)} />}

      <style>{`
        .courses-layout { display:grid; grid-template-columns:300px 1fr; gap:16px; align-items:start; }
        .courses-empty-panel { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:260px; color:var(--ink-3); }
        @media(max-width:700px) { .courses-layout { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}


// ──────────────────────────────────────────────
// Left panel: course list
// ──────────────────────────────────────────────

function CourseList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const { data: courses = [], isLoading } = useQuery({ queryKey: ["admin-courses"], queryFn: api.admin.courses.list });

  const del = useMutation({
    mutationFn: (id: string) => api.admin.courses.delete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      if (selectedId === id) onSelect("");
    },
  });

  if (isLoading) return <div className="card" style={{ padding: 20, color: "var(--ink-3)" }}>Loading…</div>;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {(courses as any[]).length === 0 && (
        <p style={{ padding: 20, color: "var(--ink-3)", fontSize: 13 }}>No courses yet. Create one to get started.</p>
      )}
      {(courses as any[]).map((c: any) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          style={{
            display: "block", width: "100%", textAlign: "left", padding: "14px 16px",
            background: selectedId === c.id ? "var(--accent-soft)" : "transparent",
            border: "none", borderBottom: "1px solid var(--line-2)", cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: selectedId === c.id ? "var(--accent-ink)" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.title}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-3)" }}>
                {c.module_count} module{c.module_count !== 1 ? "s" : ""} · {c.user_count} learner{c.user_count !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              className="icon-btn"
              style={{ flexShrink: 0, color: "var(--ink-3)", fontSize: 11 }}
              onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${c.title}"?`)) del.mutate(c.id); }}
              title="Delete course"
            >
              <TrashIcon size={13} />
            </button>
          </div>
        </button>
      ))}
    </div>
  );
}


// ──────────────────────────────────────────────
// Right panel: course detail
// ──────────────────────────────────────────────

function CourseDetail({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [addModOpen, setAddModOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["admin-course", courseId],
    queryFn: () => api.admin.courses.get(courseId),
  });

  const removeMod = useMutation({
    mutationFn: (mid: string) => api.admin.courses.removeModule(courseId, mid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-course", courseId] }); qc.invalidateQueries({ queryKey: ["admin-courses"] }); },
  });

  const unenroll = useMutation({
    mutationFn: (uid: string) => api.admin.courses.unenrollUser(courseId, uid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-course", courseId] }); qc.invalidateQueries({ queryKey: ["admin-courses"] }); },
  });

  if (isLoading) return <div className="card" style={{ padding: 20, color: "var(--ink-3)" }}>Loading…</div>;
  if (!course) return null;

  return (
    <div className="card" style={{ padding: "20px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>{course.title}</h2>
          {course.description && <p style={{ margin: "4px 0 0", color: "var(--ink-2)", fontSize: 13 }}>{course.description}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button className="btn ghost" style={{ gap: 6 }} onClick={() => setEditOpen(true)}><EditIcon size={13} /> Edit</button>
        </div>
      </div>

      {/* Modules section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Modules ({(course.modules ?? []).length})</p>
          <button className="btn ghost" style={{ gap: 6 }} onClick={() => setAddModOpen(true)}>
            <PlusIcon size={13} /> Add modules
          </button>
        </div>
        {(course.modules ?? []).length === 0 ? (
          <p style={{ color: "var(--ink-3)", fontSize: 13 }}>No modules yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(course.modules as any[]).map((m: any) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", border: "1px solid var(--line-2)" }}>
                <BookOpenIcon size={13} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</span>
                  <span className="mono" style={{ marginLeft: 8, fontSize: 10, color: "var(--ink-3)" }}>{m.cefr_level}</span>
                </div>
                <span style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase" }}>{m.topic}</span>
                <button className="icon-btn" style={{ color: "var(--ink-3)" }} onClick={() => removeMod.mutate(m.id)}><XIcon size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enrolled learners section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Enrolled learners ({(course.users ?? []).length})</p>
          <button className="btn ghost" style={{ gap: 6 }} onClick={() => setEnrollOpen(true)}>
            <UsersIcon size={13} /> Enroll learners
          </button>
        </div>
        {(course.users ?? []).length === 0 ? (
          <p style={{ color: "var(--ink-3)", fontSize: 13 }}>No learners enrolled yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(course.users as any[]).map((u: any) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", border: "1px solid var(--line-2)" }}>
                <UsersIcon size={13} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{u.display_name}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)" }}>{u.email}</span>
                </div>
                <button className="icon-btn" style={{ color: "var(--ink-3)" }} onClick={() => unenroll.mutate(u.id)}><XIcon size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editOpen && <EditCourseModal course={course} onClose={() => setEditOpen(false)} />}
      {addModOpen && <AddModulesModal courseId={courseId} existingIds={(course.modules ?? []).map((m: any) => m.id)} onClose={() => setAddModOpen(false)} />}
      {enrollOpen && <EnrollLearnersModal courseId={courseId} existingIds={(course.users ?? []).map((u: any) => u.id)} onClose={() => setEnrollOpen(false)} />}
    </div>
  );
}


// ──────────────────────────────────────────────
// Modals
// ──────────────────────────────────────────────

function CreateCourseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "" });
  const create = useMutation({
    mutationFn: () => api.admin.courses.create({ title: form.title.trim(), description: form.description.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-courses"] }); onClose(); },
  });

  return (
    <Modal title="New course" onClose={onClose}>
      <label style={labelStyle}>Course name</label>
      <input className="input" style={inputStyle} value={form.title} autoFocus
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder="e.g. Vocabulary Set 1–6" />
      <label style={labelStyle}>Description (optional)</label>
      <textarea className="input" style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="Short description…" />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!form.title.trim() || create.isPending}
          onClick={() => create.mutate()}>
          {create.isPending ? "Creating…" : "Create"}
        </button>
      </div>
      {create.isError && <p style={{ color: "oklch(0.5 0.1 25)", fontSize: 12, marginTop: 6 }}>{String((create.error as any)?.message ?? "Error")}</p>}
    </Modal>
  );
}

function EditCourseModal({ course, onClose }: { course: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: course.title, description: course.description ?? "" });
  const update = useMutation({
    mutationFn: () => api.admin.courses.update(course.id, { title: form.title.trim(), description: form.description.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["admin-course", course.id] });
      onClose();
    },
  });

  return (
    <Modal title="Edit course" onClose={onClose}>
      <label style={labelStyle}>Course name</label>
      <input className="input" style={inputStyle} value={form.title} autoFocus
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
      <label style={labelStyle}>Description</label>
      <textarea className="input" style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!form.title.trim() || update.isPending}
          onClick={() => update.mutate()}>
          {update.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

function AddModulesModal({ courseId, existingIds, onClose }: { courseId: string; existingIds: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: modules = [] } = useQuery({ queryKey: ["admin-modules"], queryFn: () => api.admin.modules.list({ status: "published" }) });

  const available = (modules as any[]).filter((m: any) => !existingIds.includes(m.id));

  const add = useMutation({
    mutationFn: () => api.admin.courses.addModules(courseId, Array.from(selected)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-course", courseId] });
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      onClose();
    },
  });

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <Modal title="Add modules to course" onClose={onClose} wide>
      {available.length === 0 ? (
        <p style={{ color: "var(--ink-3)", fontSize: 13 }}>All published modules are already in this course.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
          {available.map((m: any) => (
            <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: "var(--r-sm)", background: selected.has(m.id) ? "var(--accent-soft)" : "var(--bg-2)", border: `1px solid ${selected.has(m.id) ? "var(--accent)" : "var(--line-2)"}`, cursor: "pointer" }}>
              <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} style={{ accentColor: "var(--accent)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</span>
                <span className="mono" style={{ marginLeft: 8, fontSize: 10, color: "var(--ink-3)" }}>{m.cefr_level}</span>
              </div>
              {selected.has(m.id) && <CheckIcon size={12} />}
            </label>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={selected.size === 0 || add.isPending} onClick={() => add.mutate()}>
          {add.isPending ? "Adding…" : `Add ${selected.size > 0 ? selected.size : ""} module${selected.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </Modal>
  );
}

function EnrollLearnersModal({ courseId, existingIds, onClose }: { courseId: string; existingIds: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const { data: learners = [] } = useQuery({ queryKey: ["admin-learners"], queryFn: () => api.admin.users.listLearners() });

  const available = (learners as any[]).filter((u: any) => !existingIds.includes(u.id));
  const filtered = available.filter((u: any) =>
    !search || u.display_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const enroll = useMutation({
    mutationFn: () => api.admin.courses.enrollUsers(courseId, Array.from(selected)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-course", courseId] });
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      onClose();
    },
  });

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <Modal title="Enroll learners" onClose={onClose} wide>
      <input className="input" style={{ ...inputStyle, marginBottom: 10 }} placeholder="Search learners…" value={search}
        onChange={(e) => setSearch(e.target.value)} autoFocus />
      {available.length === 0 ? (
        <p style={{ color: "var(--ink-3)", fontSize: 13 }}>All learners are already enrolled.</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--ink-3)", fontSize: 13 }}>No learners match.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
          {filtered.map((u: any) => (
            <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: "var(--r-sm)", background: selected.has(u.id) ? "var(--accent-soft)" : "var(--bg-2)", border: `1px solid ${selected.has(u.id) ? "var(--accent)" : "var(--line-2)"}`, cursor: "pointer" }}>
              <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} style={{ accentColor: "var(--accent)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{u.display_name}</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)" }}>{u.email}</span>
              </div>
              {selected.has(u.id) && <CheckIcon size={12} />}
            </label>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={selected.size === 0 || enroll.isPending} onClick={() => enroll.mutate()}>
          {enroll.isPending ? "Enrolling…" : `Enroll ${selected.size > 0 ? selected.size : ""} learner${selected.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </Modal>
  );
}


// ──────────────────────────────────────────────
// Shared modal wrapper
// ──────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 400, display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-xl)", padding: "28px 24px", width: "100%", maxWidth: wide ? 540 : 420, boxShadow: "var(--shadow-md)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="serif" style={{ margin: 0, fontSize: 20 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose}><XIcon size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--ink-2)", display: "block", marginBottom: 5 };
const inputStyle: React.CSSProperties = { width: "100%", marginBottom: 14, boxSizing: "border-box" };
