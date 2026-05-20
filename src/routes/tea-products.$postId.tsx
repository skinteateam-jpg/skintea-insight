import * as React from "react";
import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { Bookmark, Send } from "lucide-react";
import {
  INITIAL_POSTS,
  CHARACTERS,
  SKIN_BG,
  approvalColor,
  skinTypeLabel,
  formatAgo,
} from "./tea-products";
import type { Post } from "./tea-products";

export const Route = createFileRoute("/tea-products/$postId")({
  component: PostDetailPage,
});

type SocialSource = "all" | "tiktok" | "reddit" | "reviews";

type RelatedSpill = {
  id: string;
  initials: string;
  bg: string;
  color: string;
  name: string;
  text: string;
  agrees: number;
};

const RELATED_SPILLS: RelatedSpill[] = [
  {
    id: "r1", initials: "TG", bg: "#FFF0F0", color: "#A8001C",
    name: "tretgirl",
    text: "week 6 was my lowest point. skin was peeling and red constantly. week 10 it completely flipped — don't quit.",
    agrees: 412,
  },
  {
    id: "r2", initials: "NR", bg: "#E8F0FF", color: "#185FA5",
    name: "noretouch",
    text: "my dermatologist told me nothing either. found out about the purge phase from reddit at 2am. this app needs to exist.",
    agrees: 287,
  },
  {
    id: "r3", initials: "SK", bg: "#FFF3E0", color: "#B45309",
    name: "skinjourney_",
    text: "three months of looking worse before looking better. the before/after at month 4 made me cry.",
    agrees: 198,
  },
];

const SOCIAL_DATA: Record<SocialSource, { tiktok: number; reddit: number; reviews: number; majority: string[]; minority: string[] }> = {
  all: { tiktok: 88, reddit: 95, reviews: 79, majority: ["purge is real and expected", "worth pushing through", "results after 3 months"], minority: ["no purge at all", "didn't work long term", "too harsh for skin"] },
  tiktok: { tiktok: 88, reddit: 0, reviews: 0, majority: ["creators say stick with it", "before/after content viral", "month 3 glow up real"], minority: ["too much hype", "only works for some", "camera filters hiding results"] },
  reddit: { tiktok: 0, reddit: 95, reviews: 0, majority: ["purge is well documented", "low % works better", "patience is everything"], minority: ["chemical burn reports", "not worth the dryness", "over-prescribed"] },
  reviews: { tiktok: 0, reddit: 0, reviews: 79, majority: ["visible pores reduced", "acne cleared after 90 days", "skin texture improved"], minority: ["severe peeling", "gave up after 6 weeks", "dermatologist should warn you"] },
};

const POST_TYPE_BADGE = {
  "skin-tea": { label: "Skin Tea", bg: "#FFF0F0", color: "#A8001C" },
  "look-tea": { label: "Look Tea", bg: "#F0EDF8", color: "#5B3FA6" },
  spill: { label: "Spill", bg: "#FFF7E6", color: "#B45309" },
} as const;

function PostDetailPage() {
  const { postId } = useParams({ from: "/tea-products/$postId" });
  const navigate = useNavigate();
  const post: Post | undefined = INITIAL_POSTS.find((p) => p.id === postId);
  const [activeImg, setActiveImg] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [socialTab, setSocialTab] = React.useState<SocialSource>("all");
  const [comments, setComments] = React.useState([
    { id: "c1", initials: "RL", bg: "#FFF0F0", color: "#A8001C", name: "rosylip", text: "this is exactly what my skin needed to hear. two weeks and i'm already seeing results", agrees: 67 },
    { id: "c2", initials: "DK", bg: "#E8F0FF", color: "#185FA5", name: "dewykim", text: "dry skin here — be careful with this one. made me flaky until i added more moisturizer", agrees: 43 },
    { id: "c3", initials: "GS", bg: "#E8F5E0", color: "#3B6D11", name: "glowseeker", text: "the skintea data breakdown is what sold me. 65% for oily is actually pretty good", agrees: 31 },
  ]);

  const submitComment = () => {
    if (!comment.trim()) return;
    setComments((prev) => [
      {
        id: Math.random().toString(36).slice(2),
        initials: "ME",
        bg: "#FFF0F0",
        color: "#A8001C",
        name: "you",
        text: comment.trim(),
        agrees: 0,
      },
      ...prev,
    ]);
    setComment("");
  };

  if (!post) {
    return (
      <div style={{ padding: 24, fontFamily: "'DM Sans', system-ui" }}>
        <p>Post not found</p>
        <button onClick={() => navigate({ to: "/tea-products" })}>← Back</button>
      </div>
    );
  }

  const char = CHARACTERS[post.skinType];
  const badge = POST_TYPE_BADGE[post.postType];
  const isSpill = post.postType === "spill";
  // suppress unused import warnings if any
  void approvalColor;

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
          <div style={{ display: "flex", gap: 12, color: "#1C0A00" }}>
            <Bookmark className="h-5 w-5" />
            <Send className="h-5 w-5" />
          </div>
        </div>

        {/* Hero */}
        {post.images.length > 0 && (
          <div style={{ position: "relative", padding: "0 16px" }}>
            <img
              src={post.images[activeImg]}
              alt=""
              style={{
                width: "100%",
                height: 360,
                objectFit: "cover",
                borderRadius: 16,
                display: "block",
              }}
            />
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
                      background: i === activeImg ? "#1C0A00" : "#E8E0D8",
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
              background: post.isMUA ? "#1C0A00" : SKIN_BG[post.skinType],
              color: post.isMUA ? "#FFFCF8" : "#1C0A00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: post.isMUA ? 13 : 18,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {post.isMUA ? post.authorName?.slice(0, 2).toUpperCase() : char.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1C0A00" }}>
                {post.isMUA ? post.authorName : char.name}
              </p>
              {post.isMUA && (
                <span
                  style={{
                    background: "#1C0A00",
                    color: "#FFFCF8",
                    fontSize: 9,
                    padding: "1px 6px",
                    borderRadius: 20,
                    fontWeight: 600,
                  }}
                >
                  MUA
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: "#8A7E76" }}>
              {post.isMUA ? post.authorRole : `${formatAgo(post.createdAt)} ago`}
            </p>
          </div>
          <button
            style={{
              background: "#1C0A00",
              color: "#FFFCF8",
              border: "none",
              borderRadius: 20,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Follow
          </button>
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
              <img
                src={post.products[0].image}
                alt={post.products[0].name}
                style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
              />
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
                  Creator's Pick
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1C0A00" }}>
                  {post.products[0].name} — {post.products[0].brand}
                </p>
                <p style={{ fontSize: 12, color: "#1C0A00", fontWeight: 500 }}>
                  {post.products[0].price}
                </p>
                <p style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                  {post.products[0].approval}% of {skinTypeLabel(post.products[0].skinType)} skin approve · Skintea
                </p>
              </div>
              <button
                onClick={() => navigate({ to: "/product-detail", search: { from: "post", postId: post.id } })}
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
              Full Breakdown — {post.totalSteps} steps
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
                        <div style={{ width: 1, flex: 1, background: "#E8E0D8", marginTop: 4 }} />
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
                      <div style={{ marginTop: 8 }}>
                        {post.products[i] ? (
                          <div
                            onClick={(e) => { e.stopPropagation(); navigate({ to: "/product-detail", search: { from: "post", postId: post.id } }); }}
                            style={{
                              background: "#FFFCF8",
                              border: "0.5px solid #E8E0D8",
                              borderRadius: 10,
                              padding: 8,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: "pointer",
                            }}
                          >
                            <img
                              src={post.products[i].image}
                              alt=""
                              style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, color: "#1C0A00", fontWeight: 500 }}>
                                {post.products[i].name} · {post.products[i].price}
                              </p>
                              <p style={{ fontSize: 10, color: "#888" }}>
                                {post.products[i].approval}% of {skinTypeLabel(post.products[i].skinType)} skin approve
                              </p>
                            </div>
                            <span style={{ marginLeft: "auto", fontSize: 11, color, flexShrink: 0 }}>View →</span>
                          </div>
                        ) : (
                          <div
                            onClick={(e) => { e.stopPropagation(); navigate({ to: "/product-detail", search: { from: "post", postId: post.id } }); }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "#f5f0ea",
                              border: "0.5px solid #e0d8d0",
                              borderRadius: 8,
                              padding: "5px 10px",
                              cursor: "pointer",
                              fontSize: 11,
                              color: "#888",
                            }}
                          >
                            {step.product}
                            <span style={{ color, fontSize: 11 }}>View →</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Skintea data */}
        <div style={{ padding: "0 16px 16px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#aaa",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 10,
            }}
          >
            Skintea data
          </p>
          <div
            style={{
              background: "#fff",
              border: "0.5px solid #E8E0D8",
              borderRadius: 14,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {[
              { label: "Oily skin", pct: 65, color: "#A8001C" },
              { label: "Combo skin", pct: 58, color: "#D97706" },
              { label: "Dry skin", pct: 41, color: "#D97706" },
              { label: "Sensitive skin", pct: 33, color: "#888" },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1C0A00", marginBottom: 4 }}>
                  <span>{row.label}</span>
                  <span style={{ fontWeight: 600 }}>{row.pct}% approve</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#f5f0ea", overflow: "hidden" }}>
                  <div style={{ width: `${row.pct}%`, height: "100%", background: row.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What people say */}
        <div style={{ padding: "0 16px 16px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#aaa",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 10,
            }}
          >
            What people say
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, background: "#F0F8F0", border: "0.5px solid #d0e8d0", borderRadius: 12, padding: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#3B6D11", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Majority
              </p>
              {["pores look smaller", "shine controlled", "works fast"].map((t) => (
                <p key={t} style={{ fontSize: 12, color: "#1C0A00", marginBottom: 3 }}>→ {t}</p>
              ))}
            </div>
            <div style={{ flex: 1, background: "#FFF7E6", border: "0.5px solid #f0d8a0", borderRadius: 12, padding: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#B45309", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Minority
              </p>
              {["purging week 1", "dry skin reacts", "sticky texture"].map((t) => (
                <p key={t} style={{ fontSize: 12, color: "#1C0A00", marginBottom: 3 }}>→ {t}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Majority opinion on social media (spill only) */}
        {post.postType === "spill" && (
          <>
            <div style={{ height: "0.5px", background: "#E8E0D8", margin: "0 16px 16px" }} />
            <div style={{ padding: "0 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
                Majority opinion on social media
              </div>
              <div style={{ background: "#fff", border: "0.5px solid #E8E0D8", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", borderBottom: "0.5px solid #E8E0D8" }}>
                  {(["all", "tiktok", "reddit", "reviews"] as SocialSource[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSocialTab(tab)}
                      style={{
                        flex: 1, padding: "9px 4px", fontSize: 11, fontWeight: 500,
                        background: "none", border: "none", cursor: "pointer",
                        color: socialTab === tab ? "#A8001C" : "#aaa",
                        borderBottom: `2px solid ${socialTab === tab ? "#A8001C" : "transparent"}`,
                        textTransform: "capitalize",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {tab === "all" ? "All" : tab === "tiktok" ? "TikTok" : tab === "reddit" ? "Reddit" : "Reviews"}
                    </button>
                  ))}
                </div>
                <div style={{ padding: "12px 14px" }}>
                  {socialTab === "all" && (
                    <div style={{ marginBottom: 12 }}>
                      {[
                        { icon: "🎵", label: "TikTok", pct: SOCIAL_DATA.all.tiktok },
                        { icon: "🔶", label: "Reddit", pct: SOCIAL_DATA.all.reddit },
                        { icon: "⭐", label: "Reviews", pct: SOCIAL_DATA.all.reviews },
                      ].map((row) => (
                        <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
                            {row.icon}
                          </div>
                          <div style={{ fontSize: 11, color: "#888", width: 52, flexShrink: 0 }}>{row.label}</div>
                          <div style={{ flex: 1, height: 5, background: "#f0ebe3", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${row.pct}%`, background: "#A8001C", borderRadius: 4 }} />
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "#1C0A00", minWidth: 28, textAlign: "right" }}>{row.pct}%</div>
                        </div>
                      ))}
                      <div style={{ height: "0.5px", background: "#f0ebe3", margin: "10px 0" }} />
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ background: "#FFF0F0", border: "1px solid #f5d0d0", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", color: "#A8001C", marginBottom: 6 }}>
                        Majority
                      </div>
                      {SOCIAL_DATA[socialTab].majority.map((t) => (
                        <div key={t} style={{ fontSize: 11, color: "#555", lineHeight: 1.5, marginBottom: 3 }}>→ {t}</div>
                      ))}
                    </div>
                    <div style={{ background: "#f5f0ea", border: "0.5px solid #E8E0D8", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", color: "#888", marginBottom: 6 }}>
                        Minority
                      </div>
                      {SOCIAL_DATA[socialTab].minority.map((t) => (
                        <div key={t} style={{ fontSize: 11, color: "#555", lineHeight: 1.5, marginBottom: 3 }}>→ {t}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Product mentioned (spill only, when products exist) */}
        {post.postType === "spill" && post.products.length > 0 && (
          <>
            <div style={{ height: "0.5px", background: "#E8E0D8", margin: "0 16px 16px" }} />
            <div style={{ padding: "0 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
                Product mentioned
              </div>
              <div
                onClick={() => navigate({ to: "/product-detail", search: { from: "post", postId: post.id } })}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "#f5f0ea", border: "0.5px solid #e0d8d0",
                  borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                }}
              >
                <img
                  src={post.products[0].image}
                  alt=""
                  style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#1C0A00" }}>
                    {post.products[0].name} — {post.products[0].brand}
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                    See Skintea data → approval rate, timeline
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </>
        )}

        {/* Others who relate (spill only) */}
        {post.postType === "spill" && (
          <>
            <div style={{ height: "0.5px", background: "#E8E0D8", margin: "0 16px 16px" }} />
            <div style={{ padding: "0 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
                Others who relate
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {RELATED_SPILLS.map((spill) => (
                  <div
                    key={spill.id}
                    style={{
                      background: "#fff", border: "0.5px solid #E8E0D8",
                      borderRadius: 12, padding: 12, cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: spill.bg, color: spill.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 500, flexShrink: 0,
                      }}>
                        {spill.initials}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#1C0A00" }}>{spill.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginBottom: 6 }}>
                      {spill.text}
                    </div>
                    <div style={{ fontSize: 11, color: "#D97706" }}>
                      🔥 {spill.agrees} agree
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Agree meter (spill only) */}
        {post.postType === "spill" && (
          <div style={{ padding: "0 16px 16px" }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#aaa",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              Agree meter
            </p>
            <div style={{ background: "#1C0A00", borderRadius: 14, padding: 14, color: "#FFFCF8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13 }}>{post.helped} people agree</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#FFD4B0" }}>🔥 94%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
                <div style={{ width: "94%", height: "100%", background: "#A8001C" }} />
              </div>
              <p style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>of people who tried this relate to this experience</p>
            </div>
          </div>
        )}

        {/* Comments */}
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
            {post.comments} comments
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {comments.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: c.bg,
                    color: c.color,
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {c.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: "#fff", border: "0.5px solid #E8E0D8", borderRadius: 12, padding: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#1C0A00" }}>{c.name}</p>
                    <p style={{ fontSize: 12, color: "#1C0A00", marginTop: 3, lineHeight: 1.4 }}>{c.text}</p>
                  </div>
                  <p style={{ fontSize: 10, color: "#888", marginTop: 4, marginLeft: 4 }}>
                    🔥 {c.agrees} · agree
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "#FFFCF8", borderTop: "0.5px solid #E8E0D8",
        padding: "10px 16px 16px",
        zIndex: 30,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Row 1: actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", marginBottom: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#FFF0E8", border: "1px solid #FFD4B0",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>🔥</div>
            <span style={{ fontSize: 10, color: "#D97706", fontWeight: 500 }}>{post.helped}</span>
            <span style={{ fontSize: 9, color: "#D97706" }}>agree</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}>
            <Bookmark size={24} color="#888" />
            <span style={{ fontSize: 9, color: "#bbb" }}>save</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}>
            <Send size={24} color="#888" />
            <span style={{ fontSize: 9, color: "#bbb" }}>share</span>
          </div>
        </div>
        {/* Divider */}
        <div style={{ height: "0.5px", background: "#E8E0D8", margin: "0 -16px 10px" }} />
        {/* Row 2: comment input */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
            placeholder="add your take..."
            style={{
              flex: 1, background: "#f5f0ea", border: "none", borderRadius: 20,
              padding: "9px 14px", fontSize: 12, color: "#333",
              fontFamily: "'DM Sans', sans-serif", outline: "none",
            }}
          />
          <button
            onClick={submitComment}
            disabled={!comment.trim()}
            style={{
              background: comment.trim() ? "#A8001C" : "#f0ebe3",
              color: comment.trim() ? "#fff" : "#bbb",
              border: "none", borderRadius: 20,
              padding: "8px 16px", fontSize: 12, fontWeight: 500,
              cursor: comment.trim() ? "pointer" : "default",
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