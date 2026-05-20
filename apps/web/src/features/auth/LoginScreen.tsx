import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo, ArrowRightIcon } from "../../components/ui";
import { api } from "../../lib/api";
import "./LoginScreen.css";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  display_name: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

type Props = { onLogin: (user: any) => void };

export function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const words = ["speak", "write", "read", "think"];
  const [wi, setWi] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setWi((x) => (x + 1) % words.length), 2200);
    return () => clearInterval(t);
  }, []);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError("");
    try {
      let tokens;
      if (mode === "signup") {
        tokens = await api.auth.signup(data.email, data.display_name || "Learner", data.password);
      } else {
        tokens = await api.auth.login(data.email, data.password);
      }
      localStorage.setItem("access_token", tokens.access);
      localStorage.setItem("refresh_token", tokens.refresh);
      const me = await api.me.get();
      onLogin(me);
    } catch (e: any) {
      setError(e.message || "Login failed");
    }
  }

  return (
    <div className="login-shell">
      <aside className="login-aside">
        <div className="aside-bg" aria-hidden="true">
          <span className="blob b1" /><span className="blob b2" /><span className="blob b3" />
        </div>
        <div className="aside-inner">
          <Logo />
          <div style={{ flex: 1 }} />
          <h1 className="serif" style={{ fontSize: 60, lineHeight: 1.02, margin: "0 0 22px", maxWidth: 480, letterSpacing: "-0.025em" }}>
            Study English,<br />one buddy<br />at a&nbsp;
            <span className="rotator">
              {words.map((w, i) => (
                <span key={w} className={i === wi ? "rotator-w active" : "rotator-w"}>{w}.</span>
              ))}
            </span>
          </h1>
          <p style={{ color: "var(--ink-2)", maxWidth: 440, fontSize: 16, lineHeight: 1.55, margin: 0 }}>
            Bite-sized daily practice. Vocabulary, grammar, listening, and speaking — all in friendly 10-minute sessions you'll actually look forward to.
          </p>
          <div className="chat-stack" aria-hidden="true">
            <div className="chat-card cc1"><span className="chat-tag mono">YOU</span><span>How do I say "menekan" in English?</span></div>
            <div className="chat-card cc2"><span className="chat-tag mono buddy">BUDDY</span><span>It's <em>suppress</em>. Try: "The algorithm <strong>suppresses</strong> noise."</span></div>
            <div className="chat-card cc3"><span className="chat-tag mono">YOU</span><span>Got it! ✨</span></div>
          </div>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card fade-up">
          <p className="eyebrow" style={{ marginBottom: 6 }}>{mode === "signin" ? "Welcome back" : "Create your account"}</p>
          <h2 className="serif" style={{ fontSize: 32, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
            {mode === "signin" ? "Sign in to EnglishBuddy" : "Start in 30 seconds"}
          </h2>

          {error && (
            <div style={{ padding: "12px 14px", background: "var(--rose-soft)", border: "1px solid color-mix(in oklch, var(--rose), white 60%)", borderRadius: "var(--r-md)", marginBottom: 14, fontSize: 14, color: "var(--rose)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div className="field fade-up">
                <label>Full name</label>
                <input {...register("display_name")} placeholder="Your name" />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input type="email" {...register("email")} placeholder="you@email.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" {...register("password")} placeholder="••••••••" />
            </div>
            <button className="btn accent lg" type="submit" disabled={isSubmitting} style={{ marginTop: 8 }}>
              {isSubmitting ? <span className="dot-load"><i/><i/><i/></span> : <>{mode === "signin" ? "Sign in" : "Create account"}<ArrowRightIcon size={16} /></>}
            </button>
          </form>

          <p style={{ marginTop: 22, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            {mode === "signin" ? "New to EnglishBuddy? " : "Already have an account? "}
            <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
              style={{ background: "none", border: 0, color: "var(--accent-ink)", fontWeight: 600, cursor: "pointer", padding: 0 }}>
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>

        </div>
      </main>

    </div>
  );
}
