import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, Check, X, ChevronRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/products/$id-v2")({
  component: ProductDetailV2,
  head: () => ({
    meta: [
      { title: "CeraVe Moisturizing Cream — Skintea" },
      {
        name: "description",
        content:
          "The real tea on CeraVe Moisturizing Cream. Aggregated from Reddit, TikTok and verified reviews.",
      },
      { property: "og:title", content: "CeraVe Moisturizing Cream — Skintea" },
      {
        property: "og:description",
        content: "Real user verdicts, skin-type fit, and honest insights.",
      },
    ],
  }),
});

const C = {
  espresso: "#1C0A00",
  crimson: "#A8001C",
  crimsonLight: "#F5DDE1",
  content: "#faf8f5",
  warm: "#F5F0EB",
  warmStrong: "#E8DFD5",
  textDark: "#1C0A00",
  textMid: "#5C4033",
  textLight: "#9E8070",
  border: "#EDEBE8",
  green: "#1D9E75",
  greenTint: "#E6F4EE",
  red: "#A8001C",
  redTint: "#FBE8EB",
  amber: "#C8941F",
  gray: "#9E8070",
};

const product = {
  brand: "CeraVe",
  name: "Moisturizing Cream",
  emoji: "🫙",
  price: "$14.99",
  source: "Ulta",
  tags: [
    { label: "Moisturizer", trending: false },
    { label: "Dry skin", trending: false },
    { label: "Trending", trending: true },
  ],
  recommend: 73,
  skinFit: [
    { label: "Dry", value: 82 },
    { label: "Sensitive", value: 74 },
    { label: "Combination", value: 58 },
    { label: "Oily", value: 31 },
  ],
  worksFor: [
    "Dry, dehydrated skin",
    "Compromised barrier",
    "Fragrance-free routines",
    "Layering under SPF",
  ],
  skipIf: [
    "You're acne-prone & oily",
    "You hate thick textures",
    "You need fast absorption",
    "You want active ingredients",
  ],
  insights: [
    "Some users report congestion after 2+ weeks of daily use",
    "Pump packaging frequently breaks — tub version is more reliable",
    "Texture feels heavy in humid climates",
    "Not enough actives for visible anti-aging results",
  ],
};

function fitColor(v: number) {
  if (v >= 70) return C.crimson;
  if (v >= 50) return C.amber;
  return C.gray;
}

function ProductDetailV2() {
  return (
    <div style={{ background: C.espresso, minHeight: "100vh", color: C.textDark }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Nav */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: C.espresso,
          }}
        >
          <Link to="/products" style={{ textDecoration: "none" }}>
            <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.04em", lineHeight: 1 }}>
              <span style={{ color: "#FFFFFF" }}>SKIN</span>
              <span style={{ color: C.crimson }}>TEA</span>
            </div>
          </Link>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <Link
              to="/products"
              style={{
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                textDecoration: "none",
              }}
            >
              Products
            </Link>
            <span
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Quiz
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Tea <Lock size={11} />
            </span>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ padding: "24px 20px 36px", background: C.espresso }}>
          <div
            style={{
              color: C.crimson,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Product Intelligence
          </div>
          <h1
            style={{
              color: "#FFFFFF",
              fontSize: 28,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: "0 0 10px 0",
            }}
          >
            What's the real tea on this product?
          </h1>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 500 }}>
            Aggregated from Reddit, TikTok & verified reviews
          </div>
        </section>

        {/* Content card */}
        <div
          style={{
            background: C.content,
            borderRadius: "20px 20px 0 0",
            padding: "24px 20px 40px",
          }}
        >
          <SectionLabel>Product Detail</SectionLabel>

          {/* Product header */}
          <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "flex-start" }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 14,
                background: C.warm,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                flexShrink: 0,
              }}
              aria-hidden
            >
              {product.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: C.textLight,
                  letterSpacing: "0.06em",
                  marginBottom: 2,
                }}
              >
                {product.brand}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: C.textDark,
                  lineHeight: 1.25,
                  marginBottom: 10,
                }}
              >
                {product.name}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {product.tags.map((t) => (
                  <span
                    key={t.label}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: t.trending ? C.crimsonLight : C.warm,
                      color: t.trending ? C.crimson : C.textMid,
                    }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Price row */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.textDark, lineHeight: 1 }}>
                {product.price}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: C.textLight,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                }}
              >
                at {product.source}
              </div>
            </div>
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 16px",
                borderRadius: 999,
                border: `1.5px solid ${C.textDark}`,
                background: "transparent",
                color: C.textDark,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              <Bookmark size={13} /> Save
            </button>
          </div>

          <Divider />

          {/* Majority vs Minority */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <VerdictCard
              tint={C.greenTint}
              border={C.green}
              percent={73}
              label="recommend"
              color={C.green}
            />
            <VerdictCard
              tint={C.redTint}
              border={C.red}
              percent={27}
              label="don't recommend"
              color={C.red}
            />
          </div>
          <div
            style={{
              marginTop: 14,
              height: 8,
              borderRadius: 999,
              background: C.warmStrong,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${product.recommend}%`,
                height: "100%",
                background: C.crimson,
                borderRadius: 999,
              }}
            />
          </div>

          <Divider />

          {/* Skin type fit */}
          <SectionLabel>Skin Type Fit</SectionLabel>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {product.skinFit.map((s) => (
              <div
                key={s.label}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    width: 90,
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.textDark,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    background: C.warmStrong,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${s.value}%`,
                      height: "100%",
                      background: fitColor(s.value),
                      borderRadius: 999,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 38,
                    textAlign: "right",
                    fontSize: 13,
                    fontWeight: 800,
                    color: fitColor(s.value),
                  }}
                >
                  {s.value}%
                </div>
              </div>
            ))}
          </div>

          <Divider />

          {/* Fit summary */}
          <SectionLabel>Fit Summary</SectionLabel>
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <FitList
              title="Works for"
              items={product.worksFor}
              icon={<Check size={13} color={C.green} strokeWidth={3} />}
            />
            <FitList
              title="Skip if"
              items={product.skipIf}
              icon={<X size={13} color={C.red} strokeWidth={3} />}
            />
          </div>

          <Divider />

          {/* What the tea says */}
          <div
            style={{
              background: C.espresso,
              borderRadius: 14,
              padding: "18px 18px 20px",
            }}
          >
            <div
              style={{
                color: C.crimson,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              What the tea says
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {product.insights.map((i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    color: "rgba(250,248,245,0.88)",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: C.crimson,
                      marginTop: 7,
                      flexShrink: 0,
                    }}
                  />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <button
            style={{
              marginTop: 20,
              width: "100%",
              background: C.crimson,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 12,
              padding: "16px",
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            See full tea breakdown <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: C.crimson,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.warmStrong, margin: "22px 0" }} />;
}

function VerdictCard({
  tint,
  border,
  percent,
  label,
  color,
}: {
  tint: string;
  border: string;
  percent: number;
  label: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: tint,
        border: `1px solid ${border}33`,
        borderRadius: 12,
        padding: "14px 14px 16px",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{percent}%</div>
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          fontWeight: 600,
          color: C.textMid,
          textTransform: "lowercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FitList({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "14px 14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: C.textDark,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it) => (
          <li
            key={it}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              fontSize: 12.5,
              color: C.textDark,
              lineHeight: 1.4,
            }}
          >
            <span style={{ marginTop: 2, flexShrink: 0 }}>{icon}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
