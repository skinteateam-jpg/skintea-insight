/* One Surgery Talk post on its own page, with its updates timeline (block 7, 2026-09-18).
 *
 * `surgery-talk_` keeps this page out of the feed's layout: /surgery-talk/$postId renders on its own.
 * The card is the feed's own PostCard (it handles like, save, comments and delete itself). Author, split and
 * quote come from the same RPCs as the feed, and user_id is never selected. A saver who opens the page has seen
 * every update so far (surgery_saves.updates_seen_at). A quote goes through the same disclaimer as the feed. */
import * as React from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { CAPTION, CARD_BORDER, ESPRESSO, SANS, WARM_WHITE } from "@/components/TalkPostCard";
import TalkQuoteBox from "@/components/TalkQuoteBox";
import { TalkUpdateTimeline } from "@/components/TalkUpdateTimeline";
import { emptySplit, usePostVotes } from "@/lib/postVotes";
import { ANONYMOUS_AUTHOR, useTalkAuthors } from "@/lib/talkAuthors";
import { useQuotedPosts } from "@/lib/talkQuotes";
import { markUpdatesSeen } from "@/lib/postUpdates";
import {
  Composer, DisclaimerModal, PostCard, SURGERY_FEED_COLS, useSession, useSurgeries,
  type EnrichedPost, type Photo, type PostRow,
} from "./surgery-talk";

export const Route = createFileRoute("/surgery-talk_/$postId")({
  head: () => ({ meta: [{ title: "Surgery Talk post — Skintea" }] }),
  component: SurgeryPostPage,
});

function SurgeryPostPage() {
  const { postId } = useParams({ from: "/surgery-talk_/$postId" });
  const navigate = useNavigate();
  const userId = useSession();
  const { surgeries } = useSurgeries();
  const [row, setRow] = React.useState<PostRow | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "missing" | "failed">("loading");
  const [disclaimerOpen, setDisclaimerOpen] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);

  // Hooks run before any early return.
  const ids = React.useMemo(() => (row ? [row.id] : []), [row?.id]);
  const { splits, myVotes, vote, error: voteError } = usePostVotes("surgery", ids, userId);
  const { authors } = useTalkAuthors("surgery", ids, userId);
  const { quoted, loaded: quotedLoaded } = useQuotedPosts("surgery", row?.quoted_post_id ? [row.quoted_post_id] : [], userId);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("surgery_posts").select(SURGERY_FEED_COLS).eq("id", postId).maybeSingle();
      if (cancelled) return;
      if (error) { setState("failed"); return; }
      if (!data) { setState("missing"); return; }
      const r = data as unknown as PostRow;
      setRow({ ...r, photos: Array.isArray(r.photos) ? (r.photos as Photo[]) : [], hashtags: r.hashtags ?? [] });
      setState("ready");
    })();
    return () => { cancelled = true; };
  }, [postId]);

  // Opening the page clears the New mark for a saver. A no-op for anyone who has not saved the post.
  React.useEffect(() => {
    if (!userId || state !== "ready") return;
    void markUpdatesSeen("surgery", postId, userId);
  }, [userId, postId, state]);

  const post: EnrichedPost | null = React.useMemo(() => {
    if (!row) return null;
    const name = row.surgery_id ? surgeries.find((s) => s.id === row.surgery_id)?.name ?? "" : "";
    return { ...row, surgery_name: name };
  }, [row, surgeries]);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else navigate({ to: "/surgery-talk" }).catch(() => {});
  }

  function confirmDisclaimer() {
    setDisclaimerOpen(false);
    if (!userId) navigate({ to: "/login" }).catch(() => {});
    else setComposerOpen(true);
  }

  const notice = (text: string) => (
    <div style={{ background: "#fff", border: CARD_BORDER, borderRadius: 12, padding: 24, textAlign: "center", fontSize: 13, color: CAPTION }}>{text}</div>
  );

  const author = post ? authors.get(post.id) ?? ANONYMOUS_AUTHOR : ANONYMOUS_AUTHOR;

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
            <span style={{ fontSize: 15, fontWeight: 500, color: ESPRESSO }}>Surgery Talk</span>
          </button>
        </div>
        <div style={{ padding: "0 16px" }}>
          {state === "loading" ? notice("Loading…")
            : state === "failed" ? notice("Couldn't load this post. Reload to try again.")
            : state === "missing" || !post ? notice("This post isn't here. It may have been deleted by its author.")
            : (
              <>
                <PostCard
                  post={post}
                  userId={userId}
                  onLikeChange={() => {}}
                  onDeleted={() => { navigate({ to: "/surgery-talk" }).catch(() => {}); }}
                  split={splits.get(post.id) ?? emptySplit(post.id)}
                  myVote={myVotes.get(post.id) ?? null}
                  canVote={!!userId && !author.isOwn}
                  author={author}
                  onVote={(v) => void vote(post.id, v)}
                  onSignIn={userId ? undefined : () => { navigate({ to: "/login" }).catch(() => {}); }}
                  voteError={voteError?.postId === post.id ? voteError.message : null}
                  onQuote={() => setDisclaimerOpen(true)}
                  quotedBox={post.quoted_post_id
                    ? <TalkQuoteBox quoted={quoted.get(post.quoted_post_id) ?? null} loaded={quotedLoaded} />
                    : null}
                />
                <TalkUpdateTimeline kind="surgery" postId={post.id} postCreatedAt={post.created_at} isOwn={author.isOwn} userId={userId} />
              </>
            )}
        </div>
      </div>
      <BottomNav />
      {disclaimerOpen && <DisclaimerModal onCancel={() => setDisclaimerOpen(false)} onConfirm={confirmDisclaimer} />}
      {composerOpen && userId && post && (
        <Composer
          onClose={() => setComposerOpen(false)}
          surgeries={surgeries}
          userId={userId}
          onCreated={() => { navigate({ to: "/surgery-talk" }).catch(() => {}); }}
          quotedPostId={post.id}
        />
      )}
    </div>
  );
}
