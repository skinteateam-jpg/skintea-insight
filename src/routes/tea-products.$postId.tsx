import * as React from "react";
import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { Bookmark, Send } from "lucide-react";
import {
  usePostsStore,
  setPostsStore,
  skinBg,
  postAgeLabel,
} from "./tea-products";
import type { Post } from "./tea-products";

export const Route = createFileRoute("/tea-products/$postId")({
  component: PostDetailPage,
});

const POST_TYPE_BADGE = {
  "skin-tea": { label: "Skin Tea", bg: "#FFF0F0", color: "#A8001C" },
  "look-tea": { label: "Look Tea", bg: "#F0EDF8", color: "#5B3FA6" },
  spill: { label: "Spill", bg: "#FFF7E6", color: "#B45309" },
} as const;

function PostDetailPage() {
  const { postId } = useParams({ from: "/tea-products/$postId" });
  const navigate = useNavigate();
  const [posts] = usePostsStore();
  const post: Post | undefined = posts.find((p) => p.id === postId);
  const [activeImg, setActiveImg] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [shareNote, setShareNote] = React.useState<string | null>(null);

  /* Comments are not wired to the database. They used to live in component
     state, attributed to "ME" / "you", and vanished on reload — a comment that
     nobody can read is not a comment, and the attribution was invented. The
     composer stays visible but disabled until there is a table behind it. */
  const COMMENTS_ENABLED: boolean = false;

  // Non-blocking share feedback; the app mounts no toaster, so it renders inline.
  const showShareNote = (message: string) => {
    setShareNote(message);
    window.setTimeout(() => setShareNote(null), 4000);
  };

  if (!post) {
    return (
      <div style={{ padding: 24, fontFamily: "'DM Sans', system-ui" }}>
        <p>Post not found.</p>
        <button onClick={() => navigate({ to: "/tea-products" })}>← Back</button>
      </div>
    );
  }

  const badge = POST_TYPE_BADGE[post.postType];
  const isSpill = post.postType === "spill";
  const ageLabel = postAgeLabel(post.createdAt);
  const stepCount = post.steps?.length ?? 0;

  return (
    <div
      style={{
        background: "#FFFCF8",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        minHeight: "100vh",
        paddingBottom: 120,
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Top nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "#FFFCF8",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => navigate({ to: "/tea-products" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 10px 6px 4px",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C0A00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 500, color: "#1C0A00", fontFamily: "'DM Sans', sans-serif" }}>
              Tea
            </span>
          </button>
          {/* Save and share live in the bottom bar, where they work. The
              duplicate handler-less icons that used to sit here are gone. */}
        </div>

        {/* Hero */}
        {post.images.length > 0 && (
          <div style={{ position: "relative", padding: "0 16px" }}>
            <div style={{ width: "100%", aspectRatio: "4/5", maxHeight: 420, borderRadius: 16, overflow: "hidden", background: "#E8DDD4" }}>
              <img
                src={post.images[activeImg]}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top center",
                  display: "block",
                }}
              />
            </div>
            <span
              style={{
                position: "absolute",
                top: 12,
                left: 28,
                background: badge.bg,
                color: badge.color,
                fontSize: 10,
                padding: "4px 10px",
                borderRadius: 20,
                fontWeight: 600,
              }}
            >
              {badge.label}
            </span>
            {post.images.length > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 4,
                  marginTop: 8,
                }}
              >
                {post.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    aria-label={`Image ${i + 1}`}
                    style={{
                      width: i === activeImg ? 14 : 5,
                      height: 5,
                      borderRadius: 3,
                      background: i === activeImg ? "#1C0A00" : "#E8DDD4",
                      border: 0,
                      padding: 0,
                      cursor: "pointer",
                      transition: "width 0.2s",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Author row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: skinBg(post.skinType),
              color: "#1C0A00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {post.authorUsername ? post.authorUsername.slice(0, 1).toUpperCase() : ""}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* The author is the profile username, or nobody. No persona name. */}
            {post.authorUsername && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1C0A00" }}>{post.authorUsername}</p>
              </div>
            )}
            {ageLabel && <p style={{ fontSize: 11, color: "#999999" }}>{ageLabel}</p>}
          </div>
          {/* There is no following graph yet, so the control says so instead of
              pretending to work. */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
            <button
              type="button"
              disabled
              title="Following isn't available yet"
              style={{
                background: "#f0ebe3",
                color: "#bbb",
                border: "none",
                borderRadius: 20,
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "not-allowed",
              }}
            >
              Follow
            </button>
            <span style={{ fontSize: 9, color: "#bbb" }}>not yet</span>
          </div>
        </div>

        {/* Text + hashtags */}
        <div style={{ padding: "0 16px 16px" }}>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "#1C0A00" }}>{post.text}</p>
          {post.hashtags && post.hashtags.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {post.hashtags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: "#FFF0F0",
                    color: "#A8001C",
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 20,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hot Pick */}
        {!isSpill && post.products.length > 0 && (
          <div style={{ padding: "0 16px 16px" }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#aaa",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              Hot Pick
            </p>
            <div
              style={{
                background: "#FFF0F0",
                border: "1px solid #f5d0d0",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {post.products[0].image && (
                <img
                  src={post.products[0].image}
                  alt={post.products[0].name}
                  style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    color: "#A8001C",
                    fontSize: 9,
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: 0.4,
                  }}
                >
                  Hot Pick
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1C0A00" }}>
                  {post.products[0].name} — {post.products[0].brand}
                </p>
              </div>
              <button
                onClick={() => navigate({ to: "/product-detail/$id", params: { id: post.products[0].id }, search: { from: "post", postId: post.id } })}
                style={{
                  background: "#1C0A00",
                  color: "#FFFCF8",
                  fontSize: 11,
                  padding: "6px 12px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                View
              </button>
            </div>
          </div>
        )}

        {/* Full Breakdown */}
        {!isSpill && post.steps && post.steps.length > 0 && (
          <div style={{ padding: "0 16px 16px" }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#aaa",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Full Breakdown — {stepCount} {stepCount === 1 ? "step" : "steps"}
            </p>
            <div>
              {post.steps.map((step, i) => {
                const isLast = i === post.steps!.length - 1;
                const color = step.type === "skin" ? "#A8001C" : "#C4743A";
                return (
                  <div key={step.num} style={{ display: "flex", gap: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: color,
                          color: "#FFFCF8",
                          fontSize: 12,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {step.num}
                      </div>
                      {!isLast && (
                        <div style={{ width: 1, flex: 1, background: "#E8DDD4", marginTop: 4 }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                      <p
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          color: "#aaa",
                          fontWeight: 600,
                        }}
                      >
                        {step.label}
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 500, color, marginTop: 2 }}>
                        {step.product}
                      </p>
                      {/* A step carries the product the poster typed into it and
                          nothing else. `post.products` is the Hot Pick, not a
                          per-step list, so pairing products[i] with steps[i] put
                          a serum card under "Cleanse". No catalog product is
                          attached to a step until a post actually links one. */}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Product mentioned (spill only, when products exist).
            Populated by the Spill composer's optional "Product mentioned" picker
            in tea-products.tsx — it used to be unreachable because that submit
            path always sent an empty products array. */}
        {post.postType === "spill" && post.products.length > 0 && (
          <>
            <div style={{ height: "0.5px", background: "#E8DDD4", margin: "0 16px 16px" }} />
            <div style={{ padding: "0 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
                Product mentioned
              </div>
              <div
                onClick={() => navigate({ to: "/product-detail/$id", params: { id: post.products[0].id }, search: { from: "post", postId: post.id } })}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "#f5f0ea", border: "0.5px solid #e0d8d0",
                  borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                }}
              >
                {post.products[0].image && (
                  <img
                    src={post.products[0].image}
                    alt=""
                    style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#1C0A00" }}>
                    {post.products[0].name} — {post.products[0].brand}
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                    See product details
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </>
        )}



        {/* Comments — the heading only appears once there is a real count to
            show; a hard 0 next to an empty list said nothing true. */}
        <div style={{ padding: "0 16px 16px" }}>
          {post.comments > 0 && (
            <p
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#aaa",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              {post.comments} {post.comments === 1 ? "comment" : "comments"}
            </p>
          )}
          {!COMMENTS_ENABLED && (
            <p style={{ fontSize: 11, color: "#aaa" }}>
              Comments open when posting does.
            </p>
          )}
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "#FFFCF8", borderTop: "0.5px solid #E8DDD4",
        padding: "10px 16px 16px",
        zIndex: 30,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Row 1: actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", marginBottom: 10 }}>
          <div
            onClick={() => setPostsStore((prev) => prev.map((p) => p.id === post.id
              ? { ...p, helpedByMe: !p.helpedByMe, helped: p.helped + (p.helpedByMe ? -1 : 1) }
              : p))}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", userSelect: "none" }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: post.helpedByMe ? "#FFD4B0" : "#FFF0E8",
              border: "1px solid #FFD4B0",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>🔥</div>
            <span style={{ fontSize: 10, color: "#D97706", fontWeight: 500 }}>{post.helped}</span>
            <span style={{ fontSize: 9, color: "#D97706" }}>agree</span>
          </div>
          <div
            onClick={() => setPostsStore((prev) => prev.map((p) => p.id === post.id ? { ...p, saved: !p.saved } : p))}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", userSelect: "none" }}
          >
            <Bookmark size={24} color={post.saved ? "#A8001C" : "#888"} fill={post.saved ? "#A8001C" : "none"} />
            <span style={{ fontSize: 9, color: post.saved ? "#A8001C" : "#bbb" }}>{post.saved ? "saved" : "save"}</span>
          </div>
          <div
            onClick={async () => {
              const shareUrl = window.location.href
              const shareData = {
                title: "Skintea",
                text: post.text.slice(0, 100),
                url: shareUrl,
              }
              try {
                if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                  await navigator.share(shareData)
                } else {
                  await navigator.clipboard.writeText(shareUrl)
                  showShareNote("Link copied to clipboard")
                }
              } catch {
                try {
                  await navigator.clipboard.writeText(shareUrl)
                  showShareNote("Link copied to clipboard")
                } catch {
                  showShareNote("Couldn't copy the link — copy it from the address bar")
                }
              }
            }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", userSelect: "none" }}
          >
            <Send size={24} color="#888" />
            <span style={{ fontSize: 9, color: "#bbb" }}>share</span>
          </div>
        </div>
        {/* Inline share feedback — no blocking alert() */}
        {shareNote && (
          <div style={{ fontSize: 11, color: "#1C0A00", background: "#f5f0ea", borderRadius: 10, padding: "6px 10px", marginBottom: 8 }}>
            {shareNote}
          </div>
        )}
        {/* Divider */}
        <div style={{ height: "0.5px", background: "#E8DDD4", margin: "0 -16px 10px" }} />
        {/* Row 2: comment input — visibly disabled until comments have a table */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={!COMMENTS_ENABLED}
            placeholder={COMMENTS_ENABLED ? "add your take..." : "comments open soon"}
            style={{
              flex: 1, background: "#f5f0ea", border: "none", borderRadius: 20,
              padding: "9px 14px", fontSize: 12,
              color: COMMENTS_ENABLED ? "#333" : "#bbb",
              cursor: COMMENTS_ENABLED ? "text" : "not-allowed",
              fontFamily: "'DM Sans', sans-serif", outline: "none",
            }}
          />
          <button
            type="button"
            disabled
            title="Comments open when posting does"
            style={{
              background: "#f0ebe3",
              color: "#bbb",
              border: "none", borderRadius: 20,
              padding: "8px 16px", fontSize: 12, fontWeight: 500,
              cursor: "not-allowed",
              flexShrink: 0, fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}