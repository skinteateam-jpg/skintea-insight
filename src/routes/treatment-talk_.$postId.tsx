/* One Treatment Talk post on its own page, with its updates timeline (block 7, 2026-09-18).
 *
 * `treatment-talk_` keeps this page out of the feed's layout: /treatment-talk/$postId renders on its own.
 * The card is the feed's own PostCard. Author, split and quote come from the same RPCs as the feed, and
 * user_id is never selected. A saver who opens the page has seen every update so far (updates_seen_at). */
import * as React from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { CAPTION, CARD_BORDER, CRIMSON, ESPRESSO, SANS, WARM_WHITE } from "@/components/TalkPostCard";
import TalkQuoteBox from "@/components/TalkQuoteBox";
import { TalkUpdateTimeline } from "@/components/TalkUpdateTimeline";
import { emptySplit, usePostVotes } from "@/lib/postVotes";
import { ANONYMOUS_AUTHOR, useTalkAuthors } from "@/lib/talkAuthors";
import { useQuotedPosts } from "@/lib/talkQuotes";
import { markUpdatesSeen } from "@/lib/postUpdates";
import { Composer, PostCard, TREATMENT_POST_COLS, useTreatments, useUserId, type PostRow } from "./treatment-talk";

export const Route = createFileRoute("/treatment-talk_/$postId")({
  head: () => ({ meta: [{ title: "Treatment Talk post — Skintea" }] }),
  component: TreatmentPostPage,
});

function TreatmentPostPage() {
  const { postId } = useParams({ from: "/treatment-talk_/$postId" });
  const navigate = useNavigate();
  const userId = useUserId();
  const { treatments } = useTreatments();
  const [post, setPost] = React.useState<PostRow | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "missing" | "failed">("loading");
  const [saved, setSaved] = React.useState(false);
  const [rowError, setRowError] = React.useState<string | null>(null);
  const [composerOpen, setComposerOpen] = React.useState(false);

  // Hooks run before any early return.
  const ids = React.useMemo(() => (post ? [post.id] : []), [post?.id]);
  const { splits, myVotes, vote, error: voteError } = usePostVotes("treatment", ids, userId);
  const { authors } = useTalkAuthors("treatment", ids, userId);
  const { quoted, loaded: quotedLoaded } = useQuotedPosts("treatment", post?.quoted_post_id ? [post.quoted_post_id] : [], userId);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("posts").select(TREATMENT_POST_COLS).eq("id", postId).maybeSingle();
      if (cancelled) return;
      if (error) { setState("failed"); return; }
      if (!data) { setState("missing"); return; }
      const row = data as unknown as PostRow;
      setPost({ ...row, tags: row.tags ?? [] });
      setState("ready");
    })();
    return () => { cancelled = true; };
  }, [postId]);

  // Saved state, and "seen": opening the page clears the New mark for a saver.
  React.useEffect(() => {
    if (!userId || state !== "ready") { setSaved(false); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase.from("saved_posts").select("post_id").eq("user_id", userId).eq("post_id", postId).maybeSingle();
      if (!alive) return;
      setSaved(!!data);
      if (data) await markUpdatesSeen("treatment", postId, userId);
    })();
    return () => { alive = false; };
  }, [userId, postId, state]);

  async function toggleSave() {
    if (!userId) { navigate({ to: "/login" }).catch(() => {}); return; }
    setRowError(null);
    const { error } = saved
      ? await supabase.from("saved_posts").delete().eq("user_id", userId).eq("post_id", postId)
      : await supabase.from("saved_posts").insert({ user_id: userId, post_id: postId, post_type: "treatment" });
    if (error) { setRowError(saved ? "Couldn't remove from saved. Try again." : "Couldn't save. Try again."); return; }
    setSaved(!saved);
  }

  async function deletePost() {
    if (!window.confirm("Delete this post? It is removed for everyone, with its updates, and cannot be undone.")) return;
    setRowError(null);
    // By id alone: the RLS policy (auth.uid() = user_id) restricts this to the author's own row.
    const { error, count } = await supabase.from("posts").delete({ count: "exact" }).eq("id", postId);
    if (error || count === 0) { setRowError(error ? `Couldn't delete: ${error.message}` : "Couldn't delete this post."); return; }
    navigate({ to: "/treatment-talk" }).catch(() => {});
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else navigate({ to: "/treatment-talk" }).catch(() => {});
  }

  const notice = (text: string) => (
    <div style={{ background: "#fff", border: CARD_BORDER, borderRadius: 12, padding: 24, textAlign: "center", fontSize: 13, color: CAPTION }}>{text}</div>
  );

  const author = post ? authors.get(post.id) ?? ANONYMOUS_AUTHOR : ANONYMOUS_AUTHOR;
  const nameById = new Map(treatments.map((t) => [t.id, t.name]));

  return (
    <div style={{ background: WARM_WHITE, fontFamily: SANS, minHeight: "100vh", paddingBottom: 96 }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: WARM_WHITE, position: "sticky", top: 0, zIndex: 10 }}>
          <button type="button" onClick={goBack}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", minHeight: 44, padding: "0 8px", fontFamily: SANS }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ESPRESSO} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 500, color: ESPRESSO }}>Treatment Talk</span>
          </button>
        </div>
        <div style={{ padding: "0 16px" }}>
          {state === "loading" ? notice("Loading…")
            : state === "failed" ? notice("Couldn't load this post. Reload to try again.")
            : state === "missing" || !post ? notice("This post isn't here. It may have been deleted by its author.")
            : (
              <>
                {rowError && <p style={{ fontSize: 13, color: CRIMSON, marginBottom: 10 }}>{rowError}</p>}
                <PostCard
                  post={post}
                  treatmentName={post.treatment_id ? nameById.get(post.treatment_id) ?? null : null}
                  saved={saved}
                  onToggleSave={() => void toggleSave()}
                  isOwn={author.isOwn}
                  author={author}
                  onDelete={() => void deletePost()}
                  split={splits.get(post.id) ?? emptySplit(post.id)}
                  myVote={myVotes.get(post.id) ?? null}
                  canVote={!!userId && !author.isOwn}
                  onVote={(v) => void vote(post.id, v)}
                  onSignIn={userId ? undefined : () => { navigate({ to: "/login" }).catch(() => {}); }}
                  voteError={voteError?.postId === post.id ? voteError.message : null}
                  onQuote={() => { if (!userId) { navigate({ to: "/login" }).catch(() => {}); return; } setComposerOpen(true); }}
                  quotedBox={post.quoted_post_id
                    ? <TalkQuoteBox quoted={quoted.get(post.quoted_post_id) ?? null} loaded={quotedLoaded} />
                    : null}
                />
                <TalkUpdateTimeline kind="treatment" postId={post.id} postCreatedAt={post.created_at} isOwn={author.isOwn} userId={userId} />
              </>
            )}
        </div>
      </div>
      <BottomNav />
      {composerOpen && userId && post && (
        <Composer
          onClose={() => setComposerOpen(false)}
          treatments={treatments}
          userId={userId}
          onCreated={() => { navigate({ to: "/treatment-talk" }).catch(() => {}); }}
          quotedPostId={post.id}
        />
      )}
    </div>
  );
}
