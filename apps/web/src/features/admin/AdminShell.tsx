import { useState } from "react";
import { Logo, ShieldIcon, BarChartIcon, BookOpenIcon, MicIcon, VideoIcon, UsersIcon, HomeIcon, ArrowRightIcon, ImportIcon, FlagIcon, LayersIcon } from "../../components/ui";
import "./AdminShell.css";

type AdminRoute = "dashboard" | "modules" | "courses" | "import-doc" | "import-audio" | "results" | "reports" | "users" | "audit-log" | "face-test";

type Props = {
  user: any;
  children: (route: AdminRoute, navigate: (r: AdminRoute) => void) => React.ReactNode;
  onExitAdmin: () => void;
  isOwner?: boolean;
};

const NAV_ITEMS: { id: AdminRoute; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
  { id: "dashboard",    label: "Dashboard",  icon: <HomeIcon size={16} /> },
  { id: "modules",      label: "Modules",    icon: <BookOpenIcon size={16} /> },
  { id: "courses",      label: "Courses",    icon: <LayersIcon size={16} /> },
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

    </div>
  );
}
