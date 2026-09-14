import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import {
  Lock,
  Plus,
  Bell,
  Home,
  User,
  Compass,
  X,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/treatment-talk2")({
  head: () => ({
    meta: [
      { title: "Treatment Talk — Skintea" },
      {
        name: "description",
        content: "Share and read treatment experiences.",
      },
      { property: "og:title", content: "Treatment Talk — Skintea" },
      {
        property: "og:description",
        content: "Share and read treatment experiences.",
      },
    ],
  }),
  component: TreatmentTalkPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const CREAM = "#FFFCF8";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

// Hardcoded fallback — used while loading and if the fetch fails or returns empty
const FALLBACK_TREATMENT_NAMES = [
  "Botox",
  "Hydrafacial",
  "IPL Photofacial",
  "Juvelook",
  "Rejuran",
  "Fillers",
  "Lumecca",
  "Potenza",
  "Morpheus8",
  "Skin Boosters",
  "Laser",
  "Laser Resurfacing",
  "Peels",
  "PRF Injection",
  "RF Microneedling",
  "PRP",
  "Sculptra",
];
const FALLBACK_TREATMENTS = ["All", ...FALLBACK_TREATMENT_NAMES];

function useTreatments() {
  const [treatments, setTreatments] = useState<string[]>(FALLBACK_TREATMENTS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("treatments")
          .select("name")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          setTreatments(FALLBACK_TREATMENTS);
        } else {
          setTreatments(["All", ...data.map((t) => t.name as string)]);
        }
      } catch {
        if (!cancelled) setTreatments(FALLBACK_TREATMENTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return { treatments, loading };
}

function ChipSkeletonRow() {
  return (
    <div className="flex gap-2 overflow-x-hidden px-4 pt-1.5 pb-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 rounded-full animate-pulse"
          style={{
            width: 56 + ((i * 13) % 40),
            height: 24,
            background: "#EEE6DC",
          }}
        />
      ))}
    </div>
  );
}

const SKIN_TYPES = [
  { id: "all", label: "All", emoji: "" },
  { id: "oily", label: "Oily", emoji: "🍩" },
  { id: "dry", label: "Dry", emoji: "🏜️" },
  { id: "sensitive", label: "Sensitive", emoji: "🌸" },
  { id: "combo", label: "Combo", emoji: "✨" },
];

const SORTS = ["Most recent", "Most helpful", "Most detailed"];


const SKIN_BG: Record<string, string> = {
  oily: "#FCE7B3",
  dry: "#DCE9F5",
  sensitive: "#F8DCE8",
  combo: "#EDE6F8",
  derm: "#EAE3F4",
};

type Stage = {
  key: string;
  label: string;
  badge: "before" | "day1" | "mid" | "done";
  emoji: string;
  note?: string;
};

const BADGE_COLORS: Record<Stage["badge"], { bg: string; fg: string; label: string }> = {
  before: { bg: "#DDF1DD", fg: "#1F5E2E", label: "Before" },
  day1: { bg: "#FBD9DD", fg: "#8B0E20", label: "Day 1" },
  mid: { bg: "#FCE7B3", fg: "#7A4E00", label: "Healing" },
  done: { bg: "#EDE6F8", fg: "#4A3580", label: "Done" },
};

type Post = {
  id: string;
  name: string;
  skinType: "oily" | "dry" | "sensitive" | "combo" | "derm";
  emoji: string;
  member: string;
  derm?: boolean;
  treatment: string;
  fields: {
    cost: string;
    sessions: string;
    happened: string;
    surprised: string;
    works: string;
    warn: string;
  };
  timeline: Stage[];
  outcome: "again" | "modified" | "wouldnt";
  tags: string[];
};


function ChipScroll({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it) => {
        const isActive = active === it;
        return (
          <button
            key={it}
            onClick={() => onChange(it)}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: isActive ? ESPRESSO : "#fff",
              color: isActive ? "#fff" : ESPRESSO,
              border: `1px solid ${isActive ? ESPRESSO : BORDER}`,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {it}
          </button>
        );
      })}
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#F0E7E2" }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: CRIMSON }}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="tt-field rounded-lg p-2.5" style={{ background: CREAM }}>
      <div
        className="text-[8px] font-bold uppercase tracking-wider"
        style={{ color: MUTED, fontFamily: "'DM Sans', sans-serif" }}
      >
        {label}
      </div>
      <div
        className="tt-field-value mt-1 text-[12px] leading-snug"
        style={{ color: ESPRESSO, fontFamily: "'DM Sans', sans-serif" }}
      >
        {value}
      </div>
    </div>
  );
}

function TimelineStrip({ stages }: { stages: Stage[] }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stages.map((s) => {
        const c = BADGE_COLORS[s.badge];
        return (
          <div key={s.key} className="shrink-0" style={{ width: 64 }}>
            <div
              className="relative flex items-center justify-center overflow-hidden rounded-lg"
              style={{
                width: 64,
                height: 64,
                background: CREAM,
                border: `1px solid ${BORDER}`,
              }}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span
                className="absolute bottom-0.5 left-0.5 rounded-full text-[7px] font-bold"
                style={{ background: c.bg, color: c.fg, padding: "1px 4px" }}
              >
                {c.label}
              </span>
            </div>
            <div
              className="mt-1 text-[9px] font-bold leading-tight"
              style={{ color: ESPRESSO, fontFamily: "'DM Sans', sans-serif" }}
            >
              {s.label}
            </div>
            {s.note && (
              <div
                className="text-[8px] leading-tight"
                style={{ color: MUTED, fontFamily: "'DM Sans', sans-serif" }}
              >
                {s.note}
              </div>
            )}
          </div>
        );
      })}
      <button
        className="flex shrink-0 flex-col items-center justify-center rounded-lg"
        style={{
          width: 64,
          height: 64,
          background: "#fff",
          border: `1px dashed ${BORDER}`,
          color: MUTED,
        }}
      >
        <Plus size={14} />
        <span className="mt-0.5 text-[8px] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Add stage
        </span>
      </button>
    </div>
  );
}

function OutcomeRow({ outcome }: { outcome: Post["outcome"] }) {
  const items: { key: Post["outcome"]; label: string; bg: string; fg: string; border: string }[] = [
    { key: "again", label: "Would do again", bg: "#DDF1DD", fg: "#1F5E2E", border: "#C5E4C5" },
    { key: "modified", label: "Modified", bg: "#FCE7B3", fg: "#7A4E00", border: "#E8C97A" },
    { key: "wouldnt", label: "Wouldn't", bg: "#FBD9DD", fg: "#8B0E20", border: "#F1B8C0" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => {
        const selected = it.key === outcome;
        return (
          <div
            key={it.key}
            className="rounded-lg px-2 py-2 text-center text-[11px] font-semibold"
            style={{
              background: selected ? it.bg : "#fff",
              color: selected ? it.fg : MUTED,
              border: `1px solid ${selected ? it.border : BORDER}`,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {it.label}
          </div>
        );
      })}
    </div>
  );
}

function PostCard({ post, locked }: { post: Post; locked?: boolean }) {
  const avatarBg = SKIN_BG[post.skinType] ?? CREAM;
  return (
    <div className="tt-post-card relative">
      <article
        className="rounded-2xl p-4"
        style={{
          background: locked ? "#F5F0EB" : "#fff",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 1px 2px rgba(28,10,0,0.04)",
        }}
      >
        <div
          style={{
            filter: locked ? "blur(3px)" : "none",
            opacity: locked ? 0.55 : 1,
            pointerEvents: locked ? "none" : "auto",
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 38, height: 38, background: avatarBg, fontSize: 18 }}
              >
                {post.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="text-[13px] font-bold"
                    style={{ color: ESPRESSO, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {post.name}
                  </div>
                  {post.derm && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ background: "#F0EDF8", color: "#4A3580" }}
                    >
                      ✓ Derm
                    </span>
                  )}
                </div>
                <div className="text-[11px]" style={{ color: MUTED, fontFamily: "'DM Sans', sans-serif" }}>
                  {post.member}
                </div>
              </div>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                background: "rgba(28,10,0,0.08)",
                color: ESPRESSO,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {post.treatment}
            </span>
          </div>

          {/* Fields */}
          <div className="tt-fields mt-3 grid grid-cols-2 gap-2">
            <Field label="Cost" value={post.fields.cost} />
            <Field label="Sessions / Area" value={post.fields.sessions} />
            <Field label="What happened" value={post.fields.happened} />
            <Field label="What surprised me" value={post.fields.surprised} />
            <Field label="Works for" value={post.fields.works} />
            <Field label="Warn if" value={post.fields.warn} />
          </div>

          {/* Timeline */}
          <div className="mt-3">
            <div
              className="mb-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: MUTED, fontFamily: "'DM Sans', sans-serif" }}
            >
              Timeline
            </div>
            <TimelineStrip stages={post.timeline} />
          </div>

          {/* Outcome */}
          <div className="mt-3">
            <OutcomeRow outcome={post.outcome} />
          </div>

          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{
                  background: CREAM,
                  border: `1px solid ${BORDER}`,
                  color: MUTED,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </article>

      {locked && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-2xl p-5 text-center"
            style={{
              background: "#fff",
              border: `1px solid ${BORDER}`,
              boxShadow: "0 8px 24px rgba(28,10,0,0.12)",
            }}
          >
            <div
              className="mx-auto flex items-center justify-center rounded-full"
              style={{ width: 44, height: 44, background: CREAM }}
            >
              <Lock size={20} color={ESPRESSO} />
            </div>
            <h3
              className="mt-3 text-lg leading-tight"
              style={{ color: ESPRESSO, fontFamily: "'Playfair Display', serif" }}
            >
              Spill the needle — members only
            </h3>
            <p
              className="mt-1.5 text-[12px]"
              style={{ color: MUTED, fontFamily: "'DM Sans', sans-serif" }}
            >
              Real outcomes, real regrets, real cost. No clinic bias. No filtered truth.
            </p>
            <button
              className="mt-4 w-full rounded-full py-2.5 text-[13px] font-bold"
              style={{
                background: ESPRESSO,
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Join Skintea — $12/mo
            </button>
            <div
              className="mt-2 text-[10px]"
              style={{ color: MUTED, fontFamily: "'DM Sans', sans-serif" }}
            >
              Cancel anytime · 2,841 real teas
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "#fff", border: `1px solid ${BORDER}` }}
    >
      <div
        className="mb-3 text-[11px] font-bold uppercase tracking-wider"
        style={{ color: MUTED, fontFamily: "'DM Sans', sans-serif" }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Composer({ onClose, treatments }: { onClose: () => void; treatments: string[] }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" style={{ background: "rgba(28,10,0,0.5)" }}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl md:rounded-3xl"
        style={{ background: WARM_WHITE }}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4" style={{ background: WARM_WHITE, borderBottom: `1px solid ${BORDER}` }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }} className="text-xl">
            Spill the needle
          </h2>
          <button onClick={onClose} aria-label="Close"><X size={20} color={ESPRESSO} /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Treatment</label>
            <div className="relative">
              <select className="w-full appearance-none rounded-lg px-3 py-2.5 text-[13px]" style={{ border: `1px solid ${BORDER}`, background: "#fff", color: ESPRESSO, fontFamily: "'DM Sans', sans-serif" }}>
                {treatments.filter((t) => t !== "All").concat("Other").map((t: string) => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" color={MUTED} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Cost</label>
              <input className="w-full rounded-lg px-3 py-2.5 text-[13px]" style={{ border: `1px solid ${BORDER}`, background: "#fff" }} placeholder="$520" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Sessions / Area</label>
              <input className="w-full rounded-lg px-3 py-2.5 text-[13px]" style={{ border: `1px solid ${BORDER}`, background: "#fff" }} placeholder="1 · forehead" />
            </div>
          </div>
          {[
            ["What happened", "Walk us through it..."],
            ["What surprised me", "The thing nobody told you..."],
            ["Works for", "Who is this actually good for?"],
            ["Warn if", "Red flags or who should skip..."],
          ].map(([label, ph]) => (
            <div key={label}>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{label}</label>
              <textarea rows={2} className="w-full rounded-lg px-3 py-2 text-[13px]" style={{ border: `1px solid ${BORDER}`, background: "#fff" }} placeholder={ph} />
            </div>
          ))}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Timeline photos</label>
            <div className="grid grid-cols-3 gap-2">
              {["Before", "Right after", "3 days later", "1 week later", "1 month later", "Fully healed"].map(s => (
                <button key={s} className="aspect-square rounded-lg p-2 text-[10px] font-medium" style={{ border: `1px dashed ${BORDER}`, background: CREAM, color: MUTED }}>
                  + {s}
                </button>
              ))}
            </div>
            <button className="mt-2 w-full rounded-lg py-2 text-[11px] font-medium" style={{ border: `1px dashed ${BORDER}`, color: MUTED }}>+ Add custom stage</button>
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Outcome</label>
            <div className="grid grid-cols-3 gap-2">
              {["Would do again", "Modified", "Wouldn't"].map(o => (
                <button key={o} className="rounded-lg py-2 text-[11px] font-semibold" style={{ border: `1px solid ${BORDER}`, background: "#fff", color: ESPRESSO }}>{o}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Tags</label>
            <input className="w-full rounded-lg px-3 py-2.5 text-[13px]" style={{ border: `1px solid ${BORDER}`, background: "#fff" }} placeholder="#firsttimer #forehead" />
          </div>
          <button className="w-full rounded-full py-3 text-[14px] font-bold" style={{ background: CRIMSON, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
            Spill the needle ✦
          </button>
        </div>
      </div>
    </div>
  );
}

export function TreatmentTalkContent({ embedded = false }: { embedded?: boolean } = {}) {
  // declared below
  const [activeTab, setActiveTab] = useState<"product" | "treatment" | "surgery">("treatment");
  const [chip, setChip] = useState("All");
  const [skin, setSkin] = useState("all");
  const [sort, setSort] = useState(SORTS[0]);
  const [composerOpen, setComposerOpen] = useState(false);
  const { treatments, loading: treatmentsLoading } = useTreatments();
  // Posts the visitor writes stay local; the feed starts empty.
  const [posts] = useState<Post[]>([]);

  const filtered = useMemo(() => {
    return posts.filter((p) => (chip === "All" ? true : p.treatment === chip)).filter((p) =>
      skin === "all" ? true : p.skinType === skin,
    );
  }, [posts, chip, skin]);

  const centerLabel =
    activeTab === "product" ? "Spill ☕" : activeTab === "treatment" ? "Spill the needle ✦" : "Spill it all ✦";

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen overflow-x-hidden pb-24 md:pb-8" style={{ background: CREAM, fontFamily: "'DM Sans', sans-serif", maxWidth: "100vw" }}>
        <style>{`
          @media (max-width: 767px) {
            .tt-feed {
              padding: 0;
              box-sizing: border-box;
              max-width: 100vw;
            }
            .tt-post-card {
              width: 100%;
              max-width: 100%;
              overflow: hidden;
              box-sizing: border-box;
            }
            .tt-post-card > article {
              width: 100%;
              max-width: 100%;
              box-sizing: border-box;
              padding: 11px;
            }
            .tt-fields {
              display: grid;
              grid-template-columns: 1fr 1fr;
              width: 100%;
              box-sizing: border-box;
            }
            .tt-field {
              min-width: 0;
              box-sizing: border-box;
            }
            .tt-field, .tt-field-value {
              word-break: break-word;
              overflow-wrap: break-word;
            }
            .tt-main { padding-left: 12px; padding-right: 12px; }
            .tt-section { min-width: 0; }
          }
        `}</style>
        {/* Top nav */}
        <header
          className="sticky top-0 z-30"
          style={{ background: WARM_WHITE, borderBottom: `1px solid ${BORDER}` }}
        >
          {/* Filter chip rows */}
          <div style={{ background: WARM_WHITE }}>
            <div className="px-4 pt-2">
              <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                Treatment
              </div>
            </div>
            {treatmentsLoading ? (
              <ChipSkeletonRow />
            ) : (
              <ChipScroll items={treatments} active={chip} onChange={setChip} />
            )}
            <div className="px-4">
              <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                Skin type
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pt-1.5 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SKIN_TYPES.map((s) => {
                const isActive = skin === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSkin(s.id)}
                    className="shrink-0 rounded-full"
                    style={{
                      padding: "5px 12px",
                      fontSize: 10,
                      backgroundColor: isActive ? ESPRESSO : "#fff",
                      color: isActive ? "#fff" : ESPRESSO,
                      border: `1px solid ${isActive ? ESPRESSO : BORDER}`,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {s.emoji && <span className="mr-1">{s.emoji}</span>}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <main className="tt-main mx-auto max-w-7xl overflow-x-hidden px-4 pt-4">
          <div className="grid gap-6 md:grid-cols-[220px_1fr] lg:grid-cols-[220px_1fr_220px]">
            {/* Left sidebar */}
            <aside className="hidden md:block">
              <div className="sticky top-[140px] space-y-4">
                <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                    Treatment
                  </div>
                  <div className="space-y-1">
                    {treatments.map((t: string) => {
                      const active = chip === t;
                      return (
                        <button
                          key={t}
                          onClick={() => setChip(t)}
                          className="block w-full rounded-md px-2 py-1.5 text-left text-[12px]"
                          style={{
                            background: active ? CREAM : "transparent",
                            color: active ? ESPRESSO : MUTED,
                            fontWeight: active ? 700 : 500,
                          }}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                    Skin type
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SKIN_TYPES.map((s) => {
                      const active = skin === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSkin(s.id)}
                          className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                          style={{
                            background: active ? ESPRESSO : "#fff",
                            color: active ? "#fff" : ESPRESSO,
                            border: `1px solid ${active ? ESPRESSO : BORDER}`,
                          }}
                        >
                          {s.emoji && <span className="mr-1">{s.emoji}</span>}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                    Sort by
                  </div>
                  <div className="relative">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full appearance-none rounded-md px-2.5 py-1.5 text-[12px]"
                      style={{ border: `1px solid ${BORDER}`, background: "#fff", color: ESPRESSO }}
                    >
                      {SORTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" color={MUTED} />
                  </div>
                </div>
              </div>
            </aside>

            {/* Feed */}
            <section className="tt-section min-w-0">
              <div className="mb-4 flex items-end justify-between">
                <h1
                  className="text-2xl md:text-3xl"
                  style={{ fontFamily: "'Playfair Display', serif", color: ESPRESSO }}
                >
                  Treatment Talk
                </h1>
                <div className="text-[12px]" style={{ color: MUTED }}>
                  2,841 teas
                </div>
              </div>

              <div className="tt-feed space-y-4">
                {filtered.length === 0 ? (
                  <div
                    className="rounded-xl p-6 text-center text-[12px]"
                    style={{ background: "#fff", border: `1px solid ${BORDER}`, color: MUTED }}
                  >
                    No treatment talk yet — be the first to share.
                  </div>
                ) : (
                  filtered.map((p, i) => (
                    <PostCard key={p.id} post={p} locked={i >= 2} />
                  ))
                )}
              </div>
            </section>
          </div>
        </main>

        {!embedded && <BottomNav />}

        {composerOpen && <Composer onClose={() => setComposerOpen(false)} treatments={treatments} />}

        <button
          onClick={() => setComposerOpen(true)}
          style={{
            position: "fixed",
            bottom: 72,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#A8001C",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 99,
            padding: "12px 28px",
            border: "none",
            zIndex: 40,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Spill the tea ☕
        </button>
      </div>
    </>
  );
}

function TreatmentTalkPage() {
  return <TreatmentTalkContent />;
}

