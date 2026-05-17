// src/admin/Users.tsx — admin & user management
const { useState: useState_Us } = React;

type AdminUser = {
  email: string;
  name: string;
  role: "owner" | "admin" | "editor";
  addedAt: string;
  lastSeen: string;
};

const SEED_ADMINS: AdminUser[] = [
  { email: "agam@gmail.com",        name: "Sherly Agam",  role: "owner", addedAt: "Seeded",     lastSeen: "Today · 09:02" },
  { email: "naufal@englishbuddy.app", name: "Naufal Faza",  role: "admin", addedAt: "May 4, 2026", lastSeen: "Today · 08:14" },
  { email: "daniel@englishbuddy.app", name: "Daniel Tan",   role: "editor", addedAt: "Apr 22, 2026", lastSeen: "Yesterday" },
];

function AdminUsers() {
  const [admins, setAdmins] = useState_Us<AdminUser[]>(SEED_ADMINS);
  const [email, setEmail] = useState_Us("");
  const [name, setName] = useState_Us("");
  const [role, setRole] = useState_Us<"admin" | "editor">("admin");
  const [confirm, setConfirm] = useState_Us<string | null>(null);

  function add() {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) return;
    if (admins.some((a) => a.email === e)) return;
    setAdmins([
      ...admins,
      {
        email: e,
        name: name.trim() || e.split("@")[0],
        role,
        addedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lastSeen: "—",
      },
    ]);
    setEmail(""); setName(""); setRole("admin");
  }

  function remove(targetEmail: string) {
    setAdmins(admins.filter((a) => a.email !== targetEmail));
    setConfirm(null);
  }

  function changeRole(target: string, next: AdminUser["role"]) {
    setAdmins(admins.map((a) => a.email === target ? { ...a, role: next } : a));
  }

  return (
    <div>
      <header className="us-head fade-up">
        <div>
          <p className="eyebrow">Admins & editors</p>
          <h2 className="serif" style={{ margin: "4px 0 4px", fontSize: 26, letterSpacing: "-0.02em" }}>
            Who can manage <span className="serif-it">EnglishBuddy.</span>
          </h2>
          <p style={{ margin: 0, color: "var(--ink-2)", maxWidth: 540 }}>
            Anyone here can sign in with their email to reach this console.
            <span className="mono" style={{ marginLeft: 6, fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--bg-2)", color: "var(--ink-3)" }}>
              dev seed
            </span>
          </p>
        </div>
      </header>

      <section className="card us-form fade-up" style={{ animationDelay: "100ms" }}>
        <h3 className="serif" style={{ margin: "0 0 14px", fontSize: 17 }}>Invite a new admin</h3>
        <div className="us-form-row">
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@team.com"
            />
          </div>
          <div className="field">
            <label>Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="field">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          <button className="btn accent" onClick={add} disabled={!email.includes("@")}>
            <PlusUG /> Add
          </button>
        </div>
        <p style={{ margin: "12px 0 0", color: "var(--ink-3)", fontSize: 12 }}>
          Prototype only: this list lives in memory and resets on reload. In production, wire this
          to your auth provider.
        </p>
      </section>

      <section className="card us-table-wrap fade-up" style={{ animationDelay: "160ms" }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Email</th>
              <th>Role</th>
              <th style={{ textAlign: "right" }}>Added</th>
              <th style={{ textAlign: "right" }}>Last seen</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.email}>
                <td data-label="Person">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={a.name} size={30} />
                    <div>
                      <strong style={{ fontWeight: 600 }}>{a.name}</strong>
                      {a.role === "owner" && (
                        <div className="mono" style={{ fontSize: 10, color: "var(--accent-ink)", marginTop: 2 }}>
                          ★ workspace owner
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td data-label="Email" className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{a.email}</td>
                <td data-label="Role">
                  {a.role === "owner" ? (
                    <RoleBadge role="owner" />
                  ) : (
                    <select
                      className="role-sel"
                      value={a.role}
                      onChange={(e) => changeRole(a.email, e.target.value as any)}
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                    </select>
                  )}
                </td>
                <td data-label="Added" className="mono" style={{ textAlign: "right", color: "var(--ink-3)", fontSize: 12 }}>{a.addedAt}</td>
                <td data-label="Last seen" className="mono" style={{ textAlign: "right", color: "var(--ink-3)", fontSize: 12 }}>{a.lastSeen}</td>
                <td data-label="" style={{ textAlign: "right" }}>
                  {a.role !== "owner" && (
                    confirm === a.email ? (
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <button className="btn ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => setConfirm(null)}>Cancel</button>
                        <button
                          className="btn"
                          style={{ padding: "4px 8px", fontSize: 11, background: "var(--rose)" }}
                          onClick={() => remove(a.email)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        className="row-act"
                        onClick={() => setConfirm(a.email)}
                        title="Remove admin"
                      ><TrashUG /></button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <style>{`
        .us-head { margin-bottom: 18px; }
        .us-form { padding: 18px 20px; margin-bottom: 14px; }
        .us-form-row {
          display: grid;
          grid-template-columns: 1.5fr 1.2fr 1fr auto;
          gap: 10px;
          align-items: end;
        }
        .us-table-wrap { padding: 4px 8px; overflow-x: auto; }
        .role-sel {
          font: inherit;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid var(--line);
          background: var(--surface);
          color: var(--ink);
          font-size: 12px;
        }
        @media (max-width: 720px) {
          .us-form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  const palette: Record<AdminUser["role"], { bg: string; ink: string; label: string }> = {
    owner:  { bg: "var(--accent-soft)", ink: "var(--accent-ink)", label: "owner" },
    admin:  { bg: "oklch(0.94 0.05 75)", ink: "oklch(0.4 0.1 75)", label: "admin" },
    editor: { bg: "var(--bg-2)",          ink: "var(--ink-2)",       label: "editor" },
  };
  const p = palette[role];
  return (
    <span
      className="mono"
      style={{
        fontSize: 10, padding: "3px 8px", borderRadius: 999,
        background: p.bg, color: p.ink,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}
    >
      {p.label}
    </span>
  );
}

function GU({ children, size = 14 }: any) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
function PlusUG() { return <GU><path d="M12 5v14M5 12h14"/></GU>; }
function TrashUG() { return <GU><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></GU>; }

// Seed list also exposed so App can use it for role check
(window as any).AdminUsers = AdminUsers;
(window as any).SEED_ADMIN_EMAILS = SEED_ADMINS.map((a) => a.email);
