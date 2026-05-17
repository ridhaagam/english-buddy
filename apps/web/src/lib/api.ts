const BASE = "/api/v1";

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Try refresh
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) {
      try {
        const r = await fetch(`${BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (r.ok) {
          const data = await r.json();
          localStorage.setItem("access_token", data.access);
          localStorage.setItem("refresh_token", data.refresh);
          headers["Authorization"] = `Bearer ${data.access}`;
          const retry = await fetch(`${BASE}${path}`, { ...options, headers });
          if (!retry.ok) throw new Error(await retry.text());
          if (retry.status === 204) return undefined as T;
          return retry.json();
        }
      } catch {}
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/";
    throw new Error("Unauthorized");
  }

  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try { msg = JSON.parse(text).detail || text; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  auth: {
    // Use raw fetch for login/signup — the request() helper intercepts 401s for
    // session expiry and calls window.location.href="/", which would swallow the
    // "Invalid credentials" error message before the catch block runs.
    login: async (email: string, password: string) => {
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try { msg = JSON.parse(text).detail || text; } catch {}
        throw new Error(msg);
      }
      return res.json() as Promise<{ access: string; refresh: string }>;
    },
    signup: async (email: string, display_name: string, password: string) => {
      const res = await fetch(`${BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, display_name, password }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try { msg = JSON.parse(text).detail || text; } catch {}
        throw new Error(msg);
      }
      return res.json() as Promise<{ access: string; refresh: string }>;
    },
    logout: () => request("/auth/logout", { method: "POST" }),
  },

  me: {
    get: () => request<{ id: string; email: string; display_name: string; role: string; streak: number; xp_total: number; daily_goal_xp: number; cefr_level: string | null }>("/me"),
    stats: () => request<any>("/me/stats"),
    patch: (data: Partial<{ display_name: string; daily_goal_xp: number; cefr_level: string }>) =>
      request("/me", { method: "PATCH", body: JSON.stringify(data) }),
  },

  library: {
    list: (params?: { topic?: string; level?: string }) => {
      const q = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
      return request<any[]>(`/library${q}`);
    },
  },

  modules: {
    list: (params?: { topic?: string; level?: string; search?: string }) => {
      const q = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
      return request<any[]>(`/modules${q}`);
    },
    get: (id: string) => request<any>(`/modules/${id}`),
  },

  sessions: {
    create: (module_id: string) =>
      request<{ id: string; module_id: string }>("/sessions", {
        method: "POST",
        body: JSON.stringify({ module_id }),
      }),
    answer: (session_id: string, data: { question_id: string; selection: Record<string, string>; time_spent_ms?: number }) =>
      request<{ is_correct: boolean }>(`/sessions/${session_id}/answer`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    finish: (session_id: string, timezone?: string) =>
      request<{ score_pct: number; correct_count: number; total: number; xp_earned: number }>(
        `/sessions/${session_id}/finish`,
        { method: "POST", body: JSON.stringify({ timezone }) }
      ),
    myList: () => request<any[]>("/sessions/me"),
    get: (id: string) => request<any>(`/sessions/me/${id}`),
    playUrl: (id: string) => request<{ url: string }>(`/sessions/me/${id}/play-url`),
  },

  admin: {
    dashboard: () => request<any>("/admin/dashboard"),
    modules: {
      list: (params?: { status?: string; topic?: string }) => {
        const q = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
        return request<any[]>(`/admin/modules${q}`);
      },
      get: (id: string) => request<any>(`/admin/modules/${id}`),
      create: (data: any) => request<any>("/admin/modules", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) => request<any>(`/admin/modules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (id: string) => request<void>(`/admin/modules/${id}`, { method: "DELETE" }),
      publish: (id: string) => request<any>(`/admin/modules/${id}/publish`, { method: "POST" }),
    },
    recordings: {
      list: (params?: Record<string, string | boolean>) => {
        const q = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
        return request<any[]>(`/admin/recordings${q}`);
      },
      get: (id: string) => request<any>(`/admin/recordings/${id}`),
      playUrl: (id: string) => request<{ url: string }>(`/admin/recordings/${id}/play-url`),
      flag: (id: string, reason?: string) =>
        request<any>(`/admin/recordings/${id}/flag`, { method: "POST", body: JSON.stringify({ reason }) }),
      unflag: (id: string) => request<any>(`/admin/recordings/${id}/flag`, { method: "DELETE" }),
    },
    reports: {
      kpi: () => request<any>("/admin/reports/kpi"),
      daily: (range = "30d") => request<any[]>(`/admin/reports/daily?range=${range}`),
      topicMix: () => request<any[]>("/admin/reports/topic-mix"),
      accuracyDist: () => request<any[]>("/admin/reports/accuracy-distribution"),
      funnel: () => request<any>("/admin/reports/funnel"),
    },
    import: {
      document: (file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        const token = localStorage.getItem("access_token");
        return fetch(`${BASE}/admin/import/document`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        }).then(async (r) => {
          if (!r.ok) { const t = await r.text(); throw new Error(t); }
          return r.json();
        });
      },
      finalizeDocument: (data: { title: string; cefr_level: string; questions: any[] }) =>
        request<{ module_id: string }>("/admin/import/document/finalize", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      audio: (file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        const token = localStorage.getItem("access_token");
        return fetch(`${BASE}/admin/import/audio`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        }).then(async (r) => {
          if (!r.ok) { const t = await r.text(); throw new Error(t); }
          return r.json();
        });
      },
      finalizeAudio: (data: { title: string; cefr_level: string; questions: any[]; transcript?: string }) =>
        request<{ module_id: string }>("/admin/import/audio/finalize", {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    users: {
      list: () => request<any[]>("/admin/users"),
      invite: (data: { email: string; display_name: string; role: string; password?: string }) =>
        request<any>("/admin/users", { method: "POST", body: JSON.stringify(data) }),
      changeRole: (id: string, role: string) =>
        request<any>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) }),
      delete: (id: string) => request<void>(`/admin/users/${id}`, { method: "DELETE" }),
    },
    auditLog: {
      list: (params?: { limit?: number; offset?: number }) => {
        const q = params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString() : "";
        return request<{ entries: any[] }>(`/admin/audit-log${q}`);
      },
    },
  },
};
