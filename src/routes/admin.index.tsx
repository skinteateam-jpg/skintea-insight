import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Skintea Admin" }],
  }),
  component: AdminDashboard,
});

const ESPRESSO = "#1C0A00";
const CREAM = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) navigate({ to: "/" });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!profile?.is_admin) {
        navigate({ to: "/" });
        return;
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "DM Sans, sans-serif" }} />
    );
  }

  const links = [
    { label: "Treatment Types", to: "/admin/treatments", enabled: true },
    { label: "Posts", to: "#", enabled: false },
    { label: "Users", to: "#", enabled: false },
    { label: "Members", to: "#", enabled: false },
  ];

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "DM Sans, sans-serif", color: ESPRESSO }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 36, fontWeight: 600, margin: 0 }}>
          Skintea Admin
        </h1>
        <p style={{ color: MUTED, fontSize: 14, marginTop: 8 }}>Manage your platform.</p>

        <div style={{ marginTop: 32, display: "grid", gap: 12 }}>
          {links.map((l) =>
            l.enabled ? (
              <Link
                key={l.label}
                to={l.to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#FFFCF8",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: "18px 20px",
                  textDecoration: "none",
                  color: ESPRESSO,
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                <span>{l.label}</span>
                <span style={{ color: MUTED }}>→</span>
              </Link>
            ) : (
              <div
                key={l.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#FFFCF8",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: "18px 20px",
                  color: MUTED,
                  fontSize: 15,
                  fontWeight: 500,
                  opacity: 0.55,
                  cursor: "not-allowed",
                }}
              >
                <span>{l.label}</span>
                <span style={{ fontSize: 12 }}>coming soon</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}