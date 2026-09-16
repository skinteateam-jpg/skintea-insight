import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, X, User } from "lucide-react";
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

type TeaPost = {
  id: string;
  emoji: string | null;
  bg_color: string | null;
  caption: string | null;
  created_at: string;
  likes_count: number | null;
};
type ShelfItem = {
  id: string;
  category: string;
  product_name: string;
  brand: string | null;
  emoji: string | null;
  is_top_pick: boolean;
};
type WishItem = {
  id: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  emoji: string | null;
  affiliate_url: string | null;
  affiliate_store: string | null;
  type: string;
};

function PublicProfilePage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ user_id: string; name: string | null; username: string | null } | null>(null);
  const [logs, setLogs] = useState<PublicLog[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [tab, setTab] = useState<"tea" | "shelf" | "gift">("tea");
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<TeaPost[]>([]);
  const [openPost, setOpenPost] = useState<TeaPost | null>(null);
  const [shelfItems, setShelfItems] = useState<ShelfItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishItem[]>([]);
  // "missing" = the tea_posts table does not exist yet (posting is not built), "error" = a real failure.
  const [postsError, setPostsError] = useState<false | "missing" | "error">(false);
  const [shelfError, setShelfError] = useState(false);
  const [wishlistError, setWishlistError] = useState(false);

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

  // Public tabs — fetched after profile is known
  useEffect(() => {
    if (!profile?.user_id) return;
    const uid = profile.user_id;
    let alive = true;
    // Posts are not read here (see the Tea tab below). There is no tea_posts table.
    (async () => {
      // This is a public page: every shelf query on it is filtered to is_public. There is no fallback query —
      // the previous one retried WITHOUT that filter, so any error on the first query published private items.
      // An error shows an error state and nothing else.
      try {
        const { data, error } = await supabase
          .from("shelf_items" as any)
          .select("id,category,product_name,brand,emoji,is_top_pick")
          .eq("user_id", uid)
          .eq("is_public", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (alive) { setShelfItems(((data as any[]) ?? []) as ShelfItem[]); setShelfError(false); }
      } catch { if (alive) { setShelfItems([]); setShelfError(true); } }
    })();
    (async () => {
      try {
        const { data, error } = await supabase
          .from("gift_wishlist" as any)
          .select("id,product_name,brand,category,emoji,affiliate_url,affiliate_store,type")
          .eq("user_id", uid)
          .eq("is_public", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (alive) { setWishlistItems(((data as any[]) ?? []) as WishItem[]); setWishlistError(false); }
      } catch { if (alive) { setWishlistItems([]); setWishlistError(true); } }
    })();
    return () => { alive = false; };
  }, [profile?.user_id]);

  // Locked only when there is something behind the lock.
  const locked = !isMember && logs.length > 0;

  const shelfGrouped = useMemo(() => {
    const map = new Map<string, ShelfItem[]>();
    for (const it of shelfItems) {
      const list = map.get(it.category) ?? [];
      list.push(it);
      map.set(it.category, list);
    }
    return Array.from(map.entries());
  }, [shelfItems]);

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
            {/* Neutral placeholder: this profile has no avatar, and a flower would read as something they chose. */}
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F2EEE9", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <User size={26} color={C.muted} aria-hidden />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>@{profile.username}</div>
              {profile.name && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{profile.name}</div>}
            </div>
          </div>

          {/* WHAT I'VE DONE strip — public, read-only */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.crimson, marginBottom: 8 }}>What I've Done</div>
            {/* Only lock a section that actually hides something. With no public treatments there is nothing behind
                the blur, so the empty state is shown plainly instead of asking the visitor to unlock nothing. */}
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, filter: locked ? "blur(8px)" : "none", pointerEvents: locked ? "none" : "auto" }}>
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
              {locked && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(255,252,248,0.6)", textAlign: "center", padding: "0 12px" }}>
                  <Lock size={20} color={C.crimson} />
                  {/* No price: there is no paid tier to quote. Nothing here is clickable until membership exists. */}
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.crimson }}>Members only</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Memberships aren't open yet.</div>
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

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 80px", fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}>
        {tab === "tea" && (
          // A public profile lists no posts (2026-09-16). Treatment Talk posts are published without a name and must never be
          // traceable to a profile; product and surgery posts carry no per-post choice to appear here. The tab stays.
          true ? (
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "32px 12px", lineHeight: 1.5 }}>
              Posts aren't shown on profiles. Treatment Talk posts are published without a name, so they are never linked to a person.
            </div>
          ) : postsError ? (
            <div style={{ fontSize: 13, color: C.crimson, textAlign: "center", padding: "32px 12px", fontWeight: 600 }}>Couldn't load posts. Reload the page to try again.</div>
          ) : posts.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "32px 12px" }}>No posts yet.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {posts.map(p => (
                <button key={p.id} onClick={() => setOpenPost(p)}
                  style={{ aspectRatio: "1", background: p.bg_color ?? "#F5F0EB", border: "none", cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}>
                  {/* The post's own emoji only — no stand-in when the post has none. */}
                  {p.emoji && <span style={{ fontSize: 40 }}>{p.emoji}</span>}
                </button>
              ))}
            </div>
          )
        )}

        {tab === "shelf" && (
          shelfError ? (
            <div style={{ fontSize: 13, color: C.crimson, textAlign: "center", padding: "32px 12px", fontWeight: 600 }}>Couldn't load this shelf. Reload the page to try again.</div>
          ) : shelfItems.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "32px 12px" }}>Shelf is empty.</div>
          ) : (
            <div>
              {shelfGrouped.map(([cat, items]) => (
                <div key={cat} style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{cat}</div>
                  <div style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -16px", padding: "0 16px 8px" }}>
                    {items.map(p => (
                      <div key={p.id} style={{ flexShrink: 0, width: 120, background: "#FFFFFF", border: `0.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden", position: "relative" }}>
                        {p.is_top_pick && <div style={{ position: "absolute", top: 6, left: 6, background: "#C9A227", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 5px", borderRadius: 3, letterSpacing: 0.5 }}>TOP PICK</div>}
                        <div style={{ aspectRatio: "1", background: "#F5F0EB", display: "grid", placeItems: "center", fontSize: 36 }}>{p.emoji ?? ""}</div>
                        <div style={{ padding: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, lineHeight: 1.2, minHeight: 26 }}>{p.product_name}</div>
                          {p.brand && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{p.brand}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "gift" && (
          <>
            {/* The banner invites the visitor to pick from the wishlist, so it only renders when there is one.
                Share is kept but disabled: nothing shares a wishlist yet. */}
            {wishlistItems.length > 0 && (
              <div style={{ background: C.ink, borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.bg, marginBottom: 3 }}>🎁 Gift this person</div>
                  <div style={{ fontSize: 10, color: "rgba(255,252,248,0.55)", lineHeight: 1.4 }}>Pick something from their wishlist — they'll love it.</div>
                </div>
                <button type="button" disabled title="Sharing this wishlist isn't available yet" style={{ background: "transparent", color: "rgba(255,252,248,0.5)", border: "1px solid rgba(255,252,248,0.3)", borderRadius: 99, padding: "8px 14px", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap", cursor: "not-allowed" }}>Share · not yet</button>
              </div>
            )}
            {wishlistError ? (
              <div style={{ fontSize: 13, color: C.crimson, textAlign: "center", padding: "32px 12px", fontWeight: 600 }}>Couldn't load this wishlist. Reload the page to try again.</div>
            ) : wishlistItems.length === 0 ? (
              <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "32px 12px" }}>Nothing on wishlist yet.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {wishlistItems.map(item => (
                  <div key={item.id} style={{ background: "#fff", border: `0.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ height: 75, background: "#FFFCF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, borderBottom: `0.5px solid ${C.border}` }}>
                      {item.emoji ?? ""}
                    </div>
                    <div style={{ padding: "7px 8px 8px" }}>
                      {item.category && <div style={{ fontSize: 10, color: C.crimson, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.category}</div>}
                      {item.brand && <div style={{ fontSize: 10, color: C.muted }}>{item.brand}</div>}
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 5 }}>{item.product_name}</div>
                      {/* No link, no button: a black "Buy →" box that cannot be clicked is worse than nothing. */}
                      {item.affiliate_url && (
                        <a href={item.affiliate_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: C.ink, color: C.bg, borderRadius: 6, padding: 6, fontSize: 10, fontWeight: 700, textAlign: "center", textDecoration: "none" }}>
                          Buy{item.affiliate_store ? ` → ${item.affiliate_store}` : " →"}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {openPost && (
        <div onClick={() => setOpenPost(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", background: C.bg, borderRadius: "16px 16px 0 0", padding: "20px 18px 32px", position: "relative", fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}>
            <div style={{ width: 40, height: 4, background: C.border, borderRadius: 999, margin: "0 auto 14px" }} />
            <button onClick={() => setOpenPost(null)}
              style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: "50%", background: "#fff", border: `1px solid ${C.border}`, display: "grid", placeItems: "center", cursor: "pointer" }}>
              <X size={14} />
            </button>
            <div style={{ aspectRatio: "1", background: openPost.bg_color ?? "#F5F0EB", display: "grid", placeItems: "center", fontSize: 120, borderRadius: 12, marginBottom: 16 }}>{openPost.emoji ?? ""}</div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {new Date(openPost.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
            {openPost.caption && <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5, color: C.ink }}>{openPost.caption}</p>}
            {/* An unknown count is not zero, so nothing renders when it is null. */}
            {openPost.likes_count != null && <div style={{ fontSize: 13, color: C.ink, marginTop: 8 }}>♥ {openPost.likes_count}</div>}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}