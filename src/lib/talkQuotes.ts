/* Quote tea: what a quoting post shows of the post it quotes. 2026-09-18.
 *
 * A quote is a new post that carries `quoted_post_id`, pointing at a post in the SAME table (a Treatment post
 * quotes a Treatment post). The database guard `enforce_quoted_post_exists` checks the quoted post exists when the
 * quote is written. The quoted post may be deleted later by its author; the id stays, and the box says so.
 *
 * Everything about the quoted post's author comes from talk_post_authors(), exactly as on its own card, so an
 * anonymous post stays anonymous inside a quote. Its split comes from post_vote_split(), so under 20 votes there is
 * no percentage to show here either. No user_id is selected.
 */
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchVoteSplits, emptySplit, type PostKind, type VoteSplit } from "@/lib/postVotes";
import { ANONYMOUS_AUTHOR, fetchTalkAuthors, type TalkAuthor } from "@/lib/talkAuthors";

export type QuotedPost = {
  id: string;
  /** The quoted post's own text, whole. The box clamps it to two lines; nothing is rewritten. */
  body: string;
  skinType: string | null;
  createdAt: string | null;
  author: TalkAuthor;
  split: VoteSplit;
};

const TABLE: Record<PostKind, string> = { product: "product_posts", treatment: "posts", surgery: "surgery_posts" };

// user_id is deliberately absent from every list.
const COLS: Record<PostKind, string> = {
  product: "id, headline, body, skin_type, created_at",
  treatment: "id, what_happened, skin_type, created_at",
  surgery: "id, what_happened, my_thoughts_vs_reality, skin_type, created_at",
};

function bodyOf(kind: PostKind, r: any): string {
  if (kind === "product") return [r.headline, r.body].filter((v) => v && String(v).trim()).join("\n");
  if (kind === "surgery") return String(r.what_happened || r.my_thoughts_vs_reality || "");
  return String(r.what_happened ?? "");
}

/**
 * The quoted posts for a set of ids. An id with no row in the map was deleted (the database guaranteed it existed
 * when the quote was written).
 */
export async function fetchQuotedPosts(kind: PostKind, ids: string[]): Promise<Map<string, QuotedPost>> {
  const out = new Map<string, QuotedPost>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return out;
  const [rows, authors, splits] = await Promise.all([
    (supabase as any).from(TABLE[kind]).select(COLS[kind]).in("id", unique),
    fetchTalkAuthors(kind, unique),
    fetchVoteSplits(kind, unique),
  ]);
  if (rows.error) {
    console.error("quoted posts fetch failed", rows.error);
    return out;
  }
  for (const r of (rows.data ?? []) as any[]) {
    out.set(r.id, {
      id: r.id,
      body: bodyOf(kind, r),
      skinType: r.skin_type ?? null,
      createdAt: r.created_at ?? null,
      author: authors.get(r.id) ?? ANONYMOUS_AUTHOR,
      split: splits.get(r.id) ?? emptySplit(r.id),
    });
  }
  return out;
}

/** Quoted posts for every quote on screen. `loaded` distinguishes "still loading" from "deleted". */
export function useQuotedPosts(kind: PostKind, ids: string[], userId: string | null) {
  const [quoted, setQuoted] = React.useState<Map<string, QuotedPost>>(new Map());
  const [loaded, setLoaded] = React.useState(false);
  const key = Array.from(new Set(ids.filter(Boolean))).sort().join(",");
  React.useEffect(() => {
    let cancelled = false;
    const list = key ? key.split(",") : [];
    if (list.length === 0) { setQuoted(new Map()); setLoaded(true); return; }
    setLoaded(false);
    fetchQuotedPosts(kind, list).then((m) => { if (!cancelled) { setQuoted(m); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [kind, key, userId]);
  return { quoted, loaded };
}
