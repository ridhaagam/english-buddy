import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

const ACTION_COLOR: Record<string, string> = {
  publish_module: "158",
  flag_recording: "25",
  unflag_recording: "75",
  change_user_role: "220",
  invite_user: "300",
};

const ACTION_LABEL: Record<string, string> = {
  publish_module: "Published module",
  flag_recording: "Flagged recording",
  unflag_recording: "Unflagged recording",
  change_user_role: "Changed user role",
  invite_user: "Invited user",
};

export function AdminAuditLog() {
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-log", offset],
    queryFn: () => api.admin.auditLog.list({ limit: LIMIT, offset }),
  });

  const entries = data?.entries ?? [];

  return (
    <div className="container adm-page">
      <header style={{ marginBottom: 24 }}>
        <p className="eyebrow">Admin · Owner only</p>
        <h1 className="serif" style={{ fontSize: 36, margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Audit log</h1>
        <p style={{ color: "var(--ink-2)", margin: 0 }}>A record of all admin actions taken on the platform.</p>
      </header>

      {isLoading && <div style={{ color: "var(--ink-3)" }}>Loading…</div>}

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["Time", "Actor", "Action", "Target", "Details"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e: any) => {
              const hue = ACTION_COLOR[e.action] ?? "158";
              return (
                <tr key={e.id} style={{ borderBottom: "1px solid var(--line-2)" }}>
                  <td data-label="Time" style={{ ...tdStyle, color: "var(--ink-3)", fontSize: 12, whiteSpace: "nowrap" }}>
                    {new Date(e.at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td data-label="Actor" style={tdStyle}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{e.actor_name}</span>
                    {e.actor_email && <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{e.actor_email}</div>}
                  </td>
                  <td data-label="Action" style={tdStyle}>
                    <span className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: `oklch(0.95 0.04 ${hue})`, color: `oklch(0.4 0.1 ${hue})`, border: `1px solid oklch(0.85 0.06 ${hue})` }}>
                      {ACTION_LABEL[e.action] ?? e.action}
                    </span>
                  </td>
                  <td data-label="Target" style={{ ...tdStyle, fontSize: 12, color: "var(--ink-2)" }}>
                    {e.target_kind && <span className="mono" style={{ fontSize: 10, marginRight: 4, color: "var(--ink-3)" }}>{e.target_kind}</span>}
                    {e.target_id ? e.target_id.slice(0, 8) + "…" : "—"}
                  </td>
                  <td data-label="Details" style={{ ...tdStyle, fontSize: 12, color: "var(--ink-3)", maxWidth: 260 }}>
                    {e.payload ? (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, wordBreak: "break-word" }}>
                        {Object.entries(e.payload).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "var(--ink-3)" }}>
                  No audit log entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(entries.length === LIMIT || offset > 0) && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
          <button className="btn ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
            Previous
          </button>
          <button className="btn ghost" disabled={entries.length < LIMIT} onClick={() => setOffset(offset + LIMIT)}>
            Next
          </button>
        </div>
      )}

      <style>{`.adm-page { padding-top: 28px; }`}</style>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600, background: "var(--bg-2)" };
const tdStyle: React.CSSProperties = { padding: "12px 16px", verticalAlign: "middle", fontSize: 13 };
