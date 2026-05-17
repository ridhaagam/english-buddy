import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar, AchGlyph, CheckIcon, ArrowLeftIcon, CameraIcon, XIcon, ArrowRightIcon, FlameIcon,
  ZapIcon, TrophyIcon,
} from "../../components/ui";
import { api } from "../../lib/api";

type Props = {
  user: any;
  onBack: () => void;
  onUserUpdate: (u: any) => void;
};

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const GOAL_OPTIONS = [50, 100, 150, 200, 300, 500];

// Earned-badge definitions — derived from stats at runtime
const BADGE_DEFS: { slug: string; label: string; h: number; check: (s: any) => boolean }[] = [
  { slug: "learner",   label: "Learner",        h: 220, check: () => true },
  { slug: "streak7",   label: "Week Warrior",   h: 40,  check: (s) => (s?.streak ?? 0) >= 7 },
  { slug: "streak30",  label: "Month Streak",   h: 25,  check: (s) => (s?.streak ?? 0) >= 30 },
  { slug: "centurion", label: "Centurion",      h: 85,  check: (s) => (s?.xp_total ?? 0) >= 100 },
  { slug: "xp1k",      label: "XP 1000",        h: 65,  check: (s) => (s?.xp_total ?? 0) >= 1000 },
  { slug: "perfect",   label: "Perfectionist",  h: 158, check: (s) => (s?.achievements ?? []).some((a: any) => a.id === "perfect_set" && a.earned) },
  { slug: "explorer",  label: "Explorer",       h: 300, check: (s) => (s?.achievements ?? []).some((a: any) => a.id === "explorer" && a.earned) },
];

function BadgePill({ label, h }: { label: string; h: number }) {
  return (
    <span className="mono" style={{
      fontSize: 11, padding: "5px 12px", borderRadius: 999,
      background: `oklch(0.94 0.05 ${h})`,
      color: `oklch(0.38 0.1 ${h})`,
      border: `1px solid oklch(0.84 0.07 ${h})`,
      fontWeight: 700, letterSpacing: "0.03em",
    }}>
      {label}
    </span>
  );
}

export function ProfileEditPage({ user, onBack, onUserUpdate }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pwOpen, setPwOpen] = useState(false);

  const { data: stats } = useQuery({ queryKey: ["me-stats"], queryFn: api.me.stats });
  const achievements: any[] = stats?.achievements ?? [];
  const earnedAchs = achievements.filter((a) => a.earned);
  const myBadges = BADGE_DEFS.filter((b) => b.check(stats));

  const [form, setForm] = useState({
    display_name:    user.display_name    ?? "",
    birthdate:       user.birthdate       ?? "",
    native_language: user.native_language ?? "",
    bio:             user.bio             ?? "",
    cefr_level:      user.cefr_level      ?? "A2",
    daily_goal_xp:   user.daily_goal_xp   ?? 200,
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile]       = useState<File | null>(null);
  const [saved, setSaved]                 = useState(false);
  const [saveError, setSaveError]         = useState<string | null>(null);
  const [isSaving, setIsSaving]           = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (avatarFile) await api.me.uploadAvatar(avatarFile);
      await api.me.patch(form as any);
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

  const statTiles = [
    { icon: <FlameIcon size={18} />, label: "Day streak",   value: (stats?.streak ?? user.streak ?? 0) + "d",    h: 40  },
    { icon: <ZapIcon size={18} />,   label: "Total XP",     value: (stats?.xp_total ?? user.xp_total ?? 0).toLocaleString(), h: 65  },
    { icon: <CheckIcon size={18} />, label: "Accuracy",     value: Math.round(stats?.avg_accuracy ?? 0) + "%",   h: 158 },
    { icon: <TrophyIcon size={18} />,label: "Trophies",     value: `${earnedAchs.length}/${achievements.length}`,h: 220 },
  ];

  return (
    <div className="pe-wrap container">
      {/* ── Top action bar ── */}
      <div className="pe-topbar">
        <button className="btn ghost" style={{ gap: 6 }} onClick={onBack}>
          <ArrowLeftIcon size={14} /> Back to dashboard
        </button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved     && <span style={{ color: "var(--accent-ink)", fontWeight: 600, fontSize: 13 }}>Saved ✓</span>}
          {saveError && <span style={{ color: "oklch(0.5 0.1 25)", fontSize: 13 }}>{saveError}</span>}
          <button className="btn accent" disabled={isSaving} onClick={handleSave}>
            {isSaving ? "Saving…" : <>Save changes <ArrowRightIcon size={14} /></>}
          </button>
        </div>
      </div>

      {/* ── Hero: avatar + identity + stats ── */}
      <div className="pe-hero card">
        {/* Avatar column */}
        <div className="pe-hero-left">
          <div className="pe-avatar-ring" onClick={() => fileRef.current?.click()} title="Change photo">
            <Avatar name={form.display_name || user.display_name} size={100} avatarUrl={avatarPreview ?? user.avatar_url} />
            <div className="pe-avatar-overlay"><CameraIcon size={22} /></div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleAvatarChange} />
          <div className="pe-hero-name">
            <h2 className="serif">{form.display_name || user.display_name || "—"}</h2>
            <p className="mono" style={{ fontSize: 12, color: "var(--ink-3)", textTransform: "capitalize", margin: 0 }}>
              {user.role} · {form.cefr_level}
            </p>
          </div>
        </div>

        {/* Badges */}
        {myBadges.length > 0 && (
          <div className="pe-hero-mid">
            <p className="eyebrow" style={{ margin: "0 0 10px" }}>Badges</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {myBadges.map((b) => <BadgePill key={b.slug} label={b.label} h={b.h} />)}
            </div>
          </div>
        )}

        {/* Stat tiles */}
        <div className="pe-hero-right">
          {statTiles.map((t) => (
            <div key={t.label} className="pe-stat-tile" style={{ "--h": t.h } as any}>
              <span className="pe-stat-icon">{t.icon}</span>
              <div>
                <strong className="mono">{t.value}</strong>
                <span>{t.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body: two columns ── */}
      <div className="pe-body">
        {/* Left: form + password */}
        <div className="pe-col-form">
          <section className="card pe-card">
            <h3 className="serif pe-section-title">Edit profile</h3>
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
                      style={{
                        padding: "7px 16px", borderRadius: 999, fontSize: 13,
                        fontFamily: "var(--font-mono)", border: "1.5px solid",
                        cursor: "pointer",
                        borderColor: form.daily_goal_xp === g ? "var(--accent)" : "var(--line)",
                        background: form.daily_goal_xp === g ? "var(--accent)" : "var(--bg-2)",
                        color: form.daily_goal_xp === g ? "var(--accent-on)" : "var(--ink-2)",
                        fontWeight: form.daily_goal_xp === g ? 700 : 400,
                      }}>
                      {g} XP
                    </button>
                  ))}
                </div>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Bio <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>({bioLen}/200)</span></label>
                <textarea rows={3} maxLength={200} value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="A short intro about yourself…" style={{ resize: "vertical" }} />
              </div>
            </div>
          </section>

          <section className="card pe-card" style={{ marginTop: 14 }}>
            <h3 className="serif pe-section-title">Security</h3>
            <p style={{ color: "var(--ink-2)", fontSize: 14, margin: "0 0 14px" }}>
              Change your password at any time. You'll need your current password to confirm.
            </p>
            <button className="btn ghost" onClick={() => setPwOpen(true)}>
              Change password
            </button>
          </section>
        </div>

        {/* Right: achievement shelf */}
        <div className="pe-col-ach">
          <section className="card pe-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
              <h3 className="serif pe-section-title" style={{ margin: 0 }}>
                Achievements
                <span className="serif-it" style={{ color: "var(--ink-3)", fontSize: 16, marginLeft: 8 }}>
                  · {earnedAchs.length}/{achievements.length}
                </span>
              </h3>
              <span className="eyebrow">trophy shelf</span>
            </div>
            {achievements.length === 0 ? (
              <p style={{ color: "var(--ink-3)", fontSize: 14, margin: 0 }}>
                Complete your first module to start earning trophies!
              </p>
            ) : (
              <div className="pe-ach-grid">
                {achievements.map((a: any, i: number) => (
                  <div key={a.id} className={"pe-ach-card" + (a.earned ? " earned" : "")} style={{ animationDelay: `${i * 35}ms` }}>
                    <div className="pe-ach-glyph"><AchGlyph kind={a.id} /></div>
                    <div className="pe-ach-body">
                      <strong>{a.title}</strong>
                      <span>{a.sub}</span>
                      {!a.earned && (a.progress_pct ?? 0) > 0 && (
                        <div className="pe-prog"><span style={{ width: `${a.progress_pct}%` }} /></div>
                      )}
                    </div>
                    {a.earned && (
                      <span className="pe-ach-tick" title={a.earned_at ? new Date(a.earned_at).toLocaleDateString() : undefined}>
                        <CheckIcon size={11} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {pwOpen && <PasswordModal onClose={() => setPwOpen(false)} />}

      <style>{`
        .pe-wrap { padding-top:24px; padding-bottom:56px; }

        /* Top bar */
        .pe-topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }

        /* Hero card */
        .pe-hero { display:grid; grid-template-columns:auto 1fr auto; gap:28px; align-items:start; padding:28px 32px; margin-bottom:20px; }
        .pe-hero-left { display:flex; flex-direction:column; align-items:center; gap:12px; min-width:120px; }
        .pe-hero-name { text-align:center; }
        .pe-hero-name h2 { margin:0 0 2px; font-size:22px; letter-spacing:-0.02em; }
        .pe-hero-mid { padding-left:8px; border-left:2px solid var(--line-2); }
        .pe-hero-right { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .pe-stat-tile { display:flex; align-items:center; gap:10px; background:var(--bg-2); border:1px solid var(--line); border-radius:var(--r-md); padding:12px 14px; min-width:120px; }
        .pe-stat-icon { width:36px;height:36px; border-radius:9px; display:grid; place-items:center; background:oklch(0.94 0.05 var(--h));color:oklch(0.38 0.1 var(--h)); flex-shrink:0; }
        .pe-stat-tile strong { display:block; font-size:18px; font-weight:700; letter-spacing:-0.01em; }
        .pe-stat-tile span { font-size:11px; color:var(--ink-3); }

        /* Avatar */
        .pe-avatar-ring { position:relative; cursor:pointer; border-radius:50%; display:inline-block; }
        .pe-avatar-overlay { position:absolute; inset:0; border-radius:50%; background:oklch(0 0 0/0.38); display:grid; place-items:center; color:white; opacity:0; transition:opacity 0.2s; }
        .pe-avatar-ring:hover .pe-avatar-overlay { opacity:1; }

        /* Body layout */
        .pe-body { display:grid; grid-template-columns:1fr 1.4fr; gap:20px; align-items:start; }
        .pe-col-form { display:flex; flex-direction:column; }
        .pe-col-ach { }
        .pe-card { padding:26px 28px; }
        .pe-section-title { margin:0 0 18px; font-size:20px; letter-spacing:-0.01em; }

        /* Form */
        .pe-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }

        /* Achievement grid */
        .pe-ach-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:9px; }
        .pe-ach-card { background:var(--bg-2); border:1px solid var(--line); border-radius:var(--r-md); padding:11px 12px; display:flex; align-items:center; gap:10px; opacity:0.45; animation:fadeUp 0.4s ease both; transition:opacity 0.2s,border-color 0.2s; }
        .pe-ach-card.earned { opacity:1; border-color:color-mix(in oklch,var(--accent),white 55%); }
        .pe-ach-glyph { width:32px;height:32px; border-radius:8px; background:var(--bg); display:grid; place-items:center; color:var(--ink-3); flex-shrink:0; border:1px solid var(--line-2); }
        .pe-ach-card.earned .pe-ach-glyph { background:var(--accent-soft); color:var(--accent-ink); border-color:transparent; }
        .pe-ach-body { display:flex; flex-direction:column; gap:1px; min-width:0; flex:1; }
        .pe-ach-body strong { font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pe-ach-body span { font-size:11px; color:var(--ink-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pe-prog { height:3px; background:var(--line-2); border-radius:999px; overflow:hidden; margin-top:5px; }
        .pe-prog span { display:block; height:100%; background:var(--accent); border-radius:999px; }
        .pe-ach-tick { width:20px;height:20px; border-radius:50%; background:var(--accent); color:white; display:grid; place-items:center; flex-shrink:0; }

        /* Responsive */
        @media(max-width:1060px) { .pe-body{grid-template-columns:1fr} }
        @media(max-width:820px) {
          .pe-hero{grid-template-columns:1fr;gap:16px}
          .pe-hero-left{flex-direction:row;align-items:center;gap:18px;min-width:unset}
          .pe-hero-name{text-align:left}
          .pe-hero-mid{border-left:none;border-top:1px solid var(--line-2);padding-left:0;padding-top:12px}
          .pe-hero-right{grid-template-columns:1fr 1fr}
        }
        @media(max-width:520px) {
          .pe-form-grid{grid-template-columns:1fr}
          .pe-hero-right{grid-template-columns:1fr 1fr}
          .pe-card{padding:18px 16px}
        }

        /* Password modal */
        .pw-overlay { position:fixed;inset:0;background:oklch(0 0 0/0.48);z-index:400;display:grid;place-items:center;padding:20px; }
        .pw-box { background:var(--bg);border-radius:var(--r-xl);padding:30px;width:min(420px,96vw);box-shadow:var(--shadow-lg);border:1px solid var(--line); }
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 24, letterSpacing: "-0.015em" }}>Change password</h2>
          <button className="icon-btn" onClick={onClose}><XIcon size={16} /></button>
        </div>
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--accent-soft)", display: "grid", placeItems: "center", margin: "0 auto 14px", color: "var(--accent-ink)" }}>
              <CheckIcon size={22} />
            </div>
            <p style={{ fontWeight: 600, color: "var(--accent-ink)", margin: "0 0 4px" }}>Password changed!</p>
            <p style={{ color: "var(--ink-3)", fontSize: 13, margin: "0 0 20px" }}>Your new password is active immediately.</p>
            <button className="btn accent" onClick={onClose}>Done <ArrowRightIcon size={14} /></button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field">
              <label>Current password</label>
              <input type="password" value={form.current_password} onChange={(e) => setForm((f) => ({ ...f, current_password: e.target.value }))} placeholder="Current password" autoFocus />
            </div>
            <div className="field">
              <label>New password</label>
              <input type="password" value={form.new_password} onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))} placeholder="At least 8 characters" />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <input type="password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
            </div>
            {error && <p style={{ color: "oklch(0.5 0.1 25)", fontSize: 13, margin: 0 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn accent" disabled={loading} onClick={handleSubmit}>
                {loading ? "Saving…" : <>Change password <ArrowRightIcon size={14} /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
