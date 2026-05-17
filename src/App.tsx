// src/App.tsx — top-level router/state. Loaded last.
const { useState: useState_A } = React;

type Route =
  | "login"
  | "profile"
  | "practice"
  | "library"
  | "test"
  | "results"
  | "admin";

type User = { name: string; email: string; streak: number; isAdmin: boolean } | null;

function App() {
  const [route, setRoute] = useState_A<Route>("login");
  const [user, setUser] = useState_A<User>(null);
  const [result, setResult] = useState_A<any>(null);

  function login(name: string, email: string) {
    // Seed admin list — for dev only. Prod: check against your auth provider.
    const SEED_ADMINS: string[] =
      ((window as any).SEED_ADMIN_EMAILS as string[]) || ["agam@gmail.com"];
    const isAdmin = SEED_ADMINS.includes(email.trim().toLowerCase());
    setUser({ name, email, streak: 14, isAdmin });
    // Land admins straight in the admin console.
    setRoute(isAdmin ? "admin" : "profile");
    (window as any).__ADMIN_NAME = name.split(" ")[0];
  }
  function logout() {
    setUser(null);
    setRoute("login");
  }

  const showLearnerTopbar =
    user && route !== "login" && route !== "test" && route !== "admin";

  return (
    <div className="app">
      {showLearnerTopbar && (
        <Topbar
          route={route}
          onNav={(r) => setRoute(r as Route)}
          user={user!}
          onLogout={logout}
          onOpenAdmin={user!.isAdmin ? () => setRoute("admin") : undefined}
        />
      )}

      {route === "login" && <LoginScreen onLogin={login} />}

      {route === "profile" && user && (
        <ProfileScreen
          user={user}
          onStartTest={() => setRoute("test")}
          onNav={(r) => setRoute(r as Route)}
        />
      )}

      {route === "practice" && user && (
        <PracticeScreen onStartTest={() => setRoute("test")} />
      )}

      {route === "library" && user && (
        <LibraryScreen onStartTest={() => setRoute("test")} />
      )}

      {route === "test" && user && (
        <TestScreen
          onExit={() => setRoute("profile")}
          onDone={(r) => {
            const correct = r.answers.filter((a) => a.correct).length;
            setResult({ ...r, correct });
            setRoute("results");
          }}
        />
      )}

      {route === "results" && user && result && (
        <ResultsScreen
          result={result}
          onAgain={() => setRoute("test")}
          onHome={() => setRoute("profile")}
        />
      )}

      {route === "admin" && user && user.isAdmin && (
        <AdminShell
          user={user}
          onExitAdmin={() => setRoute("profile")}
          onLogout={logout}
        />
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
