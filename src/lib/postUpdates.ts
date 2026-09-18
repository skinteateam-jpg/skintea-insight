/* The updatable timeline on a Treatment or Surgery Talk post (block 7, 2026-09-18).
 *
 * public.post_updates holds one row per update: {id, post_id, post_type, label, body, created_at}. Anyone reads it;
 * user_id is not readable by the client. Only the post's own author can add one (trigger enforce_post_update_author
 * checks the post's author against auth.uid()) and only they can delete one (RLS). A deleted post takes its updates
 * with it (trigger delete_post_updates_on_post_delete).
 *
 * "Told when an update lands" is in-app only, no email: each save carries `updates_seen_at` (saved_posts for
 * Treatment Talk, surgery_saves for Surgery Talk). An update newer than it is new to that saver. Opening the post's
 * page moves it to now.
 */
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export type UpdateKind = "treatment" | "surgery";

export type PostUpdate = { id: string; post_id: string; label: string | null; body: string; created_at: string };

export type UpdateSummary = { count: number; lastAt: string | null; unseen: number };

export const UPDATE_LABEL_MAX = 40;
export const UPDATE_BODY_MAX = 2000;

const SAVE_TABLE: Record<UpdateKind, string> = { treatment: "saved_posts", surgery: "surgery_saves" };

export function postDetailHref(kind: UpdateKind, postId: string): string {
  return kind === "treatment" ? `/treatment-talk/${postId}` : `/surgery-talk/${postId}`;
}

export async function fetchPostUpdates(kind: UpdateKind, postId: string): Promise<{ updates: PostUpdate[]; error: boolean }> {
  const { data, error } = await (supabase as any)
    .from("post_updates")
    .select("id, post_id, label, body, created_at")
    .eq("post_type", kind)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  return { updates: (data ?? []) as PostUpdate[], error: !!error };
}

export async function addPostUpdate(kind: UpdateKind, postId: string, userId: string, label: string, body: string) {
  const l = label.trim();
  return (supabase as any).from("post_updates").insert({
    post_id: postId, post_type: kind, user_id: userId, label: l ? l : null, body: body.trim(),
  });
}

// By id alone: the RLS policy (auth.uid() = user_id) restricts this to the author's own update.
export async function deletePostUpdate(updateId: string) {
  return (supabase as any).from("post_updates").delete({ count: "exact" }).eq("id", updateId);
}

// The signed-in saver has now seen every update on this post. A no-op when they have not saved it.
export async function markUpdatesSeen(kind: UpdateKind, postId: string, userId: string) {
  return (supabase as any)
    .from(SAVE_TABLE[kind])
    .update({ updates_seen_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("post_id", postId);
}

/* Count, latest date, and how many are new to the signed-in saver, for every post on screen. One read of
   post_updates and, when signed in, one of the save table. `unseen` is 0 for a post the reader has not saved. */
export async function fetchUpdateSummaries(kind: UpdateKind, postIds: string[], userId: string | null): Promise<Map<string, UpdateSummary>> {
  const out = new Map<string, UpdateSummary>();
  if (postIds.length === 0) return out;
  const db = supabase as any;
  const [u, s] = await Promise.all([
    db.from("post_updates").select("post_id, created_at").eq("post_type", kind).in("post_id", postIds),
    userId
      ? db.from(SAVE_TABLE[kind]).select("post_id, updates_seen_at").eq("user_id", userId).in("post_id", postIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const seen = new Map<string, string>(((s.data ?? []) as { post_id: string; updates_seen_at: string }[]).map((r) => [r.post_id, r.updates_seen_at]));
  for (const r of (u.data ?? []) as { post_id: string; created_at: string }[]) {
    const cur = out.get(r.post_id) ?? { count: 0, lastAt: null, unseen: 0 };
    cur.count += 1;
    if (!cur.lastAt || r.created_at > cur.lastAt) cur.lastAt = r.created_at;
    const seenAt = seen.get(r.post_id);
    if (seenAt && Date.parse(r.created_at) > Date.parse(seenAt)) cur.unseen += 1;
    out.set(r.post_id, cur);
  }
  return out;
}

export function useUpdateSummaries(kind: UpdateKind, postIds: string[], userId: string | null) {
  const [summaries, setSummaries] = React.useState<Map<string, UpdateSummary>>(new Map());
  const key = postIds.join(",");
  React.useEffect(() => {
    let alive = true;
    fetchUpdateSummaries(kind, postIds, userId).then((m) => { if (alive) setSummaries(m); }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, key, userId]);
  return summaries;
}

export function formatUpdateDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
