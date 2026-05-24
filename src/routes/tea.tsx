import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { TeaProductsContent } from "./tea-products";
import { TreatmentTalkContent } from "./treatment-talk2";
import { SurgeryTalkContent } from "./surgery-talk";

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
const CREAM = "#FFFCF8";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

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
      <header
        style={{
          background: WARM_WHITE,
          borderBottom: `1px solid ${BORDER}`,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "14px 16px 0" }}>
          <Link
            to="/"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              color: ESPRESSO,
              textDecoration: "none",
              fontWeight: 400,
              lineHeight: 1,
              display: "block",
            }}
          >
            skintea
          </Link>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
            Got the skintea? Spill it.
          </div>
          <div style={{ display: "flex", marginTop: 10 }}>
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
                    padding: "8px 4px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
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
      </header>

      {/* Content */}
      <main>
        {tab === "product" && <TeaProductsContent embedded />}
        {tab === "treatment" && <TreatmentTalkContent embedded />}
        {tab === "surgery" && <SurgeryTalkContent embedded />}
      </main>

      <BottomNav />
    </div>
  );
}