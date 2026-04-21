import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Skintea — Real reviews. Bold decisions." },
      {
        name: "description",
        content:
          "The honest skincare decision platform. Real reviews from TikTok, Reddit, and Instagram — turned into clear insights.",
      },
      { property: "og:title", content: "Skintea — Real reviews. Bold decisions." },
      {
        property: "og:description",
        content:
          "Real reviews from TikTok, Reddit, and Instagram — turned into clear insights.",
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
};

function HomePage() {
  return (
    <div style={{ background: C.espresso, minHeight: "100vh", color: "#fff" }}>
      {/* Nav */}
      <nav
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link to="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 900, fontSize: 22, letterSpacing: "-0.04em" }}>
          SKIN<span style={{ color: C.crimson }}>TEA</span>
        </Link>
        <div style={{ display: "flex", gap: 22, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <Link to="/products" style={{ color: "#fff", textDecoration: "none" }}>Products</Link>
          <Link to="/quiz-result" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>Quiz</Link>
          <Link to="/skin-profile" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>Profile</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            color: C.crimson,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          The honest skincare decision platform
        </div>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            margin: "0 0 20px",
          }}
        >
          Real reviews.
          <br />
          <span style={{ color: C.crimson }}>Bold decisions.</span>
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.5 }}>
          Aggregated from TikTok, Reddit and Instagram. Structured by AI. Built for the way you actually shop for skincare.
        </p>
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            to="/products"
            style={{
              background: C.crimson,
              color: "#fff",
              padding: "14px 28px",
              borderRadius: 999,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Browse products
          </Link>
          <Link
            to="/quiz-result"
            style={{
              background: "transparent",
              color: "#fff",
              padding: "14px 28px",
              borderRadius: 999,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              border: "1.5px solid rgba(255,255,255,0.4)",
            }}
          >
            Take the quiz
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <FeatureCard
            label="Discover"
            title="Trending products"
            desc="See what's actually working — ranked by real users, not paid placements."
            to="/products"
          />
          <FeatureCard
            label="Personalize"
            title="Your skin quiz"
            desc="Get matched to products and ingredients made for your skin type."
            to="/quiz-result"
          />
          <FeatureCard
            label="Track"
            title="Skin profile"
            desc="Your living skin record. Log products, track reactions, share with derms."
            to="/skin-profile"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ label, title, desc, to }: { label: string; title: string; desc: string; to: "/products" | "/quiz-result" | "/skin-profile" }) {
  return (
    <Link
      to={to}
      style={{
        display: "block",
        background: C.surface,
        color: C.espresso,
        borderRadius: 16,
        padding: "24px 22px",
        textDecoration: "none",
        border: `1px solid ${C.border}`,
      }}
    >
      <div style={{ color: C.crimson, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.5 }}>{desc}</div>
    </Link>
  );
}
