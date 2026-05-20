import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar, AchGlyph, CheckIcon, ArrowLeftIcon, CameraIcon, XIcon, ArrowRightIcon, FlameIcon,
  ZapIcon, TrophyIcon,
} from "../../components/ui";
import { api } from "../../lib/api";
import "./ProfileEditPage.css";

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
