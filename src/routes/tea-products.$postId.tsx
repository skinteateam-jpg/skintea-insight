/* One Product Talk post. Reads public.product_posts, which is where posting writes (2026-09-17).
 *
 * The page used to read a module-level localStorage store, so a post only existed on the device
 * that wrote it and the page rendered `helped` / `saved` counters that nothing measured. Both are
 * gone: the row comes from the table, and the card is the same TalkPostCard the feed renders. */
import * as React from "react";
import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  CAPTION, CARD_BORDER, CRIMSON, ESPRESSO, SANS, WARM_WHITE,
} from "@/components/TalkPostCard";
import { PRODUCT_POST_COLS, ProductPostCard, mapProductPost, type ProductPost } from "./tea-products";
import TalkQuoteBox from "@/components/TalkQuoteBox";
import { useQuotedPosts } from "@/lib/talkQuotes";

export const Route = createFileRoute("/tea-products/$postId")({
  component: PostDetailPage,
});

function PostDetailPage() {
  const { postId } = useParams({ from: "/tea-products/$postId" });
  const navigate = useNavigate();
  const [post, setPost] = React.useState<ProductPost | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "missing" | "failed">("loading");
  const [userId, setUserId] = React.useState<string | null>(null);
  const [rowError, setRowError] = React.useState<string | null>(null);
  const [shareNote, setShareNote] = React.useState<string | null>(null);
  // Quote tea: what this post quotes. Called before any early return, as hooks must be.
  const { quoted, loaded: quotedLoaded } = useQuotedPosts("product", post?.quotedPostId ? [post.quotedPostId] : [], userId);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("product_posts")
        .select(PRODUCT_POST_COLS)
        .eq("id", postId)
        .maybeSingle();
      if (cancelled) return;
      if (error) { console.error("product post fetch failed", error); setState("failed"); return; }
      if (!data) { setState("missing"); return; }
      setPost(mapProductPost(data));
      setState("ready");
    })();
    return () => { cancelled = true; };
  }, [postId]);

  async function deletePost() {
    if (!post || !userId) return;
    if (!window.confirm("Delete this post? It is removed for everyone and cannot be undone.")) return;
    setRowError(null);
    const { error, count } = await (supabase as any)
      .from("product_posts").delete({ count: "exact" }).eq("id", post.id).eq("user_id", userId);
    if (error || count === 0) {
      setRowError(error ? `Couldn't delete: ${error.message}` : "Couldn't delete this post.");
      return;
    }
    void navigate({ to: "/tea-products" });
  }

  const back = (
    <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: WARM_WHITE, position: "sticky", top: 0, zIndex: 10 }}>
      <button
        type="button"
        onClick={() => navigate({ to: "/tea-products" })}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", minHeight: 44, padding: "0 8px", fontFamily: SANS }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ESPRESSO} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span style={{ fontSize: 15, fontWeight: 500, color: ESPRESSO }}>Tea</span>
      </button>
    </div>
  );

  const shell = (inner: React.ReactNode) => (
    <div style={{ background: WARM_WHITE, fontFamily: SANS, minHeight: "100vh", paddingBottom: 96 }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {back}
        <div style={{ padding: "0 16px" }}>{inner}</div>
      </div>
    </div>
  );

  const notice = (text: string) => (
    <div style={{ background: "#fff", border: CARD_BORDER, borderRadius: 12, padding: 24, textAlign: "center", fontSize: 13, color: CAPTION }}>
      {text}
    </div>
  );

  if (state === "loading") return shell(notice("Loading…"));
  if (state === "failed") return shell(notice("Couldn't load this post. Reload to try again."));
  if (state === "missing" || !post) return shell(notice("This post isn't here. It may have been deleted by its author."));

  const isOwn = !!userId && userId === post.userId;

  return shell(
    <>
      {rowError && <p style={{ fontSize: 13, color: CRIMSON, marginBottom: 10 }}>{rowError}</p>}
      <ProductPostCard
        post={post}
        isOwn={isOwn}
        onDelete={isOwn ? () => void deletePost() : undefined}
        quotedBox={post.quotedPostId ? <TalkQuoteBox quoted={quoted.get(post.quotedPostId) ?? null} loaded={quotedLoaded} /> : null}
      />

      {post.product && (
        <button
          type="button"
          onClick={() => navigate({ to: "/product-detail/$id", params: { id: post.product!.id }, search: { from: "post", postId: post.id } })}
          style={{
            width: "100%", marginTop: 12, background: "#fff", border: CARD_BORDER, borderRadius: 12,
            minHeight: 48, fontSize: 13, fontWeight: 500, color: ESPRESSO, cursor: "pointer", fontFamily: SANS,
          }}
        >
          Open {post.product.name}
        </button>
      )}

      {/* Comments have no table behind them. The slot says so rather than showing a box that keeps nothing. */}
      <div style={{ marginTop: 12, background: "#fff", border: CARD_BORDER, borderRadius: 12, padding: "14px 16px", fontSize: 13, color: CAPTION, lineHeight: 1.5 }}>
        Replies aren't open on Product Talk yet.
      </div>

      <button
        type="button"
        onClick={() => {
          const url = `${window.location.origin}/tea-products/${post.id}`;
          navigator.clipboard?.writeText(url)
            .then(() => setShareNote("Link copied."))
            .catch(() => setShareNote("Couldn't copy the link."));
          window.setTimeout(() => setShareNote(null), 4000);
        }}
        style={{
          width: "100%", marginTop: 12, background: ESPRESSO, border: "none", borderRadius: 999,
          minHeight: 48, fontSize: 14, fontWeight: 500, color: WARM_WHITE, cursor: "pointer", fontFamily: SANS,
        }}
      >
        Copy link
      </button>
      {shareNote && <p style={{ fontSize: 13, color: CAPTION, marginTop: 8, textAlign: "center" }}>{shareNote}</p>}
    </>
  );
}
