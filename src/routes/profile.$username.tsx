import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile/$username")({
  component: PublicProfilePage,
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Skintea` },
      { name: "description", content: `Public skin profile of @${params.username} on Skintea.` },
      { property: "og:title", content: `@${params.username} — Skintea` },
      { property: "og:description", content: `What @${params.username} has done — real treatments, real receipts.` },
    ],
  }),
});

const C = {
  bg: "#FFFCF8",
  ink: "#1C0A00",
  crimson: "#A8001C",
  border: "#E8DDD4",
  muted: "#999999",
};

type PublicLog = {
  id: string;
  treatment_name: string;
  clinic_id: string | null;
  clinic_name: string | null;
  cost: string | null;
};

function PublicProfilePage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ user_id: string; name: string | null; username: string | null } | null>(null);
  const [logs, setLogs] = useState<PublicLog[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [tab, setTab] = useState<"tea" | "shelf" | "gift">("tea");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id,name,username")
        .eq("username", username)
        .maybeSingle();
      if (!alive) return;
      setProfile(prof as any);
      if (prof) {
        const { data: lg } = await supabase
          .from("treatment_logs")
          .select("id,treatment_name,clinic_id,clinic_name,cost")
          .eq("user_id", (prof as any).user_id)
          .eq("is_public", true)
          .order("created_at", { ascending: false });
        if (alive) setLogs((lg as any[]) ?? []);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: mem } = await supabase
          .from("members")
          .select("active")
          .eq("user_id", user.id)
          .eq("active", true)
          .maybeSingle();
        if (alive) setIsMember(!!mem);
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [username]);

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "grid", placeItems: "center", color: C.ink, fontFamily: "system-ui, -apple-system, sans-serif" }}>Loading…</div>
    );
  }
  if (!profile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "grid", placeItems: "center", color: C.ink, fontFamily: "system-ui, -apple-system, sans-serif" }}>Profile not found.</div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: "#FFFFFF", borderBottom: `0.5px solid ${C.border}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FFF5F5", display: "grid", placeItems: "center", fontSize: 28 }}>🌷</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>@{profile.username}</div>
              {profile.name && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{profile.name}</div>}
            </div>
          </div>

          {/* WHAT I'VE DONE strip — public, read-only */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.crimson, marginBottom: 8 }}>What I've Done</div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, filter: isMember ? "none" : "blur(8px)", pointerEvents: isMember ? "auto" : "none" }}>
                {logs.length === 0 && (
                  <div style={{ fontSize: 12, color: C.muted, padding: "16px 0" }}>No public treatments yet.</div>
                )}
                {logs.map(l => (
                  <div key={l.id}
                    onClick={() => l.clinic_id && navigate({ to: "/clinics/$id", params: { id: l.clinic_id } })}
                    style={{ flexShrink: 0, width: 130, background: "#FFFFFF", border: `0.5px solid ${C.border}`, borderRadius: 10, padding: 10, cursor: l.clinic_id ? "pointer" : "default" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{l.treatment_name}</div>
                    {l.clinic_name && <div style={{ fontSize: 11, color: C.crimson, marginTop: 4 }}>{l.clinic_name}</div>}
                    {l.cost && <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>{l.cost}</div>}
                  </div>
                ))}
              </div>
              {!isMember && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(255,252,248,0.6)" }}>
                  <Lock size={20} color={C.crimson} />
                  <button style={{ background: C.crimson, color: "#FFFCF8", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                    Unlock $9.99/mo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs: only Tea / Shelf / Gift */}
          <div style={{ display: "flex", marginTop: 16 }}>
            {[
              { id: "tea" as const, icon: "☕", label: "The Tea" },
              { id: "shelf" as const, icon: "🧴", label: "My Shelf" },
              { id: "gift" as const, icon: "🎁", label: "Gift Me" },
            ].map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: "8px 14px 10px",
                    borderBottom: active ? `2px solid ${C.ink}` : "2px solid transparent",
                    color: active ? C.ink : C.muted, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                  <div style={{ fontSize: 16 }}>{t.icon}</div>
                  <div style={{ fontSize: 10, marginTop: 2, fontWeight: active ? 700 : 500 }}>{t.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 80px", fontSize: 13, color: C.muted }}>
        {tab === "tea" && <div>This user's public posts will appear here.</div>}
        {tab === "shelf" && <div>This user's public shelf will appear here.</div>}
        {tab === "gift" && <div>This user's gift list will appear here.</div>}
      </main>

      <BottomNav />
    </div>
  );
}