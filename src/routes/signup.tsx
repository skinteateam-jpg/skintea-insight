import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AuthShell, Divider, GoogleIcon, Field, authStyles } from "./login";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [
    { title: "Create account — Skintea" },
    { name: "description", content: "Create your Skintea account after completing your Fit Summary." },
    { property: "og:title", content: "Create account — Skintea" },
    { property: "og:description", content: "Create your Skintea account after completing your Fit Summary." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SignupPage,
});

const CRIMSON = "#A8001C";

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [quizComplete, setQuizComplete] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const result = JSON.parse(localStorage.getItem("skintea.quizResult") ?? "null") as { shareSlug?: string } | null;
      setQuizComplete(Boolean(result?.shareSlug));
    } catch {
      setQuizComplete(false);
    }
  }, []);

  if (quizComplete === null) return null;
  if (!quizComplete) {
    return <AuthShell title="Skintea">
      <h2 style={authStyles.subtitleStyle}>Your account starts with your skin</h2>
      <p style={{ color: "#999999", fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>Complete the five questions first. Your Fit Summary will be ready when your account is created.</p>
      <Button asChild className="mt-5 w-full rounded-full"><Link to="/quiz">Take the quiz</Link></Button>
      <p style={authStyles.footerText}>Already have an account? <Link to="/login" style={authStyles.linkStyle}>Sign in</Link></p>
    </AuthShell>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setInfo(null);
    if (password.length < 6) { setErr("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name: name.trim() },
      },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    if (data.session) {
      navigate({ to: "/" });
    } else {
      setInfo("Check your email to confirm your account, then sign in.");
    }
  };

  const google = async () => {
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { setErr(result.error.message ?? "Google sign-in failed"); return; }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return <AuthShell title="Skintea">
    <h2 style={authStyles.subtitleStyle}>Create account</h2>
    <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 18 }}>
      <Field label="Full name">
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} maxLength={100} style={authStyles.inputStyle} />
      </Field>
      <Field label="Email">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={authStyles.inputStyle} />
      </Field>
      <Field label="Password">
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={authStyles.inputStyle} />
      </Field>
      {err && <div style={{ color: CRIMSON, fontSize: 13 }}>{err}</div>}
      {info && <div style={{ color: "#22A06B", fontSize: 13 }}>{info}</div>}
      <button type="submit" disabled={loading} style={authStyles.primaryBtn(loading)}>
        {loading ? "Creating…" : "Create account"}
      </button>
    </form>

    <Divider />

    <button onClick={google} style={authStyles.googleBtn}>
      <GoogleIcon /> Continue with Google
    </button>

    <p style={authStyles.footerText}>
      Already have an account?{" "}
      <Link to="/login" style={authStyles.linkStyle}>Sign in</Link>
    </p>
  </AuthShell>;
}