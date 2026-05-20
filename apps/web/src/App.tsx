import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { AdminResults } from "./features/admin/recordings/AdminRecordings";
import { AdminReports } from "./features/admin/reports/AdminReports";
import { AdminUsers } from "./features/admin/users/AdminUsers";
import { AdminAuditLog } from "./features/admin/audit-log/AdminAuditLog";
import { AdminFaceTest } from "./features/admin/face-test/AdminFaceTest";
import { AdminCourses } from "./features/admin/courses/AdminCourses";
import { ProfileEditPage } from "./features/profile/ProfileEditPage";
import { SessionDetailPage } from "./features/practice/SessionDetailPage";
import { api } from "./lib/api";
import "./App.css";

type AppRoute = "profile" | "library" | "practice" | "test" | "results" | "admin" | "profile-edit" | "session-detail";

export function App() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<AppRoute>("profile");
  const [testModuleId, setTestModuleId] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<any>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);
  const [testResumeData, setTestResumeData] = useState<{ answeredQuestionIds: string[]; previousSessionId: string } | undefined>(undefined);
  const [resumeDialog, setResumeDialog] = useState<{
    moduleId: string;
    answeredCount: number;
    totalCount: number;
    answeredQuestionIds: string[];
    previousSessionId: string;
  } | null>(null);

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

  function launchTest(moduleId: string, resumeData?: { answeredQuestionIds: string[]; previousSessionId: string }) {
    setTestResumeData(resumeData);
    setTestModuleId(moduleId);
    setResumeDialog(null);
    setRoute("test");
  }

  async function startTest(moduleId?: string) {
    if (!moduleId) {
      setRoute("library");
      return;
    }
    try {
      const res = await api.sessions.resumable(moduleId);
      if (res.resumable) {
        setResumeDialog({
          moduleId,
          answeredCount: res.answered_count!,
          totalCount: res.total_count!,
          answeredQuestionIds: res.answered_question_ids!,
          previousSessionId: res.session_id!,
        });
        return;
      }
    } catch {}
    launchTest(moduleId);
  }

  function handleDone(res: any) {
    setResult(res);
    setRoute("results");
    queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
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
        resumeData={testResumeData}
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
            case "courses": return <AdminCourses />;
            case "import-doc": return <AdminImport />;
            case "import-audio": return <AdminListening />;
            case "results": return <AdminResults />;
            case "reports": return <AdminReports />;
            case "users": return <AdminUsers />;
            case "audit-log": return isOwner ? <AdminAuditLog /> : <AdminDashboard />;
            case "face-test": return isOwner ? <AdminFaceTest /> : <AdminDashboard />;
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
          <PracticeScreen
            onStartTest={(id) => startTest(id)}
            onViewSession={(id) => { setSelectedSessionId(id); setRoute("session-detail"); }}
          />
        )}
        {route === "session-detail" && selectedSessionId && (
          <SessionDetailPage
            sessionId={selectedSessionId}
            onBack={() => setRoute("practice")}
            onPracticeAgain={(moduleId) => startTest(moduleId)}
          />
        )}
        {route === "profile-edit" && (
          <ProfileEditPage
            user={user}
            onBack={() => setRoute("profile")}
            onUserUpdate={(u) => setUser(u)}
          />
        )}
      </div>
      {resumeDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-xl)", padding: "32px 28px", maxWidth: 420, width: "100%", boxShadow: "var(--shadow-md)" }}>
            <p className="serif" style={{ margin: "0 0 8px", fontSize: 22, letterSpacing: "-0.015em" }}>Continue where you left off?</p>
            <p style={{ margin: "0 0 24px", color: "var(--ink-2)", fontSize: 14, lineHeight: 1.6 }}>
              You already answered <strong>{resumeDialog.answeredCount}</strong> of <strong>{resumeDialog.totalCount}</strong> questions last time. Resume to skip those and finish the remaining {resumeDialog.totalCount - resumeDialog.answeredCount}.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => launchTest(resumeDialog.moduleId)}>Start fresh</button>
              <button className="btn accent" onClick={() => launchTest(resumeDialog.moduleId, { answeredQuestionIds: resumeDialog.answeredQuestionIds, previousSessionId: resumeDialog.previousSessionId })}>
                Resume ({resumeDialog.answeredCount}/{resumeDialog.totalCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
