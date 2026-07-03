import { createFileRoute, Link } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Skintea" },
      { name: "description", content: "Why Skintea exists: honest skincare decisions built from real experiences." },
    ],
  }),
  component: AboutPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const CREAM = "#FFFCF8";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

function AboutPage() {
  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header
        style={{
          background: WARM_WHITE,
          borderBottom: `1px solid ${BORDER}`,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "14px 16px" }}>
          <Link to="/" style={{ textDecoration: "none", display: "inline-block", lineHeight: 1 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: ESPRESSO }}>Skin</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: CRIMSON }}>tea</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 28,
            color: ESPRESSO,
            lineHeight: 1.2,
            marginBottom: 24,
          }}
        >
          Why Skintea Exists
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, margin: 0 }}>
            Skintea started because skincare advice online is dishonest. Influencers get paid to recommend products. Reviews are cherry-picked. Nobody tells you the products that didn't work, or the treatments that went wrong.
          </p>

          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, margin: 0 }}>
            Skintea pulls real experiences from TikTok, Reddit, and reviews, and turns them into clear numbers: who this actually worked for, who it didn't, and why. No sponsored placements. No cherry-picking. Just the tea.
          </p>

          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, margin: 0 }}>
            Founded by Chinami Akada.
          </p>
        </div>

        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: `0.5px solid ${BORDER}`,
            fontSize: 13,
            color: MUTED,
            lineHeight: 1.6,
          }}
        >
          Got a question or want to say hi? Reach us at{" "}
          <a href="mailto:hello@getskintea.com" style={{ color: CRIMSON, textDecoration: "none", fontWeight: 600 }}>
            hello@getskintea.com
          </a>
          .
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
