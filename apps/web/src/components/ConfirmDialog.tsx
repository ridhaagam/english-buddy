import { useCallback, useState } from "react";
import { XIcon } from "./ui";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  hideCancel?: boolean; // for alert-style notices (single OK button)
};

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 600,
  display: "grid", placeItems: "center", padding: 24,
};
const card: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-xl)",
  padding: "26px 24px", width: "100%", maxWidth: 400, boxShadow: "var(--shadow-md)",
};

export function ConfirmDialog({
  open, options, onConfirm, onCancel,
}: {
  open: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const {
    title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
    variant = "default", hideCancel = false,
  } = options;
  const dangerStyle: React.CSSProperties = variant === "danger"
    ? { background: "oklch(0.55 0.16 25)", color: "white", borderColor: "transparent" }
    : {};

  return (
    <div style={overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={card} role="alertdialog" aria-modal="true" aria-label={title}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: message ? 8 : 16 }}>
          <h3 className="serif" style={{ margin: 0, fontSize: 19, letterSpacing: "-0.01em" }}>{title}</h3>
          <button className="icon-btn" onClick={onCancel} aria-label="Close" style={{ flexShrink: 0 }}><XIcon size={16} /></button>
        </div>
        {message && <p style={{ margin: "0 0 18px", color: "var(--ink-2)", fontSize: 14, lineHeight: 1.55 }}>{message}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {!hideCancel && <button className="btn ghost" onClick={onCancel}>{cancelLabel}</button>}
          <button className="btn accent" style={dangerStyle} onClick={onConfirm} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Promise-based replacement for window.confirm / window.alert.
 *
 *   const [confirm, confirmUI] = useConfirm();
 *   ...render {confirmUI}...
 *   if (await confirm({ title: "Delete X?", variant: "danger", confirmLabel: "Delete" })) del();
 */
export function useConfirm() {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ options, resolve })),
    [],
  );

  const settle = (value: boolean) => {
    setState((s) => { s?.resolve(value); return null; });
  };

  const element = (
    <ConfirmDialog
      open={!!state}
      options={state?.options ?? { title: "" }}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return [confirm, element] as const;
}
