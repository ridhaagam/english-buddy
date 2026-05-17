import { useState } from "react";
import { Logo, ShieldIcon, BarChartIcon, BookOpenIcon, MicIcon, VideoIcon, UsersIcon, HomeIcon, ArrowRightIcon, ImportIcon, FlagIcon } from "../../components/ui";

type AdminRoute = "dashboard" | "modules" | "import-doc" | "import-audio" | "results" | "reports" | "users" | "audit-log" | "face-test";

type Props = {
  user: any;
  children: (route: AdminRoute, navigate: (r: AdminRoute) => void) => React.ReactNode;
  onExitAdmin: () => void;
  isOwner?: boolean;
};

const NAV_ITEMS: { id: AdminRoute; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
  { id: "dashboard",    label: "Dashboard",  icon: <HomeIcon size={16} /> },
  { id: "modules",      label: "Modules",    icon: <BookOpenIcon size={16} /> },
  { id: "import-doc",   label: "Import doc", icon: <ImportIcon size={16} /> },
  { id: "import-audio", label: "Listening",  icon: <MicIcon size={16} /> },
  { id: "results",      label: "Results",    icon: <VideoIcon size={16} /> },
  { id: "reports",      label: "Reports",    icon: <BarChartIcon size={16} /> },
  { id: "users",        label: "Users",      icon: <UsersIcon size={16} /> },
  { id: "audit-log",    label: "Audit log",  icon: <FlagIcon size={16} />, ownerOnly: true },
  { id: "face-test",    label: "Face test",  icon: <VideoIcon size={16} />, ownerOnly: true },
];

export function AdminShell({ user, children, onExitAdmin, isOwner }: Props) {
  const [route,      setRoute]      = useState<AdminRoute>("dashboard");
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function navigate(r: AdminRoute) {
    setRoute(r);
    setMobileOpen(false);
  }

  const visibleItems = NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);
  const currentLabel = visibleItems.find((n) => n.id === route)?.label ?? "Admin";

  return (
    <div className="adm-shell">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div className="adm-mob-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`adm-sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mob-open" : ""}`}>
        <div className="adm-sb-top">
          <div className="adm-logo">
            {!collapsed && <Logo />}
            <button className="icon-btn adm-toggle" onClick={() => setCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
              style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}>
              <ArrowRightIcon size={14} />
            </button>
          </div>
          {!collapsed && (
            <div className="adm-badge">
              <ShieldIcon size={12} />
              <span className="mono">Admin panel</span>
            </div>
          )}
        </div>

        <nav className="adm-nav">
          {visibleItems.map((item) => (
            <button key={item.id}
              className={`adm-nav-item${route === item.id ? " active" : ""}`}
              onClick={() => navigate(item.id)}
              title={collapsed ? item.label : undefined}>
              <span className="adm-nav-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="adm-sb-foot">
          <button className="adm-nav-item" onClick={() => { onExitAdmin(); setMobileOpen(false); }}
            title={collapsed ? "Back to app" : undefined}>
            <span className="adm-nav-icon"><HomeIcon size={16} /></span>
            {!collapsed && <span>Back to app</span>}
          </button>
        </div>
      </aside>

      <div className="adm-content">
        {/* Mobile header bar */}
        <div className="adm-mob-head">
          <button className="adm-mob-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{currentLabel}</span>
        </div>

        {children(route, navigate)}
      </div>

      <style>{`
        .adm-shell { display:flex; min-height:100vh; background:var(--bg); }
        .adm-sidebar { width:220px; background:oklch(0.14 0.01 250); display:flex; flex-direction:column; flex-shrink:0; transition:width 0.22s cubic-bezier(0.22,1,0.36,1); overflow:hidden; }
        .adm-sidebar.collapsed { width:56px; }
        .adm-sb-top { padding:18px 14px 10px; border-bottom:1px solid oklch(0.25 0.01 250); flex-shrink:0; }
        .adm-logo { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .adm-badge { display:flex; align-items:center; gap:6px; padding:4px 8px; background:oklch(0.55 0.12 158/0.15); border-radius:6px; color:oklch(0.7 0.12 158); font-size:10px; letter-spacing:0.08em; }
        .adm-toggle { color:oklch(0.6 0.01 250); background:none; border:none; }
        .adm-toggle:hover { color:white; }
        .adm-nav { flex:1; padding:10px 8px; display:flex; flex-direction:column; gap:2px; overflow-y:auto; }
        .adm-nav-item { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:8px; border:none; background:none; color:oklch(0.6 0.02 250); cursor:pointer; font-size:13.5px; font-family:var(--font-ui); transition:background 0.15s,color 0.15s; white-space:nowrap; overflow:hidden; width:100%; text-align:left; }
        .adm-nav-item:hover { background:oklch(0.22 0.01 250); color:oklch(0.9 0.01 250); }
        .adm-nav-item.active { background:oklch(0.55 0.12 158/0.18); color:oklch(0.75 0.12 158); font-weight:600; }
        .adm-nav-icon { width:18px; flex-shrink:0; display:grid; place-items:center; }
        .adm-sb-foot { padding:10px 8px; border-top:1px solid oklch(0.22 0.01 250); flex-shrink:0; }
        .adm-content { flex:1; overflow-y:auto; min-width:0; }
        .adm-mob-head { display:none; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid var(--line); background:var(--bg); position:sticky; top:0; z-index:10; }
        .adm-mob-btn { background:none; border:1px solid var(--line); cursor:pointer; color:var(--ink-2); display:grid; place-items:center; padding:7px; border-radius:8px; transition:background 0.15s; flex-shrink:0; }
        .adm-mob-btn:hover { background:var(--bg-2); color:var(--ink); }
        .adm-mob-overlay { position:fixed; inset:0; background:oklch(0 0 0/0.45); z-index:199; }
        @media(max-width:640px) {
          .adm-sidebar { position:fixed; top:0; left:0; bottom:0; z-index:200; width:240px!important; transform:translateX(-100%); transition:transform 0.28s cubic-bezier(0.22,1,0.36,1),width 0s; }
          .adm-sidebar.mob-open { transform:translateX(0); }
          .adm-mob-head { display:flex; }
          .adm-content { width:100%; }
        }
        @media(min-width:641px) {
          .adm-mob-head { display:none!important; }
          .adm-mob-overlay { display:none!important; }
        }
      `}</style>
    </div>
  );
}
