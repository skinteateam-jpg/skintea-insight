import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import BottomNav from "@/components/BottomNav";
import AppFrame from "@/components/AppFrame";
import { TeaProductsContent } from "./tea-products";
import { TreatmentTalkContent } from "./treatment-talk";
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

  /* The tab content has sticky bars of its own (the Product Talk tag bar, the
     Surgery Talk filter header). They used to sit at the same offset and z-index
     as this header and fight it for the top of the screen. This header now
     publishes its own measured height as --tea-header-h and takes the higher
     z-index, so a child bar sticks directly beneath it. A child that does not
     read the variable falls back to 0px and behaves exactly as before. */
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <AppFrame>
    <div
      style={{
        background: CREAM,
        minHeight: "100vh",
        fontFamily: "'DM Sans', sans-serif",
        paddingBottom: 80,
        "--tea-header-h": `${headerHeight}px`,
      } as CSSProperties}
    >
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header
        ref={headerRef}
        style={{
          background: WARM_WHITE,
          borderBottom: `1px solid ${BORDER}`,
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "14px 16px 0" }}>
          <Link to="/" style={{ textDecoration: "none", display: "block", lineHeight: 1 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: "#1C0A00" }}>Skin</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: "#A8001C" }}>tea</span>
          </Link>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#999999", marginTop: 3 }}>
            Got Skintea? Spill it.
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

      {/* Content.
          All three tabs stay, always. Each tab owns its own empty state: a tab
          with no rows shows one honest line ("No product talk yet. Posting opens
          soon.", "No surgery stories yet — be the first to share.") and renders
          no section heading above nothing. This page must not paper over an
          empty tab, and must not hide a tab because it is empty today — the
          content returns by itself when rows exist. */}
      <main>
        {tab === "product" && <TeaProductsContent embedded />}
        {tab === "treatment" && <TreatmentTalkContent embedded />}
        {tab === "surgery" && <SurgeryTalkContent embedded />}
      </main>

      <BottomNav />
    </div>
  </AppFrame>
  );
}