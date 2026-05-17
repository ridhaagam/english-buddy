// src/admin/Admin.tsx — admin shell with sidebar and sub-routing
const { useState: useState_Ad, useEffect: useEffect_Ad } = React;

type AdminPage = "dashboard" | "modules" | "import" | "listening" | "reports" | "recordings" | "users";

type AdminProps = {
  user: { name: string; email: string };
  onExitAdmin: () => void;
  onLogout: () => void;
};

function AdminShell({ user, onExitAdmin, onLogout }: AdminProps) {
  const [page, setPage] = useState_Ad<AdminPage>("dashboard");
  const [mobileNav, setMobileNav] = useState_Ad(false);

  const nav: { id: AdminPage; label: string; icon: any; sub?: string }[] = [
    { id: "dashboard",  label: "Overview",          icon: GridIcon,       sub: "Live KPIs" },
    { id: "modules",    label: "Modules",           icon: BookIcon,       sub: "Create & edit" },
    { id: "import",     label: "Import documents",  icon: FileImportIcon, sub: "PDF / Word" },
    { id: "listening",  label: "Listening import",  icon: MicIcon,        sub: "Audio + Qwen-1B" },
    { id: "reports",    label: "Reports",           icon: ChartIcon,      sub: "Analytics" },
    { id: "recordings", label: "Recordings",        icon: PlayBoxIcon,    sub: "User sessions" },
    { id: "users",      label: "Admins",            icon: UsersIcon,      sub: "Manage access" },
  ];

  // close mobile nav when page changes
  useEffect_Ad(() => setMobileNav(false), [page]);

  return (
    <div className="admin-shell" data-mobilenav={mobileNav || undefined}>
      <aside className="admin-side">
        <div className="admin-brand">
          <img
            src="assets/logo.png"
            alt=""
            width="30"
            height="30"
            style={{ objectFit: "contain", display: "block" }}
          />
          <div>
            <strong
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 18,
                letterSpacing: "-0.01em",
              }}
            >
              EnglishBuddy
            </strong>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                color: "var(--accent-ink)",
                marginTop: 2,
              }}
            >
              ADMIN CONSOLE
            </div>
          </div>
        </div>

        <nav className="admin-nav">
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                className="admin-nav-item"
                aria-current={page === n.id}
                onClick={() => setPage(n.id)}
              >
                <span className="adm-icon">
                  <Icon />
                </span>
                <span className="adm-label">
                  <span>{n.label}</span>
                  {n.sub && <span className="adm-sub mono">{n.sub}</span>}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="admin-user">
          <Avatar name={user.name} size={32} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.name}
            </div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.email}
            </div>
          </div>
          <button className="icon-btn" aria-label="Sign out" onClick={onLogout} title="Sign out">
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button
            className="icon-btn mobile-only"
            aria-label="Open navigation"
            onClick={() => setMobileNav((v) => !v)}
          >
            <MenuIcon />
          </button>
          <h1 className="serif" style={{ margin: 0, fontSize: 20, letterSpacing: "-0.01em" }}>
            {nav.find((n) => n.id === page)?.label}
          </h1>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onExitAdmin} style={{ fontSize: 13, padding: "8px 12px" }}>
            ← Back to learner app
          </button>
        </header>

        <div className="admin-content">
          {page === "dashboard" && (
            <AdminDashboard onGo={(p) => setPage(p as AdminPage)} />
          )}
          {page === "modules" && <AdminModules />}
          {page === "import" && <AdminImport />}
          {page === "listening" && <AdminListening />}
          {page === "reports" && <AdminReports />}
          {page === "recordings" && <AdminRecordings />}
          {page === "users" && <AdminUsers />}
        </div>
      </main>

      {mobileNav && <div className="admin-scrim" onClick={() => setMobileNav(false)} />}

      <style>{`
        .admin-shell {
          min-height: 100vh;
          background: var(--bg);
          display: grid;
          grid-template-columns: 260px 1fr;
        }
        .admin-side {
          background: oklch(0.16 0.01 85);
          color: oklch(0.92 0.005 85);
          padding: 22px 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .admin-brand {
          display: flex; align-items: center; gap: 10px;
          padding: 0 6px 4px;
        }
        .admin-nav {
          flex: 1;
          display: flex; flex-direction: column; gap: 2px;
          overflow-y: auto;
        }
        .admin-nav-item {
          background: none;
          border: 0;
          width: 100%;
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          color: oklch(0.78 0.01 85);
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          font-family: inherit;
          transition: background 0.15s, color 0.15s;
        }
        .admin-nav-item:hover {
          background: oklch(0.22 0.01 85);
          color: white;
        }
        .admin-nav-item[aria-current="true"] {
          background: oklch(0.55 0.12 158);
          color: white;
        }
        .admin-nav-item[aria-current="true"] .adm-sub { color: oklch(0.95 0.04 158); }
        .adm-icon {
          width: 30px; height: 30px;
          flex-shrink: 0;
          border-radius: 8px;
          background: oklch(1 0 0 / 0.06);
          display: grid; place-items: center;
          color: inherit;
        }
        .admin-nav-item[aria-current="true"] .adm-icon { background: oklch(0 0 0 / 0.18); }
        .adm-label { display: flex; flex-direction: column; gap: 0; min-width: 0; }
        .adm-sub {
          font-size: 9px;
          letter-spacing: 0.12em;
          color: oklch(0.6 0.01 85);
          text-transform: uppercase;
        }
        .admin-user {
          display: flex; align-items: center; gap: 10px;
          padding: 12px;
          background: oklch(0.22 0.01 85);
          border-radius: 12px;
          color: oklch(0.92 0.005 85);
        }
        .admin-user .icon-btn {
          background: oklch(1 0 0 / 0.06);
          border-color: transparent;
          color: oklch(0.88 0.005 85);
          width: 30px; height: 30px;
        }
        .admin-user .icon-btn:hover { background: oklch(1 0 0 / 0.14); color: white; }
        .admin-user .mono { color: oklch(0.65 0.01 85) !important; }

        .admin-main {
          min-width: 0;
          display: flex; flex-direction: column;
        }
        .admin-topbar {
          position: sticky; top: 0; z-index: 10;
          height: 56px;
          padding: 0 22px;
          background: color-mix(in oklch, var(--bg) 92%, transparent);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
          display: flex; align-items: center; gap: 14px;
        }
        .admin-content {
          padding: 26px 28px 60px;
          max-width: 1300px;
          width: 100%;
          margin: 0 auto;
        }

        .mobile-only { display: none; }
        .admin-scrim { display: none; }

        @media (max-width: 900px) {
          .admin-shell { grid-template-columns: 1fr; }
          .admin-side {
            position: fixed;
            top: 0; left: 0; bottom: 0;
            width: 280px;
            z-index: 40;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }
          .admin-shell[data-mobilenav] .admin-side { transform: translateX(0); }
          .admin-scrim {
            display: block;
            position: fixed; inset: 0; z-index: 30;
            background: oklch(0 0 0 / 0.4);
          }
          .mobile-only { display: inline-grid; }
          .admin-content { padding: 18px; }
        }
      `}</style>
    </div>
  );
}

// ---- Icons used in sidebar -------------------------------------------------
function AdmIconBase({ children }: { children: any }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
function GridIcon()  { return <AdmIconBase><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></AdmIconBase>; }
function BookIcon()  { return <AdmIconBase><path d="M4 4h11a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" /><path d="M4 16a4 4 0 0 1 4-4h11" /></AdmIconBase>; }
function FileImportIcon() { return <AdmIconBase><path d="M14 3v6h6" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M9 14l3 3 3-3M12 17V9" /></AdmIconBase>; }
function MicIcon()   { return <AdmIconBase><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></AdmIconBase>; }
function ChartIcon() { return <AdmIconBase><path d="M4 19V5" /><path d="M9 19v-7M14 19v-4M19 19V9" /><path d="M3 19h18" /></AdmIconBase>; }
function PlayBoxIcon() { return <AdmIconBase><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 9.5v5l4-2.5z" fill="currentColor" stroke="none" /></AdmIconBase>; }
function UsersIcon()   { return <AdmIconBase><path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0z"/><path d="M3 20a7 7 0 0 1 18 0"/></AdmIconBase>; }
function LogoutIcon() { return <AdmIconBase><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M15 12H5" /></AdmIconBase>; }
function MenuIcon()  { return <AdmIconBase><path d="M4 7h16M4 12h16M4 17h16" /></AdmIconBase>; }

(window as any).AdminShell = AdminShell;
