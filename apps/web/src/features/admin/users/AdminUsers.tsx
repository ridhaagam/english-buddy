import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, TrashIcon, XIcon, ArrowRightIcon } from "../../../components/ui";
import { api } from "../../../lib/api";
import "./AdminUsers.css";

const STAFF_ROLES = ["editor", "admin", "owner"];

export function AdminUsers() {
  const [tab, setTab] = useState<"staff" | "learners">("staff");

  return (
    <div className="container adm-page">
      <header style={{ marginBottom: 20 }}>
        <p className="eyebrow">Admin</p>
        <h1 className="serif" style={{ fontSize: 36, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Users</h1>
        <p style={{ color: "var(--ink-2)", margin: 0 }}>Manage staff and learner accounts.</p>
      </header>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--line)", paddingBottom: 0 }}>
        {(["staff", "learners"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, border: "none", background: "none", cursor: "pointer", borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent", color: tab === t ? "var(--ink)" : "var(--ink-3)", marginBottom: -1, textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "staff" && <StaffTab />}
      {tab === "learners" && <LearnersTab />}
    </div>
  );
}

function StaffTab() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: api.admin.users.list });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", display_name: "", role: "editor", password: "" });
  const roleColors: Record<string, string> = { owner: "300", admin: "158", editor: "75", learner: "220" };

  const invite = useMutation({
    mutationFn: (d: any) => api.admin.users.invite(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setOpen(false); setForm({ email: "", display_name: "", role: "editor", password: "" }); },
  });
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.admin.users.changeRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.admin.users.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn accent" onClick={() => setOpen(true)}>
          <PlusIcon size={14} /> Add staff
        </button>
      </div>

      {isLoading && <div style={{ color: "var(--ink-3)" }}>Loading…</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["Name", "Email", "Role", "Joined", "XP", ""].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(users as any[]).map((u: any) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                <td data-label="Name" style={tdStyle}><span style={{ fontWeight: 600 }}>{u.display_name}</span></td>
                <td data-label="Email" style={{ ...tdStyle, color: "var(--ink-2)" }}>{u.email}</td>
                <td data-label="Role" style={tdStyle}>
                  <select className="mono" value={u.role}
                    onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}
                    style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: `oklch(0.95 0.04 ${roleColors[u.role] || "158"})`, color: `oklch(0.4 0.1 ${roleColors[u.role] || "158"})`, border: `1px solid oklch(0.85 0.06 ${roleColors[u.role] || "158"})`, cursor: "pointer" }}>
                    {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td data-label="Joined" style={{ ...tdStyle, color: "var(--ink-3)", fontSize: 13 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                <td data-label="XP" style={tdStyle}><span className="mono" style={{ fontSize: 12, color: "var(--accent-ink)" }}>{(u.xp_total ?? 0).toLocaleString()}</span></td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button className="icon-btn" onClick={() => { if (confirm(`Delete ${u.display_name}?`)) del.mutate(u.id); }}>
                    <TrashIcon size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !isLoading && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--ink-3)" }}>No staff users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-card fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>Add staff user</h2>
              <button className="icon-btn" onClick={() => setOpen(false)}><XIcon size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field"><label>Full name</label><input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} placeholder="Their name" /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@example.com" /></div>
              <div className="field"><label>Password</label><input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Set a password" /></div>
              <div className="field">
                <label>Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {invite.isError && <p style={{ color: "oklch(0.5 0.1 25)", fontSize: 13, margin: 0 }}>{(invite.error as Error)?.message}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn accent" disabled={invite.isPending} onClick={() => invite.mutate(form)}>
                  {invite.isPending ? "Adding…" : "Add user"} <ArrowRightIcon size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

function LearnersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", display_name: "", password: "" });

  const { data: learners = [], isLoading } = useQuery({
    queryKey: ["admin-learners", search],
    queryFn: () => api.admin.users.listLearners({ search: search || undefined, limit: 100 }),
  });

  const create = useMutation({
    mutationFn: (d: any) => api.admin.users.createLearner(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-learners"] }); setOpen(false); setForm({ email: "", display_name: "", password: "" }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.admin.users.deleteLearner(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-learners"] }),
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg-2)", fontSize: 13 }}
        />
        <button className="btn accent" onClick={() => setOpen(true)}>
          <PlusIcon size={14} /> Add learner
        </button>
      </div>

      {isLoading && <div style={{ color: "var(--ink-3)" }}>Loading…</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["Name", "Email", "Sessions", "Last active", "Avg score", ""].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(learners as any[]).map((u: any) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                <td data-label="Name" style={tdStyle}><span style={{ fontWeight: 600 }}>{u.display_name}</span></td>
                <td data-label="Email" style={{ ...tdStyle, color: "var(--ink-2)" }}>{u.email}</td>
                <td data-label="Sessions" style={tdStyle}><span className="mono" style={{ fontSize: 12 }}>{u.total_sessions ?? 0}</span></td>
                <td data-label="Last active" style={{ ...tdStyle, color: "var(--ink-3)", fontSize: 13 }}>
                  {u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString() : "Never"}
                </td>
                <td data-label="Avg score" style={tdStyle}>
                  {u.avg_score != null
                    ? <span className="serif" style={{ fontSize: 16 }}>{Math.round(u.avg_score)}%</span>
                    : <span style={{ color: "var(--ink-3)" }}>—</span>
                  }
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button className="icon-btn" onClick={() => { if (confirm(`Delete ${u.display_name}?`)) del.mutate(u.id); }}>
                    <TrashIcon size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {learners.length === 0 && !isLoading && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--ink-3)" }}>
                {search ? `No learners matching "${search}".` : "No learners yet."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-card fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>Add learner</h2>
              <button className="icon-btn" onClick={() => setOpen(false)}><XIcon size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field"><label>Full name</label><input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} placeholder="Learner name" /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="learner@example.com" /></div>
              <div className="field"><label>Password</label><input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Set a password" /></div>
              {create.isError && <p style={{ color: "oklch(0.5 0.1 25)", fontSize: 13, margin: 0 }}>{(create.error as Error)?.message}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn accent" disabled={create.isPending} onClick={() => create.mutate(form)}>
                  {create.isPending ? "Adding…" : "Add learner"} <ArrowRightIcon size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600, background: "var(--bg-2)" };
const tdStyle: React.CSSProperties = { padding: "14px 16px", verticalAlign: "middle", fontSize: 14 };
