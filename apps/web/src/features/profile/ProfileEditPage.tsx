import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar, AchGlyph, CheckIcon, ArrowLeftIcon, CameraIcon, XIcon, ArrowRightIcon,
} from "../../components/ui";
import { api } from "../../lib/api";

type Props = {
  user: any;
  onBack: () => void;
  onUserUpdate: (u: any) => void;
};

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const GOAL_OPTIONS = [50, 100, 150, 200, 300, 500];

const BADGES: { slug: string; label: string; color: string }[] = [
  { slug: "learner",  label: "Learner",       color: "220" },
  { slug: "streak7",  label: "Week Warrior",  color: "40"  },
  { slug: "perfect",  label: "Perfectionist", color: "158" },
  { slug: "centurion",label: "Centurion",     color: "85"  },
  { slug: "explorer", label: "Explorer",      color: "300" },
];

function getBadges(stats: any) {
  const earned: string[] = [];
  const xp = stats?.xp_total ?? 0;
  const streak = stats?.streak ?? 0;
  const achs = stats?.achievements ?? [];
  earned.push("learner");
  if (streak >= 7) earned.push("streak7");
  if (achs.some((a: any) => a.id === "perfect_set" && a.earned)) earned.push("perfect");
  if (xp >= 100) earned.push("centurion");
  if (achs.some((a: any) => a.id === "explorer" && a.earned)) earned.push("explorer");
  return BADGES.filter((b) => earned.includes(b.slug));
}

export function ProfileEditPage({ user, onBack, onUserUpdate }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pwOpen, setPwOpen] = useState(false);

  const { data: stats } = useQuery({ queryKey: ["me-stats"], queryFn: api.me.stats });
  const achievements = stats?.achievements ?? [];
  const earned = achievements.filter((a: any) => a.earned);
  const myBadges = getBadges(stats);

  const [form, setForm] = useState({
    display_name: user.display_name ?? "",
    birthdate: user.birthdate ?? "",
    native_language: user.native_language ?? "",
    bio: user.bio ?? "",
    cefr_level: user.cefr_level ?? "A2",
    daily_goal_xp: user.daily_goal_xp ?? 200,
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (avatarFile) await api.me.uploadAvatar(avatarFile);
      const updated = await api.me.patch(form as any);
      onUserUpdate({ ...user, ...form, ...(avatarFile ? { avatar_url: "/api/v1/me/avatar" } : {}) });
      qc.invalidateQueries({ queryKey: ["me-stats"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  const bioLen = form.bio.length;

  return (
    <div className="pe-page container">
      <div className="pe-toprow">
        <button className="btn ghost" style={{ gap: 6 }} onClick={onBack}>
          <ArrowLeftIcon size={14} /> Back
        </button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && <span style={{ color: "var(--accent-ink)", fontWeight: 600, fontSize: 13 }}>Saved ✓</span>}
          {saveError && <span style={{ color: "oklch(0.5 0.1 25)", fontSize: 13 }}>{saveError}</span>}
          <button className="btn accent" disabled={isSaving} onClick={handleSave} style={{ gap: 6 }}>
            {isSaving ? "Saving…" : "Save changes"} {!isSaving && <ArrowRightIcon size={14} />}
          </button>
        </div>
      </div>

      <div className="pe-body">
        {/* ── Left column: avatar + badges + achievements ── */}
        <aside className="pe-aside">
          {/* Avatar */}
          <div className="pe-avatar-wrap">
            <div className="pe-avatar-ring" onClick={() => fileRef.current?.click()}>
              <Avatar name={form.display_name || user.display_name} size={96} avatarUrl={avatarPreview ?? user.avatar_url} />
              <div className="pe-avatar-overlay"><CameraIcon size={20} /></div>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleAvatarChange} />
            <div style={{ textAlign: "center" }}>
              <p className="serif" style={{ margin: "8px 0 2px", fontSize: 20, fontWeight: 600 }}>{form.display_name || user.display_name}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--ink-3)", textTransform: "capitalize" }}>{user.role} · {form.cefr_level}</p>
            </div>
          </div>

          {/* Earned badges */}
          {myBadges.length > 0 && (
            <div className="pe-section">
              <p className="eyebrow" style={{ margin: "0 0 10px" }}>Badges</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {myBadges.map((b) => (
                  <span key={b.slug} className="mono" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, background: `oklch(0.95 0.04 ${b.color})`, color: `oklch(0.4 0.1 ${b.color})`, border: `1px solid oklch(0.85 0.06 ${b.color})`, fontWeight: 600 }}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats strip */}
          <div className="pe-section">
            <p className="eyebrow" style={{ margin: "0 0 10px" }}>Stats</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Total XP", value: (stats?.xp_total ?? user.xp_total ?? 0).toLocaleString() },
                { label: "Streak", value: `${stats?.streak ?? user.streak ?? 0} days` },
                { label: "Accuracy", value: `${Math.round(stats?.avg_accuracy ?? 0)}%` },
                { label: "Achievements", value: `${earned.length}/${achievements.length}` },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--ink-3)" }}>{s.label}</span>
                  <strong className="mono">{s.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Change password */}
          <div className="pe-section">
            <button className="btn ghost" style={{ width: "100%" }} onClick={() => setPwOpen(true)}>
              Change password
            </button>
          </div>
        </aside>

        {/* ── Right column: form + full achievement shelf ── */}
        <div className="pe-main">
          {/* Edit form */}
          <section className="card pe-card">
            <h2 className="serif" style={{ margin: "0 0 20px", fontSize: 22 }}>Edit profile</h2>
            <div className="pe-form-grid">
              <div className="field">
                <label>Display name</label>
                <input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} placeholder="Your name" />
              </div>
              <div className="field">
                <label>Native language</label>
                <input value={form.native_language} onChange={(e) => setForm((f) => ({ ...f, native_language: e.target.value }))} placeholder="e.g. Arabic, Mandarin…" />
              </div>
              <div className="field">
                <label>Date of birth</label>
                <input type="date" value={form.birthdate} onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))} />
              </div>
              <div className="field">
                <label>CEFR level</label>
                <select value={form.cefr_level} onChange={(e) => setForm((f) => ({ ...f, cefr_level: e.target.value }))}>
                  {CEFR_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Daily XP goal</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {GOAL_OPTIONS.map((g) => (
                    <button key={g} type="button"
                      onClick={() => setForm((f) => ({ ...f, daily_goal_xp: g }))}
                      style={{ padding: "6px 14px", borderRadius: 999, fontSize: 13, fontFamily: "var(--font-mono)", border: "1px solid var(--line)", cursor: "pointer", background: form.daily_goal_xp === g ? "var(--accent)" : "var(--bg-2)", color: form.daily_goal_xp === g ? "var(--accent-on)" : "var(--ink-2)", fontWeight: form.daily_goal_xp === g ? 700 : 400 }}>
                      {g} XP
                    </button>
                  ))}
                </div>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Bio <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>({bioLen}/200)</span></label>
                <textarea rows={3} maxLength={200} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="A short intro about yourself…" style={{ resize: "vertical" }} />
              </div>
            </div>
          </section>

          {/* Achievement shelf */}
          <section className="card pe-card" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>
                Achievements <span className="serif-it" style={{ color: "var(--ink-3)" }}>· {earned.length}/{achievements.length}</span>
              </h2>
              <span className="eyebrow">trophy shelf</span>
            </div>
            {achievements.length === 0 ? (
              <p style={{ color: "var(--ink-3)", fontSize: 14 }}>Complete your first module to start earning trophies!</p>
            ) : (
              <div className="pe-ach-grid">
                {achievements.map((a: any, i: number) => (
                  <div key={a.id} className={"pe-ach-card" + (a.earned ? " earned" : "")} style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="pe-ach-glyph"><AchGlyph kind={a.id} /></div>
                    <div className="pe-ach-body">
                      <strong>{a.title}</strong>
                      <span>{a.sub}</span>
                      {!a.earned && a.progress_pct > 0 && (
                        <div className="pe-prog"><span style={{ width: `${a.progress_pct}%` }} /></div>
                      )}
                    </div>
                    {a.earned && <span className="pe-tick"><CheckIcon size={11} /></span>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Password modal */}
      {pwOpen && <PasswordModal onClose={() => setPwOpen(false)} />}

      <style>{`
        .pe-page { padding-top: 24px; padding-bottom: 48px; }
        .pe-toprow { display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; }
        .pe-body { display:grid; grid-template-columns:260px 1fr; gap:24px; align-items:start; }
        .pe-aside { display:flex; flex-direction:column; gap:16px; }
        .pe-section { background:var(--bg-2); border:1px solid var(--line); border-radius:var(--r-md); padding:16px; }
        .pe-avatar-wrap { display:flex; flex-direction:column; align-items:center; gap:0; background:var(--bg-2); border:1px solid var(--line); border-radius:var(--r-md); padding:24px 16px 18px; }
        .pe-avatar-ring { position:relative; cursor:pointer; border-radius:50%; display:inline-block; }
        .pe-avatar-overlay { position:absolute; inset:0; border-radius:50%; background:oklch(0 0 0/0.35); display:grid; place-items:center; color:white; opacity:0; transition:opacity 0.2s; }
        .pe-avatar-ring:hover .pe-avatar-overlay { opacity:1; }
        .pe-main { display:flex; flex-direction:column; }
        .pe-card { padding:24px; }
        .pe-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .pe-ach-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:10px; }
        .pe-ach-card { background:var(--bg-2); border:1px solid var(--line); border-radius:var(--r-md); padding:12px; display:flex; align-items:center; gap:10px; opacity:0.55; animation:fadeUp 0.4s ease both; }
        .pe-ach-card.earned { opacity:1; }
        .pe-ach-glyph { width:34px;height:34px; border-radius:9px; background:var(--bg); display:grid; place-items:center; color:var(--ink-3); flex-shrink:0; border:1px solid var(--line-2); }
        .pe-ach-card.earned .pe-ach-glyph { background:var(--accent-soft); color:var(--accent-ink); border-color:var(--accent-soft); }
        .pe-ach-body { display:flex; flex-direction:column; gap:1px; min-width:0; flex:1; }
        .pe-ach-body strong { font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pe-ach-body span { font-size:11px; color:var(--ink-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pe-prog { height:3px; background:var(--line-2); border-radius:999px; overflow:hidden; margin-top:5px; }
        .pe-prog span { display:block; height:100%; background:var(--accent); border-radius:999px; }
        .pe-tick { width:20px;height:20px; border-radius:50%; background:var(--accent); color:white; display:grid; place-items:center; flex-shrink:0; }
        @media(max-width:860px) { .pe-body{grid-template-columns:1fr} .pe-aside{flex-direction:row;flex-wrap:wrap} .pe-avatar-wrap{flex:1;min-width:220px} .pe-section{flex:1;min-width:160px} }
        @media(max-width:520px) { .pe-form-grid{grid-template-columns:1fr} }
        /* Modal */
        .pw-overlay { position:fixed;inset:0;background:oklch(0 0 0/0.45);z-index:400;display:grid;place-items:center;padding:20px; }
        .pw-box { background:var(--bg);border-radius:var(--r-xl);padding:28px;width:min(400px,96vw);box-shadow:var(--shadow-lg);border:1px solid var(--line); }
      `}</style>
    </div>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (form.new_password !== form.confirm) { setError("New passwords do not match."); return; }
    if (form.new_password.length < 8) { setError("New password must be at least 8 characters."); return; }
    setLoading(true);
    setError(null);
    try {
      await api.me.changePassword({ current_password: form.current_password, new_password: form.new_password });
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pw-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pw-box fade-up">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 22 }}>Change password</h2>
          <button className="icon-btn" onClick={onClose}><XIcon size={16} /></button>
        </div>
        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ color: "var(--accent-ink)", fontWeight: 600 }}>Password changed successfully!</p>
            <button className="btn accent" style={{ marginTop: 12 }} onClick={onClose}>Done <ArrowRightIcon size={14} /></button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field"><label>Current password</label><input type="password" value={form.current_password} onChange={(e) => setForm((f) => ({ ...f, current_password: e.target.value }))} placeholder="Current password" /></div>
            <div className="field"><label>New password</label><input type="password" value={form.new_password} onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))} placeholder="At least 8 characters" /></div>
            <div className="field"><label>Confirm new password</label><input type="password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password" /></div>
            {error && <p style={{ color: "oklch(0.5 0.1 25)", fontSize: 13, margin: 0 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn accent" disabled={loading} onClick={handleSubmit}>
                {loading ? "Saving…" : "Change password"} {!loading && <ArrowRightIcon size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
