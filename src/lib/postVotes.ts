/* Agreement voting, 2026-09-18.
 *
 * Readers vote "Same for me" / "Not for me" on a post. This is NOT the product page's Majority and
 * Minority figure: that one aggregates tagged social posts, this one is people voting on Skintea.
 * Every card that shows a split says so.
 *
 * WHERE THE FLOORS LIVE. The 20-vote and 5-vote floors are enforced inside the SQL function
 * `post_vote_split`, not here. Under 20 votes the function returns the count and nothing else —
 * `same_pct`, `not_pct` and `breakdown` come back null because the division is never performed. The
 * raw rows are not readable either: `post_votes` only lets a voter SELECT their own row, so a
 * three-vote "67%" cannot be reconstructed from a network response or read out of DevTools. Do not
 * add a client-side fallback that counts rows and divides; that would undo both.
 */
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export type PostKind = "product" | "treatment" | "surgery";
export type VoteValue = "same" | "not";

/** Display copy only. The enforcing copy of these numbers is in post_vote_split(). */
export const VOTE_MIN_SPLIT = 20;
export const VOTE_MIN_SKIN = 5;

export type SkinBreakdown = {
  skin_type: string;
  enough: boolean;
  /** null under the per-skin-type floor: no count is returned, not merely hidden. */
  n: number | null;
  /** null under the per-skin-type floor. */
  same_pct: number | null;
};

export type VoteSplit = {
  postId: string;
  total: number;
  /** true only at or above VOTE_MIN_SPLIT. When false every figure below is null. */
  isOpen: boolean;
  samePct: number | null;
  notPct: number | null;
  breakdown: SkinBreakdown[] | null;
};

export function emptySplit(postId: string): VoteSplit {
  return { postId, total: 0, isOpen: false, samePct: null, notPct: null, breakdown: null };
}

/** One RPC for a whole feed. Returns a map keyed by post id; a post with no row gets an empty split. */
export async function fetchVoteSplits(kind: PostKind, postIds: string[]): Promise<Map<string, VoteSplit>> {
  const out = new Map<string, VoteSplit>();
  const ids = Array.from(new Set(postIds.filter(Boolean)));
  if (ids.length === 0) return out;
  const { data, error } = await (supabase as any).rpc("post_vote_split", {
    p_post_type: kind,
    p_post_ids: ids,
  });
  if (error) {
    console.error("post_vote_split failed", error);
    return out;
  }
  for (const row of (data ?? []) as any[]) {
    out.set(row.post_id, {
      postId: row.post_id,
      total: Number(row.total) || 0,
      isOpen: row.is_open === true,
      samePct: row.same_pct == null ? null : Number(row.same_pct),
      notPct: row.not_pct == null ? null : Number(row.not_pct),
      breakdown: Array.isArray(row.breakdown) ? (row.breakdown as SkinBreakdown[]) : null,
    });
  }
  return out;
}

/** The viewer's own votes. RLS returns their rows and nobody else's. */
export async function fetchMyVotes(kind: PostKind, postIds: string[], userId: string): Promise<Map<string, VoteValue>> {
  const out = new Map<string, VoteValue>();
  const ids = Array.from(new Set(postIds.filter(Boolean)));
  if (ids.length === 0) return out;
  const { data, error } = await (supabase as any)
    .from("post_votes")
    .select("post_id, vote")
    .eq("post_type", kind)
    .eq("user_id", userId)
    .in("post_id", ids);
  if (error) {
    console.error("own votes fetch failed", error);
    return out;
  }
  for (const r of (data ?? []) as { post_id: string; vote: VoteValue }[]) out.set(r.post_id, r.vote);
  return out;
}

/**
 * Cast or change a vote. One row per (post, voter) — the unique constraint holds that, and the
 * guard trigger sets skin_type from the voter's own profile, so nothing here sends one.
 */
export async function castVote(kind: PostKind, postId: string, userId: string, vote: VoteValue) {
  return (supabase as any)
    .from("post_votes")
    .upsert({ post_id: postId, post_type: kind, user_id: userId, vote }, { onConflict: "post_id,user_id" });
}

/** Take a vote back. */
export async function clearVote(kind: PostKind, postId: string, userId: string) {
  return (supabase as any)
    .from("post_votes").delete().eq("post_id", postId).eq("post_type", kind).eq("user_id", userId);
}

/**
 * Feed-level state: one split RPC and one own-votes read for every post on screen, then optimistic
 * re-reads of the single post that changed.
 */
export function usePostVotes(kind: PostKind, postIds: string[], userId: string | null) {
  const [splits, setSplits] = React.useState<Map<string, VoteSplit>>(new Map());
  const [myVotes, setMyVotes] = React.useState<Map<string, VoteValue>>(new Map());
  // Scoped to the post that failed, so one card's error never appears on every other card.
  const [error, setError] = React.useState<{ postId: string; message: string } | null>(null);

  // A stable key so the effect does not re-run on every render of the same list.
  const key = postIds.join(",");

  React.useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) { setSplits(new Map()); setMyVotes(new Map()); return; }
    (async () => {
      const s = await fetchVoteSplits(kind, ids);
      if (!cancelled) setSplits(s);
      if (userId) {
        const m = await fetchMyVotes(kind, ids, userId);
        if (!cancelled) setMyVotes(m);
      } else if (!cancelled) {
        setMyVotes(new Map());
      }
    })();
    return () => { cancelled = true; };
  }, [kind, key, userId]);

  const vote = React.useCallback(async (postId: string, next: VoteValue) => {
    if (!userId) return;
    setError(null);
    const previous = myVotes.get(postId);
    // Tapping the vote you already hold takes it back.
    const res = previous === next
      ? await clearVote(kind, postId, userId)
      : await castVote(kind, postId, userId, next);
    if (res?.error) {
      setError({ postId, message: res.error.message ?? "Couldn't record your vote." });
      return;
    }
    setMyVotes((prev) => {
      const m = new Map(prev);
      if (previous === next) m.delete(postId); else m.set(postId, next);
      return m;
    });
    // Re-read the split from the database rather than adjusting a number locally: the floors are
    // the function's to apply, and a local count would be a second, unguarded source of truth.
    const fresh = await fetchVoteSplits(kind, [postId]);
    const got = fresh.get(postId);
    if (got) setSplits((prev) => new Map(prev).set(postId, got));
  }, [kind, userId, myVotes]);

  return { splits, myVotes, vote, error };
}
