// src/ui.tsx — shared small UI atoms
const { useState, useEffect, useRef, useMemo } = React;

// ----- Logo -----------------------------------------------------------------
function Logo({ size = 22, mark = 26 }: { size?: number; mark?: number }) {
  return (
    <div className="brand" style={{ fontSize: size }}>
      <img
        src="assets/logo.png"
        alt=""
        aria-hidden="true"
        style={{
          width: mark,
          height: mark,
          objectFit: "contain",
          display: "block",
        }}
      />
      <span>
        English<span style={{ fontStyle: "normal", fontWeight: 500 }}>Buddy</span>
      </span>
    </div>
  );
}

// ----- Topbar ---------------------------------------------------------------
type TopbarProps = {
  route: string;
  onNav: (r: string) => void;
  user?: { name: string; streak: number; isAdmin?: boolean };
  onLogout?: () => void;
  onOpenAdmin?: () => void;
};
function Topbar({ route, onNav, user, onLogout, onOpenAdmin }: TopbarProps) {
  return (
    <header className="topbar">
      <Logo />
      {user ? (
        <>
          <nav>
            <button aria-current={route === "profile"} onClick={() => onNav("profile")}>
              Dashboard
            </button>
            <button aria-current={route === "practice"} onClick={() => onNav("practice")}>
              Practice
            </button>
            <button aria-current={route === "library"} onClick={() => onNav("library")}>
              Library
            </button>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {onOpenAdmin && (
              <button
                className="admin-pill"
                onClick={onOpenAdmin}
                title="Open admin console"
              >
                <ShieldIcon />
                Admin
              </button>
            )}
            <span
              className="mono"
              title="day streak"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--ink-2)",
                background: "var(--amber-soft)",
                padding: "6px 10px",
                borderRadius: 999,
              }}
            >
              <FlameIcon size={12} />
              {user.streak}d
            </span>
            <Avatar name={user.name} />
            <button
              className="btn ghost"
              style={{ padding: "8px 12px", fontSize: 13 }}
              onClick={onLogout}
            >
              Sign out
            </button>
          </div>
        </>
      ) : null}
    </header>
  );
}

// ----- Avatar ---------------------------------------------------------------
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hue = useMemo(() => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }, [name]);
  return (
    <div
      aria-label={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: `oklch(0.92 0.04 ${hue})`,
        color: `oklch(0.32 0.08 ${hue})`,
        fontWeight: 700,
        fontSize: size * 0.38,
        letterSpacing: "-0.02em",
        border: "1px solid var(--line)",
      }}
    >
      {initials || "U"}
    </div>
  );
}

// ----- Progress -------------------------------------------------------------
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(value * 100)}>
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

// ----- Hook: stagger animation on mount -------------------------------------
function useStagger(count: number, step = 60) {
  return Array.from({ length: count }, (_, i) => ({
    animationDelay: `${i * step}ms`,
  })) as React.CSSProperties[];
}

// ----- Icons (minimal stroke SVGs) -----------------------------------------
function IconBase({ children, size = 16 }: { children: any; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
function FlameIcon({ size = 16 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <path d="M12 3c0 4 4 5 4 9a4 4 0 1 1-8 0c0-2 1-3 1-5 0 1.5 1 2.5 2 2.5C12 7 11 5 12 3Z" />
    </IconBase>
  );
}
function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <path d="M4 12.5 9 17l11-11" />
    </IconBase>
  );
}
function ArrowRightIcon({ size = 16 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </IconBase>
  );
}
function ArrowLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </IconBase>
  );
}
function CameraIcon({ size = 18 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <path d="M3 7h4l2-2h6l2 2h4v12H3z" />
      <circle cx="12" cy="13" r="3.5" />
    </IconBase>
  );
}
function XIcon({ size = 16 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <path d="M6 6l12 12M18 6 6 18" />
    </IconBase>
  );
}
function ClockIcon({ size = 14 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}
function SparkleIcon({ size = 14 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6.5 6.5l3 3M14.5 14.5l3 3M6.5 17.5l3-3M14.5 9.5l3-3" />
    </IconBase>
  );
}

function ShieldIcon({ size = 14 }: { size?: number }) {
  return (
    <IconBase size={size}>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </IconBase>
  );
}

// useLocalStorage — lightweight persistence
function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [val, setVal] = React.useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch { return initial; }
  });
  const set = (v: T) => {
    setVal(v);
    try { window.localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  return [val, set];
}

// useCountUp — animate a number from 0 to target on mount
function useCountUp(target: number, durationMs = 900, fmt: (n: number) => string = (n) => String(Math.round(n))) {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return fmt(val);
}

// AnimatedNumber — drop-in component
function AnimatedNumber({
  value,
  duration = 900,
  format = (n: number) => Math.round(n).toLocaleString(),
}: { value: number; duration?: number; format?: (n: number) => string }) {
  const s = (useCountUp as any)(value, duration, format);
  return <>{s}</>;
}

Object.assign(window, {
  Logo,
  Topbar,
  Avatar,
  ProgressBar,
  useStagger,
  FlameIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CameraIcon,
  XIcon,
  ClockIcon,
  SparkleIcon,
  ShieldIcon,
  useLocalState,
  useCountUp,
  AnimatedNumber,
});
