import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo, ArrowRightIcon } from "../../components/ui";
import { api } from "../../lib/api";

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

      <style>{`
        .login-shell { min-height:100vh; display:grid; grid-template-columns:1.05fr 1fr; background:var(--bg); }
        .login-aside { position:relative; padding:48px 56px; background:linear-gradient(180deg,oklch(0.97 0.012 90),oklch(0.95 0.018 90)); border-right:1px solid var(--line); overflow:hidden; }
        .aside-inner { height:100%; display:flex; flex-direction:column; position:relative; z-index:2; }
        .aside-bg { position:absolute; inset:0; z-index:0; pointer-events:none; }
        .aside-bg .blob { position:absolute; border-radius:50%; filter:blur(40px); opacity:0.55; }
        .aside-bg .b1 { width:360px;height:360px; background:oklch(0.78 0.16 158/0.55); left:-80px;top:18%; animation:blob 14s ease-in-out infinite; }
        .aside-bg .b2 { width:260px;height:260px; background:oklch(0.82 0.13 75/0.5); right:-40px;top:8%; animation:blob 18s ease-in-out infinite reverse; }
        .aside-bg .b3 { width:300px;height:300px; background:oklch(0.75 0.14 145/0.4); right:10%;bottom:-80px; animation:blob 16s ease-in-out infinite; }
        @keyframes blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-30px) scale(1.05)} 66%{transform:translate(-15px,20px) scale(0.95)} }
        .rotator { position:relative; display:inline-block; min-width:220px; height:1.05em; vertical-align:top; color:var(--accent); }
        .rotator-w { position:absolute; left:0;top:0; opacity:0; transform:translateY(8px); transition:opacity 0.4s ease,transform 0.4s ease; font-style:italic; }
        .rotator-w.active { opacity:1; transform:translateY(0); }
        .chat-stack { margin-top:36px; display:flex; flex-direction:column; gap:10px; max-width:460px; }
        .chat-card { background:var(--surface); border:1px solid var(--line); border-radius:18px; padding:12px 16px; font-size:14px; color:var(--ink); display:flex; align-items:flex-start; gap:10px; box-shadow:var(--shadow-sm); opacity:0; animation:chatIn 0.7s cubic-bezier(0.22,1,0.36,1) forwards; }
        .chat-card.cc1 { align-self:flex-end; animation-delay:0.3s; background:oklch(0.96 0.02 90); }
        .chat-card.cc2 { align-self:flex-start; animation-delay:1.0s; }
        .chat-card.cc3 { align-self:flex-end; animation-delay:1.8s; background:oklch(0.96 0.02 90); }
        @keyframes chatIn { from{opacity:0;transform:translateY(14px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        .chat-tag { font-size:9px; letter-spacing:0.1em; color:var(--ink-3); background:var(--bg-2); padding:3px 6px; border-radius:4px; flex-shrink:0; }
        .chat-tag.buddy { background:var(--accent); color:white; }
        .login-main { display:grid; place-items:center; padding:48px 32px; }
        .login-card { width:100%; max-width:420px; background:var(--surface); border:1px solid var(--line); border-radius:var(--r-xl); padding:36px 32px; box-shadow:var(--shadow-lg); }
        @media(max-width:920px) { .login-shell{grid-template-columns:1fr} .login-aside{padding:36px 28px} .login-aside h1{font-size:40px!important} .rotator{min-width:160px} .chat-stack{display:none} }
        @media(max-width:520px) { .login-main{padding:24px 16px} .login-card{padding:28px 22px} .login-aside h1{font-size:34px!important} }
      `}</style>
    </div>
  );
}
