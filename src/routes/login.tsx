import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Skintea" }] }),
  component: LoginPage,
});

const ESPRESSO = "#1C0A00";
const CREAM = "#FAF7F2";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8E0D8";
const MUTED = "#8A7E76";
const CRIMSON = "#A8001C";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    navigate({ to: "/" });
  };

  const google = async () => {
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { setErr(result.error.message ?? "Google sign-in failed"); return; }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return <AuthShell title="skintea">
    <h2 style={subtitleStyle}>Sign in</h2>
    <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 18 }}>
      <Field label="Email">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Password">
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
      </Field>
      {err && <div style={{ color: CRIMSON, fontSize: 13 }}>{err}</div>}
      <button type="submit" disabled={loading} style={primaryBtn(loading)}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>

    <Divider />

    <button onClick={google} style={googleBtn}>
      <GoogleIcon /> Continue with Google
    </button>

    <p style={footerText}>
      Don't have an account?{" "}
      <Link to="/signup" style={linkStyle}>Sign up</Link>
    </p>
  </AuthShell>;
}

// --- shared UI ---

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "DM Sans, sans-serif", color: ESPRESSO, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 40, fontWeight: 600, textAlign: "center", margin: 0 }}>
          {title}
        </h1>
        <div style={{ marginTop: 24, background: WARM_WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: MUTED }}>{label}</span>
      {children}
    </label>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
      <span style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>or</span>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.3 0-11.5-5.2-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.5 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.7 18.9 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.5 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13.1-5l-6.1-5c-2 1.4-4.4 2.2-7 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.3 5.5l6.1 5c-.4.4 6.4-4.7 6.4-14.5 0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

const subtitleStyle: React.CSSProperties = { fontSize: 18, fontWeight: 500, margin: 0 };
const inputStyle: React.CSSProperties = {
  width: "100%", border: `1px solid ${BORDER}`, borderRadius: 10,
  padding: "10px 12px", fontSize: 14, background: CREAM, color: ESPRESSO,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};
const primaryBtn = (loading: boolean): React.CSSProperties => ({
  width: "100%", background: ESPRESSO, color: "#fff", border: "none",
  borderRadius: 999, padding: "12px 18px", fontSize: 14, fontWeight: 500,
  cursor: loading ? "wait" : "pointer", fontFamily: "inherit", marginTop: 4,
  opacity: loading ? 0.7 : 1,
});
const googleBtn: React.CSSProperties = {
  width: "100%", background: WARM_WHITE, color: ESPRESSO,
  border: `1px solid ${BORDER}`, borderRadius: 999, padding: "10px 18px",
  fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
};
const footerText: React.CSSProperties = {
  textAlign: "center", marginTop: 18, fontSize: 13, color: MUTED,
};
const linkStyle: React.CSSProperties = { color: ESPRESSO, fontWeight: 500, textDecoration: "none" };

export const authStyles = { inputStyle, primaryBtn, googleBtn, footerText, linkStyle, subtitleStyle };
export { AuthShell, Divider, GoogleIcon };