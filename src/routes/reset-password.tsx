import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field, authStyles } from "./login";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Skintea" }] }),
  component: ResetPasswordPage,
});

const CRIMSON = "#A8001C";
const MUTED = "#999999";

// Set when Supabase fires PASSWORD_RECOVERY in this tab, so a reload of this page keeps the new-password form while
// the recovery session is still present. Cleared once the password is updated.
const RECOVERY_FLAG = "skintea_password_recovery";

function readFlag(): boolean {
  try { return sessionStorage.getItem(RECOVERY_FLAG) === "1"; } catch { return false; }
}
function writeFlag(on: boolean) {
  try {
    if (on) sessionStorage.setItem(RECOVERY_FLAG, "1");
    else sessionStorage.removeItem(RECOVERY_FLAG);
  } catch {}
}

// An expired or invalid link comes back with error_description in the hash (implicit flow) or the query (PKCE flow).
function linkErrorFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const raw = hash.get("error_description") ?? query.get("error_description");
  return raw ? raw.replace(/\+/g, " ") : null;
}

function ResetPasswordPage() {
  const [mode, setMode] = useState<"request" | "recovery">("request");
  const [linkError, setLinkError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [requestErr, setRequestErr] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [updateErr, setUpdateErr] = useState<string | null>(null);

  useEffect(() => {
    setLinkError(linkErrorFromUrl());

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        writeFlag(true);
        setLinkError(null);
        setMode("recovery");
      } else if (event === "SIGNED_OUT") {
        writeFlag(false);
        setMode("request");
      } else if (session && readFlag()) {
        setMode("recovery");
      }
    });

    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (alive && data.session && readFlag()) setMode("recovery");
    })();

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestErr(null); setSent(false); setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    if (error) { setRequestErr(error.message); return; }
    setSent(true);
  };

  const setNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateErr(null);
    if (password.length < 6) { setUpdateErr("Password must be at least 6 characters"); return; }
    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password });
    setUpdating(false);
    if (error) { setUpdateErr(error.message); return; }
    writeFlag(false);
    setUpdated(true);
    setPassword("");
  };

  if (mode === "recovery") {
    return <AuthShell title="Skintea">
      <h2 style={authStyles.subtitleStyle}>Set a new password</h2>
      {updated ? (
        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 14 }}>Password updated.</div>
          <Link to="/skin-profile" style={authStyles.linkStyle}>Go to your skin profile</Link>
        </div>
      ) : (
        <form onSubmit={setNewPassword} style={{ display: "grid", gap: 12, marginTop: 18 }}>
          <Field label="New password (min 6 characters)">
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={authStyles.inputStyle} />
          </Field>
          {updateErr && <div style={{ color: CRIMSON, fontSize: 13 }}>{updateErr}</div>}
          <button type="submit" disabled={updating} style={authStyles.primaryBtn(updating)}>
            {updating ? "Saving…" : "Set new password"}
          </button>
        </form>
      )}
    </AuthShell>;
  }

  return <AuthShell title="Skintea">
    <h2 style={authStyles.subtitleStyle}>Reset password</h2>
    {linkError && (
      <div style={{ marginTop: 14, color: CRIMSON, fontSize: 13, lineHeight: 1.5 }}>
        This reset link didn't work: {linkError}. Enter your email below to get a new link.
      </div>
    )}
    <form onSubmit={requestLink} style={{ display: "grid", gap: 12, marginTop: 18 }}>
      <Field label="Email">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={authStyles.inputStyle} />
      </Field>
      {requestErr && <div style={{ color: CRIMSON, fontSize: 13 }}>{requestErr}</div>}
      {sent && (
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          If an account exists for that email, we've sent a link to reset your password.
        </div>
      )}
      <button type="submit" disabled={sending} style={authStyles.primaryBtn(sending)}>
        {sending ? "Sending…" : "Send reset link"}
      </button>
    </form>

    <p style={authStyles.footerText}>
      Remembered it?{" "}
      <Link to="/login" style={authStyles.linkStyle}>Sign in</Link>
    </p>
    <p style={{ ...authStyles.footerText, marginTop: 6, fontSize: 12, color: MUTED }}>
      The link opens this page, where you can choose a new password.
    </p>
  </AuthShell>;
}
