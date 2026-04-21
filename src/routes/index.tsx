import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Lock } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Skintea — The honest skincare decision platform" },
      {
        name: "description",
        content:
          "Real reviews from TikTok, Reddit, and Sephora — turned into clear skincare insights. Take the quiz to decode your skin.",
      },
      { property: "og:title", content: "Skintea — The honest skincare decision platform" },
      {
        property: "og:description",
        content: "Take the 8-question skin quiz and find products that actually work for your skin.",
      },
    ],
  }),
});

const C = {
  espresso: "#1C0A00",
  crimson: "#A8001C",
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  border: "#EDEBE8",
  textMid: "#5C4033",
  textLight: "#9E8070",
  imageBg: "#F5F0EB",
};

function HomePage() {
  return (
    <div style={{ background: C.bg, color: C.espresso, minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ background: C.espresso, color: "#fff", padding: "16px 20px" }}>
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            to="/"
            style={{ color: "#fff", textDecoration: "none", fontWeight: 800, letterSpacing: "0.02em" }}
          >
            SKIN<span style={{ color: C.crimson }}>TEA</span>
          </Link>
          <nav style={{ display: "flex", gap: 18, fontSize: 13 }}>
            <Link to="/products" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>
              Products
            </Link>
            <Link to="/quiz" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>
              Quiz
            </Link>
            <span
              style={{
                color: "#fff",
                opacity: 0.6,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Tea <Lock size={12} />
            </span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: C.espresso, color: "#fff", padding: "32px 20px 56px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              color: C.crimson,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.14em",
              marginBottom: 12,
            }}
          >
            HONEST SKINCARE, DECODED
          </div>
          <h1 style={{ fontSize: 36, lineHeight: 1.1, fontWeight: 800, margin: 0, maxWidth: 540 }}>
            Skincare advice that doesn't lie to you.
          </h1>
          <p style={{ color: "#D9CFC8", fontSize: 15, marginTop: 14, maxWidth: 520, lineHeight: 1.5 }}>
            Real reviews from TikTok, Reddit, and Sephora — turned into clear insights for your skin type.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            <Link
              to="/quiz"
              style={{
                background: C.crimson,
                color: "#fff",
                textDecoration: "none",
                padding: "14px 18px",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Sparkles size={16} /> Take the skin quiz
            </Link>
            <Link
              to="/products"
              style={{
                background: "transparent",
                color: "#fff",
                textDecoration: "none",
                padding: "14px 18px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                border: "1px solid rgba(255,255,255,0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Browse products <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <main
        style={{
          background: C.bg,
          borderRadius: "20px 20px 0 0",
          marginTop: -16,
          padding: "28px 16px 60px",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "grid",
            gap: 12,
            gridTemplateColumns: "1fr",
          }}
        >
          <HomeCard
            emoji="🧪"
            title="Take the quiz"
            desc="8 questions. Find your skin character + ingredient list."
            to="/quiz"
          />
          <HomeCard
            emoji="🧴"
            title="Browse products"
            desc="Honest, decoded reviews from real users."
            to="/products"
          />
          <HomeCard
            emoji="📋"
            title="Your skin profile"
            desc="Track products, treatments, and your skin score."
            to="/skin-profile"
          />
        </div>
      </main>
    </div>
  );
}

function HomeCard({
  emoji,
  title,
  desc,
  to,
}: {
  emoji: string;
  title: string;
  desc: string;
  to: "/quiz" | "/products" | "/skin-profile";
}) {
  return (
    <Link
      to={to}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 16,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        textDecoration: "none",
        color: C.espresso,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: C.imageBg,
          display: "grid",
          placeItems: "center",
          fontSize: 26,
          flexShrink: 0,
        }}
      >
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.textMid, marginTop: 2 }}>{desc}</div>
      </div>
      <ArrowRight size={18} style={{ color: C.textLight, flexShrink: 0 }} />
    </Link>
  );
}
