import { useMemo, useState, useEffect, useRef } from "react";

// ----- Logo -----------------------------------------------------------------
export function Logo({ size = 22 }: { size?: number; mark?: number }) {
  return (
    <a href="/" className="brand" style={{ fontSize: size }}>
      <img src="/logo.png" alt="EnglishBuddy" style={{ height: 32, width: "auto", display: "block" }} />
    </a>
  );
}

// ----- Avatar ---------------------------------------------------------------
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const hue = useMemo(() => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }, [name]);
  return (
    <div
      aria-label={name}
      style={{
        width: size, height: size, borderRadius: "50%",
        display: "grid", placeItems: "center",
        background: `oklch(0.92 0.04 ${hue})`,
        color: `oklch(0.32 0.08 ${hue})`,
        fontWeight: 700, fontSize: size * 0.38,
        letterSpacing: "-0.02em",
        border: "1px solid var(--line)",
        flexShrink: 0,
      }}
    >
      {initials || "U"}
    </div>
  );
}

// ----- ProgressBar ----------------------------------------------------------
export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(value * 100)}>
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

// ----- AnimatedNumber -------------------------------------------------------
export function AnimatedNumber({
  value,
  duration = 900,
  format = (n: number) => Math.round(n).toLocaleString(),
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const [displayed, setDisplayed] = useState(value);
  useEffect(() => { setDisplayed(value); }, [value]);
  return (
    <span style={{ display: "inline-block", transition: `opacity ${duration * 0.3}ms ease` }}>
      {format(displayed)}
    </span>
  );
}

// ----- Icons ----------------------------------------------------------------
function IconBase({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
export const FlameIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M12 3c0 4 4 5 4 9a4 4 0 1 1-8 0c0-2 1-3 1-5 0 1.5 1 2.5 2 2.5C12 7 11 5 12 3Z" /></IconBase>
);
export const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M4 12.5 9 17l11-11" /></IconBase>
);
export const ArrowRightIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M5 12h14M13 6l6 6-6 6" /></IconBase>
);
export const ArrowLeftIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M19 12H5M11 18l-6-6 6-6" /></IconBase>
);
export const CameraIcon = ({ size = 18 }: { size?: number }) => (
  <IconBase size={size}><path d="M3 7h4l2-2h6l2 2h4v12H3z" /><circle cx="12" cy="13" r="3.5" /></IconBase>
);
export const XIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M6 6l12 12M18 6 6 18" /></IconBase>
);
export const ClockIcon = ({ size = 14 }: { size?: number }) => (
  <IconBase size={size}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></IconBase>
);
export const SparkleIcon = ({ size = 14 }: { size?: number }) => (
  <IconBase size={size}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M6.5 6.5l3 3M14.5 14.5l3 3M6.5 17.5l3-3M14.5 9.5l3-3" /></IconBase>
);
export const ShieldIcon = ({ size = 14 }: { size?: number }) => (
  <IconBase size={size}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></IconBase>
);
export const PlusIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M12 5v14M5 12h14" /></IconBase>
);
export const EditIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" /></IconBase>
);
export const TrashIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></IconBase>
);
export const FlagIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" /></IconBase>
);
export const PlayIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><polygon points="5 3 19 12 5 21 5 3" /></IconBase>
);
export const ChevronDownIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M6 9l6 6 6-6" /></IconBase>
);
export const BarChartIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M4 19V5M9 19v-7M14 19v-4M19 19V9M3 19h18" /></IconBase>
);
export const UsersIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0z"/><path d="M3 20a7 7 0 0 1 18 0"/></IconBase>
);
export const BookOpenIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M2 4h9v16H2zM13 4h9v16h-9zM2 20h20" /></IconBase>
);
export const MicIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></IconBase>
);
export const VideoIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m22 8-5 4 5 4V8Z" /></IconBase>
);
export const HomeIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 21V12h6v9" /></IconBase>
);
export const ImportIcon = ({ size = 16 }: { size?: number }) => (
  <IconBase size={size}><path d="M12 3v12M8 11l4 4 4-4M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /></IconBase>
);

// ----- Topbar ---------------------------------------------------------------
type TopbarProps = {
  route: string;
  onNav: (r: string) => void;
  user?: { display_name: string; streak: number; role: string };
  onLogout?: () => void;
  onOpenAdmin?: () => void;
};
export function Topbar({ route, onNav, user, onLogout, onOpenAdmin }: TopbarProps) {
  return (
    <header className="topbar">
      <Logo />
      {user && (
        <>
          <nav>
            <button aria-current={route === "profile" ? "true" : undefined} onClick={() => onNav("profile")}>Dashboard</button>
            <button aria-current={route === "practice" ? "true" : undefined} onClick={() => onNav("practice")}>Practice</button>
            <button aria-current={route === "library" ? "true" : undefined} onClick={() => onNav("library")}>Library</button>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {onOpenAdmin && (
              <button className="admin-pill" onClick={onOpenAdmin}>
                <ShieldIcon /> Admin
              </button>
            )}
            <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-2)", background: "var(--amber-soft)", padding: "6px 10px", borderRadius: 999 }}>
              <FlameIcon size={12} /> {user.streak}d
            </span>
            <Avatar name={user.display_name} />
            <button className="btn ghost" style={{ padding: "8px 12px", fontSize: 13 }} onClick={onLogout}>Sign out</button>
          </div>
        </>
      )}
    </header>
  );
}

// ----- Spinner --------------------------------------------------------------
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" aria-label="Loading"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ----- AchGlyph -------------------------------------------------------------
export function AchGlyph({ kind }: { kind: string }) {
  const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "week_streak": return <svg {...p}><path d="M12 3c0 4 4 5 4 9a4 4 0 1 1-8 0c0-2 1-3 1-5 0 1.5 1 2.5 2 2.5C12 7 11 5 12 3Z" /></svg>;
    case "centurion": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "perfect_set": return <svg {...p}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
    case "owl_mode": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><circle cx="9" cy="10" r="1" /><circle cx="15" cy="10" r="1" /></svg>;
    case "marathoner": return <svg {...p}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
    default: return <svg {...p}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
  }
}

// ----- ModuleGlyph ----------------------------------------------------------
export function ModuleGlyph({ topic }: { topic: string }) {
  const p = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (topic) {
    case "vocabulary": return <svg {...p}><path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z" /><path d="M4 17h13a3 3 0 0 1 3 3" /><path d="M8 9h8M8 12h6" /></svg>;
    case "grammar": return <svg {...p}><path d="M4 5h16M4 12h10M4 19h7" /><circle cx="18" cy="17" r="3" /></svg>;
    case "listening": return <svg {...p}><path d="M4 14a8 8 0 0 1 16 0v3a3 3 0 0 1-3 3h-1v-7h4" /><path d="M4 14v3a3 3 0 0 0 3 3h1v-7H4" /></svg>;
    case "speaking": return <svg {...p}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
    case "writing": return <svg {...p}><path d="M4 20h16" /><path d="M14 4l6 6L8 22H2v-6z" /></svg>;
    default: return <svg {...p}><path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z" /></svg>;
  }
}
