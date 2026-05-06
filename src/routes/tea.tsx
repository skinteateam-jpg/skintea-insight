import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

export const Route = createFileRoute("/tea")({
  head: () => ({
    meta: [
      { title: "Tea — Skintea" },
      { name: "description", content: "Product, Treatment, and Surgery talk — all in one place." },
    ],
  }),
  component: TeaPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const CREAM = "#FAF7F2";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8E0D8";
const MUTED = "#8A7E76";

type Tab = "product" | "treatment" | "surgery";
const TABS: { id: Tab; label: string }[] = [
  { id: "product", label: "Product Talk" },
  { id: "treatment", label: "Treatment Talk" },
  { id: "surgery", label: "Surgery Talk" },
];

function TeaPage() {
  const [tab, setTab] = useState<Tab>("product");

  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ background: ESPRESSO, color: CREAM, padding: "20px 16px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: CREAM, textDecoration: "none", fontWeight: 600 }}>
            skintea
          </Link>
          <div style={{ fontSize: 11, color: CRIMSON, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}>
            Tea
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: WARM_WHITE, borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex" }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  padding: "14px 8px",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? ESPRESSO : MUTED,
                  borderBottom: `2px solid ${active ? CRIMSON : "transparent"}`,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 16px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO, fontSize: 24, textAlign: "center" }}>
          {TABS.find((t) => t.id === tab)?.label}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}