// A signed-in user's own posts and saved posts, read from the tables posting actually writes (2026-09-16):
// product_posts (Post tea on a product page), posts (Treatment Talk), surgery_posts (Surgery Talk).
// saved_posts holds saved Treatment Talk posts (post_type 'treatment'); surgery_saves holds saved Surgery Talk posts.
// There is no tea_posts table; nothing reads it.
import { supabase } from "@/integrations/supabase/client";

export type UserPostKind = "product" | "treatment" | "surgery";

export type UserPost = {
  key: string;
  kind: UserPostKind;
  id: string;
  title: string;
  snippet: string | null;
  created_at: string;
  href: string;
  /** Saved posts only: updates the author added since this reader saved or last opened the post (block 7). */
  newUpdates?: number;
};

export const USER_POST_LABEL: Record<UserPostKind, { label: string; bg: string }> = {
  product: { label: "PRODUCT", bg: "#A8001C" },
  treatment: { label: "TREATMENT", bg: "#1C0A00" },
  surgery: { label: "SURGERY", bg: "#5B3FA6" },
};

const firstText = (...values: (string | null | undefined)[]) => values.find((v) => v && v.trim())?.trim() ?? null;

function fromProduct(r: any): UserPost {
  const product = r.products ? [r.products.brand, r.products.name].filter(Boolean).join(" ") : null;
  return {
    key: `product:${r.id}`, kind: "product", id: r.id,
    title: firstText(r.headline, product) ?? "Product post",
    snippet: firstText(r.body), created_at: r.created_at,
    href: r.product_id ? `/product-detail/${r.product_id}` : "/products",
  };
}

function fromTreatment(r: any): UserPost {
  return {
    key: `treatment:${r.id}`, kind: "treatment", id: r.id,
    title: r.treatments?.name ?? "Treatment post",
    snippet: firstText(r.what_happened, r.surprised_me, r.works_for, r.warn_if), created_at: r.created_at,
    href: `/treatment-talk/${r.id}`,
  };
}

function fromSurgery(r: any): UserPost {
  return {
    key: `surgery:${r.id}`, kind: "surgery", id: r.id,
    title: r.surgeries?.name ?? "Surgery post",
    snippet: firstText(r.my_thoughts_vs_reality, r.what_happened, r.surprised_me), created_at: r.created_at,
    href: `/surgery-talk/${r.id}`,
  };
}

const PRODUCT_COLS = "id, product_id, headline, body, created_at, products(name, brand)";
const TREATMENT_COLS = "id, treatment_id, what_happened, surprised_me, works_for, warn_if, created_at, treatments(name)";
const SURGERY_COLS = "id, surgery_id, my_thoughts_vs_reality, what_happened, surprised_me, created_at, surgeries(name)";

const newestFirst = (a: UserPost, b: UserPost) => b.created_at.localeCompare(a.created_at);

// The user's own posts across the three tables, newest first. `error` is true if any of the reads failed.
//
// Treatment and Surgery posts are found through my_talk_post_ids() (SECURITY DEFINER), not by filtering on
// user_id: the client may not read user_id on posts / surgery_posts at all (2026-09-18), because on an anonymous
// post it would name the author. The function returns the signed-in member's own ids and nothing else, so it
// answers for whoever is signed in, not for `userId` (on /skin-profile they are the same person).
export async function fetchUserPosts(userId: string): Promise<{ posts: UserPost[]; error: boolean }> {
  const db = supabase as any;
  const [p, tIds, sIds] = await Promise.all([
    db.from("product_posts").select(PRODUCT_COLS).eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    db.rpc("my_talk_post_ids", { p_post_type: "treatment" }),
    db.rpc("my_talk_post_ids", { p_post_type: "surgery" }),
  ]);
  const treatmentIds = ((tIds.data ?? []) as string[]).filter(Boolean);
  const surgeryIds = ((sIds.data ?? []) as string[]).filter(Boolean);
  const [t, s] = await Promise.all([
    treatmentIds.length ? db.from("posts").select(TREATMENT_COLS).in("id", treatmentIds) : Promise.resolve({ data: [], error: null }),
    surgeryIds.length ? db.from("surgery_posts").select(SURGERY_COLS).in("id", surgeryIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const posts = [
    ...((p.data ?? []) as any[]).map(fromProduct),
    ...((t.data ?? []) as any[]).map(fromTreatment),
    ...((s.data ?? []) as any[]).map(fromSurgery),
  ].sort(newestFirst);
  return { posts, error: !!(p.error || tIds.error || sIds.error || t.error || s.error) };
}

// The user's saved posts: Treatment Talk saves (saved_posts, post_type 'treatment') and Surgery Talk saves (surgery_saves).
// A saved post whose post was deleted is dropped. Other saved_posts types have no table behind them and are not shown.
export async function fetchSavedPosts(userId: string): Promise<{ posts: UserPost[]; error: boolean }> {
  const db = supabase as any;
  const [sp, ss] = await Promise.all([
    db.from("saved_posts").select("post_id, created_at, updates_seen_at").eq("user_id", userId).eq("post_type", "treatment"),
    db.from("surgery_saves").select("post_id, created_at, updates_seen_at").eq("user_id", userId),
  ]);
  const treatmentIds = ((sp.data ?? []) as { post_id: string }[]).map((r) => r.post_id);
  const surgeryIds = ((ss.data ?? []) as { post_id: string }[]).map((r) => r.post_id);
  const allIds = [...treatmentIds, ...surgeryIds];
  const [t, s, u] = await Promise.all([
    treatmentIds.length ? db.from("posts").select(TREATMENT_COLS).in("id", treatmentIds) : Promise.resolve({ data: [], error: null }),
    surgeryIds.length ? db.from("surgery_posts").select(SURGERY_COLS).in("id", surgeryIds) : Promise.resolve({ data: [], error: null }),
    allIds.length ? db.from("post_updates").select("post_id, post_type, created_at").in("post_id", allIds) : Promise.resolve({ data: [], error: null }),
  ]);
  // Block 7: an update newer than the save's updates_seen_at is new to this reader. Opening the post page resets it.
  const seenAt = new Map<string, number>();
  for (const r of (sp.data ?? []) as { post_id: string; updates_seen_at: string }[]) seenAt.set(`treatment:${r.post_id}`, Date.parse(r.updates_seen_at));
  for (const r of (ss.data ?? []) as { post_id: string; updates_seen_at: string }[]) seenAt.set(`surgery:${r.post_id}`, Date.parse(r.updates_seen_at));
  const unseen = new Map<string, number>();
  for (const r of (u.data ?? []) as { post_id: string; post_type: string; created_at: string }[]) {
    const key = `${r.post_type}:${r.post_id}`;
    const seen = seenAt.get(key);
    if (seen != null && Date.parse(r.created_at) > seen) unseen.set(key, (unseen.get(key) ?? 0) + 1);
  }
  const posts = [
    ...((t.data ?? []) as any[]).map(fromTreatment),
    ...((s.data ?? []) as any[]).map(fromSurgery),
  ].map((p) => ({ ...p, newUpdates: unseen.get(p.key) ?? 0 })).sort(newestFirst);
  return { posts, error: !!(sp.error || ss.error || t.error || s.error || u.error) };
}
