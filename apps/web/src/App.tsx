import { useState, useEffect } from "react";
import { Topbar } from "./components/ui";
import { LoginScreen } from "./features/auth/LoginScreen";
import { ProfileScreen } from "./features/profile/ProfileScreen";
import { LibraryScreen } from "./features/library/LibraryScreen";
import { PracticeScreen } from "./features/practice/PracticeScreen";
import { TestScreen } from "./features/test/TestScreen";
import { ResultsScreen } from "./features/results/ResultsScreen";
import { AdminShell } from "./features/admin/AdminShell";
import { AdminDashboard } from "./features/admin/dashboard/AdminDashboard";
import { AdminModules } from "./features/admin/modules/AdminModules";
import { AdminImport } from "./features/admin/import-doc/AdminImport";
import { AdminListening } from "./features/admin/import-audio/AdminListening";
import { AdminRecordings } from "./features/admin/recordings/AdminRecordings";
import { AdminReports } from "./features/admin/reports/AdminReports";
import { AdminUsers } from "./features/admin/users/AdminUsers";
import { AdminAuditLog } from "./features/admin/audit-log/AdminAuditLog";
import { api } from "./lib/api";

type AppRoute = "profile" | "library" | "practice" | "test" | "results" | "admin";

export function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<AppRoute>("profile");
  const [testModuleId, setTestModuleId] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<any>(null);
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    api.me.get()
      .then((me) => { setUser(me); setLoading(false); })
      .catch(() => { localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token"); setLoading(false); });
  }, []);

  function handleLogin(me: any) { setUser(me); setRoute("profile"); }

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    setAdminMode(false);
    setRoute("profile");
  }

  function startTest(moduleId?: string) {
    setTestModuleId(moduleId);
    setRoute("test");
  }

  function handleDone(res: any) {
    setResult(res);
    setRoute("results");
  }

  function handleRetry() {
    if (result?.module_id) {
      startTest(result.module_id);
    } else {
      setRoute("library");
    }
  }

  const isAdmin = user?.role === "admin" || user?.role === "owner" || user?.role === "editor";

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <div className="dot-load"><i /><i /><i /></div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  if (route === "test" && testModuleId) {
    return (
      <TestScreen
        moduleId={testModuleId}
        onExit={() => setRoute("library")}
        onDone={handleDone}
      />
    );
  }

  if (route === "results" && result) {
    return (
      <ResultsScreen
        result={result}
        onRetry={handleRetry}
        onHome={() => setRoute("profile")}
      />
    );
  }

  const isOwner = user?.role === "owner";

  if (adminMode && isAdmin) {
    return (
      <AdminShell user={user} onExitAdmin={() => setAdminMode(false)} isOwner={isOwner}>
        {(adminRoute, navigate) => {
          switch (adminRoute) {
            case "dashboard": return <AdminDashboard />;
            case "modules": return <AdminModules />;
            case "import-doc": return <AdminImport />;
            case "import-audio": return <AdminListening />;
            case "recordings": return <AdminRecordings />;
            case "reports": return <AdminReports />;
            case "users": return <AdminUsers />;
            case "audit-log": return isOwner ? <AdminAuditLog /> : <AdminDashboard />;
            default: return <AdminDashboard />;
          }
        }}
      </AdminShell>
    );
  }

  return (
    <div className="app-wrap">
      <Topbar
        route={route}
        onNav={(r) => setRoute(r as AppRoute)}
        user={user}
        onLogout={handleLogout}
        onOpenAdmin={isAdmin ? () => setAdminMode(true) : undefined}
      />
      <div className="page-body">
        {route === "profile" && (
          <ProfileScreen
            user={user}
            onStartTest={() => startTest(undefined)}
            onNav={(r) => setRoute(r as AppRoute)}
          />
        )}
        {route === "library" && (
          <LibraryScreen onStartTest={(id) => startTest(id)} />
        )}
        {route === "practice" && (
          <PracticeScreen onStartTest={(id) => startTest(id)} />
        )}
      </div>
      <style>{`
        .app-wrap { min-height:100vh; display:flex; flex-direction:column; background:var(--bg); }
        .page-body { flex:1; }
      `}</style>
    </div>
  );
}
