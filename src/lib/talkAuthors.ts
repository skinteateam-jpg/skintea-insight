/* Who wrote a Talk post — asked of the database, never read off the row. 2026-09-18.
 *
 * Treatment and Surgery posts are named only when the author chose to be (`is_named`, default false:
 * a row nobody chose for stays anonymous). An anonymous post must carry nothing that leads back to a
 * person, so the client never selects `user_id` from `posts` or `surgery_posts`. Instead it asks
 * `talk_post_authors(kind, ids)`, which returns, per post:
 *   isOwn    — whether the reader wrote it (a fact about the reader, so it reveals nobody else)
 *   username / avatarUrl / isDerm — ONLY for a named post. For an anonymous post they are null, and the
 *              function does not even join profiles, so there is nothing to leak by any route.
 * Do not add a fallback that reads user_id off the row or looks a profile up by it; that is the leak
 * this file exists to close.
 */
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PostKind } from "@/lib/postVotes";

export type TalkAuthor = {
  isOwn: boolean;
  isNamed: boolean;
  /** The author's public username. null for an anonymous post, and for a named post whose author has none. */
  username: string | null;
  avatarUrl: string | null;
  /** A recorded Derm verification. Only ever true on a named post. */
  isDerm: boolean;
};

/** What a post looks like before its author has been looked up, or when the lookup failed: nobody. */
export const ANONYMOUS_AUTHOR: TalkAuthor = {
  isOwn: false, isNamed: false, username: null, avatarUrl: null, isDerm: false,
};

export function profileHref(username: string): string {
  return `/profile/${encodeURIComponent(username)}`;
}

export async function fetchTalkAuthors(kind: PostKind, postIds: string[]): Promise<Map<string, TalkAuthor>> {
  const out = new Map<string, TalkAuthor>();
  const ids = Array.from(new Set(postIds.filter(Boolean)));
  if (ids.length === 0) return out;
  const { data, error } = await (supabase as any).rpc("talk_post_authors", {
    p_post_type: kind,
    p_post_ids: ids,
  });
  if (error) {
    console.error("talk_post_authors failed", error);
    return out;
  }
  for (const r of (data ?? []) as any[]) {
    out.set(r.post_id, {
      isOwn: r.is_own === true,
      isNamed: r.is_named === true,
      username: r.author_username ?? null,
      avatarUrl: r.author_avatar_url ?? null,
      isDerm: r.author_is_derm === true,
    });
  }
  return out;
}

/** Authors for every post on screen. Re-read when the list or the reader changes, since isOwn depends on who is reading. */
export function useTalkAuthors(kind: PostKind, postIds: string[], userId: string | null) {
  const [authors, setAuthors] = React.useState<Map<string, TalkAuthor>>(new Map());
  const key = postIds.join(",");
  React.useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) { setAuthors(new Map()); return; }
    fetchTalkAuthors(kind, ids).then((m) => { if (!cancelled) setAuthors(m); });
    return () => { cancelled = true; };
  }, [kind, key, userId]);
  return { authors };
}

/**
 * The signed-in member's own username, for the composer's "Post as @username". null until it loads and
 * when they have not set one — in which case they cannot post named, and the composer says so.
 */
export function useMyUsername(userId: string | null): { username: string | null; loaded: boolean } {
  const [username, setUsername] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    if (!userId) { setUsername(null); setLoaded(true); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles").select("username").eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      const u = (data?.username ?? "").trim();
      setUsername(u ? u : null);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [userId]);
  return { username, loaded };
}
