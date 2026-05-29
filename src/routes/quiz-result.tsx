import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Check, AlertTriangle, X, Sparkles, RotateCcw, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/quiz-result")({
  component: QuizResultPage,
  head: () => ({
    meta: [
      { title: "Your Skin Profile — Skintea" },
      {
        name: "description",
        content:
          "Your personalized skin profile, ingredient list, and product matches based on your Skintea quiz.",
      },
      { property: "og:title", content: "Your Skin Profile — Skintea" },
      {
        property: "og:description",
        content: "Personalized skincare insights powered by real user data.",
      },
    ],
  }),
});

// ---------- Brand tokens ----------
const C = { espresso: "#1C0A00", crimson: "#A8001C", bg: "#FFFCF8", surface: "#FFFFFF", border: "#E8DDD4", borderStrong: "#E8DDD4", textMid: "#1C0A00", textLight: "#999999", imageBg: "#FFFCF8", good: "#2D7A3A", goodBg: "#F0FAF1", warn: "#A87400", warnBg: "#FFFBEB", bad: "#A8001C", badBg: "#FFF5F5" };

type CharacterKey = "glazed-donut" | "desert-girl" | "mood-board" | "unbothered" | "main-character";

const CHARACTER_META: Record<CharacterKey, { name: string; emoji: string; tagline: string }> = { "glazed-donut": { name: "The Butter Girl", emoji: "🧈", tagline: "Rich, glossy, and a little too much. Your skin never misses a beat." }, "desert-girl": { name: "The Cracker", emoji: "🫙", tagline: "Thirsty by 9am. Moisturizer is your love language." }, "mood-board": { name: "The Everything Bagel", emoji: "🥯", tagline: "Oily here, dry there. Your skin contains multitudes." }, "unbothered": { name: "The Glass of Milk", emoji: "🥛", tagline: "Balanced. Calm. Unbothered. Don't break what isn't broken." }, "main-character": { name: "The Peach", emoji: "🍑", tagline: "Soft, delicate, and reacts to everything. Gentle is the only way." } };

const CHARACTER_HASHTAGS: Record<CharacterKey, string[]> = { "glazed-donut": ["#butterface", "#glossynotgreasy", "#oilygirlswin", "#blotterqueen", "#myskinismoisturized"], "desert-girl": ["#perpetuallythirsty", "#dryskingang", "#moisturizeordie", "#creameverything", "#flakingbutmakingit"], "mood-board": ["#skintypecontradiction", "#tzonechaos", "#itsgivingbothsides", "#combogirlproblems", "#skinmoodswings"], "unbothered": ["#lowmaintenance", "#skinjustworks", "#cleangirlaesthetic", "#normalbutmakeittrendy", "#dontfixwhatsnotbroken"], "main-character": ["#sensitivequeeen", "#gentleornothanks", "#myskinhasopinions", "#fragrancefreelife", "#everythingbreaksmeout"] };

const PRODUCT_TABS = ["Cleanser", "Toner", "Serum", "Moisturizer", "SPF", "Mask"];

const SKIN_RECOMMENDATIONS: Record<string, Record<string, { rank: number; brand: string; name: string; emoji: string; good: string[]; watch?: string; pct: string }[]>> = { oily: { cleanser: [ { rank: 1, brand: "CeraVe", name: "Foaming Facial Cleanser", emoji: "🧼", good: ["Niacinamide", "Ceramides"], pct: "84% rec" }, { rank: 2, brand: "La Roche-Posay", name: "Effaclar Gel Cleanser", emoji: "🫧", good: ["Salicylic acid"], pct: "79% rec" } ], toner: [ { rank: 1, brand: "COSRX", name: "AHA/BHA Clarifying Toner", emoji: "💧", good: ["Salicylic acid", "Willow bark"], watch: "Go slow if sensitive", pct: "75% rec" }, { rank: 2, brand: "Paula's Choice", name: "BHA Liquid Exfoliant", emoji: "🧴", good: ["Salicylic acid"], pct: "88% rec" } ], serum: [ { rank: 1, brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", emoji: "🧪", good: ["Niacinamide", "Zinc PCA"], watch: "Can pill under SPF", pct: "91% rec" }, { rank: 2, brand: "Minimalist", name: "Niacinamide 10% Serum", emoji: "💊", good: ["Niacinamide"], pct: "82% rec" } ], moisturizer: [ { rank: 1, brand: "Neutrogena", name: "Hydro Boost Water Gel", emoji: "🫙", good: ["Hyaluronic acid"], pct: "86% rec" }, { rank: 2, brand: "Belif", name: "Aqua Bomb Cream", emoji: "💙", good: ["Lady's mantle"], pct: "78% rec" } ], spf: [ { rank: 1, brand: "EltaMD", name: "UV Clear Broad-Spectrum SPF 46", emoji: "☀️", good: ["Niacinamide", "Zinc oxide"], pct: "93% rec" }, { rank: 2, brand: "Skin1004", name: "Madagascar SPF 50+ PA++++", emoji: "🌤️", good: ["Centella"], pct: "81% rec" } ], mask: [ { rank: 1, brand: "Innisfree", name: "Super Volcanic Pore Clay Mask", emoji: "🌋", good: ["Volcanic clay", "Green tea"], watch: "Max 10 min", pct: "77% rec" }, { rank: 2, brand: "Origins", name: "Clear Improvement Charcoal Mask", emoji: "🖤", good: ["Charcoal", "White China clay"], pct: "72% rec" } ] }, dry: { cleanser: [ { rank: 1, brand: "CeraVe", name: "Hydrating Facial Cleanser", emoji: "🧼", good: ["Ceramides", "Hyaluronic acid"], pct: "91% rec" }, { rank: 2, brand: "Vanicream", name: "Gentle Facial Cleanser", emoji: "🫧", good: ["No fragrance", "No dye"], pct: "85% rec" } ], toner: [ { rank: 1, brand: "Klairs", name: "Supple Preparation Toner", emoji: "💧", good: ["Hyaluronic acid", "Beta-glucan"], pct: "83% rec" }, { rank: 2, brand: "Pyunkang Yul", name: "Essence Toner", emoji: "🌿", good: ["Astragalus extract"], pct: "79% rec" } ], serum: [ { rank: 1, brand: "The Inkey List", name: "Hyaluronic Acid Serum", emoji: "🧪", good: ["Hyaluronic acid"], pct: "87% rec" }, { rank: 2, brand: "SkinCeuticals", name: "Hydrating B5 Gel", emoji: "💧", good: ["Hyaluronic acid", "Vitamin B5"], pct: "89% rec" } ], moisturizer: [ { rank: 1, brand: "CeraVe", name: "Moisturizing Cream", emoji: "🫙", good: ["Ceramides", "Hyaluronic acid"], pct: "94% rec" }, { rank: 2, brand: "First Aid Beauty", name: "Ultra Repair Cream", emoji: "🌾", good: ["Colloidal oatmeal", "Ceramides"], pct: "88% rec" } ], spf: [ { rank: 1, brand: "Altruist", name: "Dermatologist SPF 50", emoji: "☀️", good: ["Hyaluronic acid"], pct: "82% rec" }, { rank: 2, brand: "Isntree", name: "Hyaluronic Acid Watery Sun Gel SPF 50+", emoji: "🌤️", good: ["Hyaluronic acid"], pct: "80% rec" } ], mask: [ { rank: 1, brand: "Laneige", name: "Water Sleeping Mask", emoji: "💤", good: ["Hyaluronic acid", "Sleep-tox"], pct: "89% rec" }, { rank: 2, brand: "Glow Recipe", name: "Watermelon Sleeping Mask", emoji: "🍉", good: ["Watermelon extract", "AHA"], pct: "76% rec" } ] }, combination: { cleanser: [ { rank: 1, brand: "Cetaphil", name: "Gentle Skin Cleanser", emoji: "🧼", good: ["No fragrance", "Niacinamide"], pct: "82% rec" }, { rank: 2, brand: "Bioderma", name: "Sensibio Gel Moussant", emoji: "🫧", good: ["Cucumber extract"], pct: "78% rec" } ], toner: [ { rank: 1, brand: "Some By Mi", name: "AHA BHA PHA 30 Days Toner", emoji: "💧", good: ["AHA", "BHA", "PHA"], watch: "Start 2x weekly", pct: "81% rec" }, { rank: 2, brand: "Torriden", name: "Dive-In Low Molecule Toner", emoji: "🌊", good: ["Hyaluronic acid"], pct: "77% rec" } ], serum: [ { rank: 1, brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", emoji: "🧪", good: ["Niacinamide", "Zinc PCA"], pct: "88% rec" }, { rank: 2, brand: "Good Molecules", name: "Niacinamide Brightening Toner", emoji: "💊", good: ["Niacinamide"], pct: "74% rec" } ], moisturizer: [ { rank: 1, brand: "Tatcha", name: "Water Cream", emoji: "🫙", good: ["Japanese wild rose", "Hyaluronic acid"], pct: "83% rec" }, { rank: 2, brand: "Clinique", name: "Dramatically Different Moisturizing Gel", emoji: "💚", good: ["Cucumber extract"], pct: "79% rec" } ], spf: [ { rank: 1, brand: "Beauty of Joseon", name: "Relief Sun Rice + Probiotics SPF 50+", emoji: "☀️", good: ["Rice extract", "Probiotics"], pct: "90% rec" }, { rank: 2, brand: "Round Lab", name: "Birch Juice Moisturizing Sun Cream SPF 50+", emoji: "🌤️", good: ["Birch juice"], pct: "84% rec" } ], mask: [ { rank: 1, brand: "Dr. Jart+", name: "Dermask Micro Jet Clearing Solution", emoji: "🎭", good: ["BHA", "Centella"], pct: "73% rec" }, { rank: 2, brand: "Benton", name: "Goodbye Redness Centella Mask", emoji: "🌿", good: ["Centella"], pct: "76% rec" } ] }, normal: { cleanser: [ { rank: 1, brand: "Fresh", name: "Soy Face Cleanser", emoji: "🧼", good: ["Soy proteins", "Rosewater"], pct: "86% rec" }, { rank: 2, brand: "Tatcha", name: "The Rice Wash", emoji: "🌾", good: ["Japanese rice bran"], pct: "81% rec" } ], toner: [ { rank: 1, brand: "Kiehl's", name: "Calendula Herbal Extract Toner", emoji: "🌼", good: ["Calendula", "No alcohol"], pct: "84% rec" }, { rank: 2, brand: "Caudalie", name: "Moisturizing Toner", emoji: "💧", good: ["Grape water"], pct: "79% rec" } ], serum: [ { rank: 1, brand: "SkinCeuticals", name: "C E Ferulic Serum", emoji: "🧪", good: ["Vitamin C", "Ferulic acid"], pct: "91% rec" }, { rank: 2, brand: "Drunk Elephant", name: "C-Firma Fresh Day Serum", emoji: "🍊", good: ["Vitamin C", "Pumpkin enzyme"], pct: "82% rec" } ], moisturizer: [ { rank: 1, brand: "Tatcha", name: "The Water Cream", emoji: "🫙", good: ["Japanese wild rose", "Algae"], pct: "87% rec" }, { rank: 2, brand: "Kiehl's", name: "Ultra Facial Cream SPF 30", emoji: "🌿", good: ["Squalane", "Glacier glycoprotein"], pct: "83% rec" } ], spf: [ { rank: 1, brand: "Supergoop", name: "Unseen Sunscreen SPF 40", emoji: "☀️", good: ["Red algae", "Meadowfoam seed"], pct: "89% rec" }, { rank: 2, brand: "Coola", name: "Mineral Face SPF 30", emoji: "🌤️", good: ["Zinc oxide", "Aloe vera"], pct: "81% rec" } ], mask: [ { rank: 1, brand: "Glow Recipe", name: "Watermelon Glow Sleeping Mask", emoji: "🍉", good: ["Watermelon extract", "AHA"], pct: "80% rec" }, { rank: 2, brand: "Youth To The People", name: "Superberry Hydrate + Glow Dream Mask", emoji: "🫐", good: ["Peptides", "Maqui berry"], pct: "76% rec" } ] }, sensitive: { cleanser: [ { rank: 1, brand: "Vanicream", name: "Gentle Facial Cleanser", emoji: "🧼", good: ["No fragrance", "No dye", "No parabens"], pct: "92% rec" }, { rank: 2, brand: "Avène", name: "Extremely Gentle Cleanser Lotion", emoji: "🫧", good: ["Avène thermal spring water"], pct: "86% rec" } ], toner: [ { rank: 1, brand: "Klairs", name: "Supple Preparation Unscented Toner", emoji: "💧", good: ["Hyaluronic acid", "No fragrance"], pct: "88% rec" }, { rank: 2, brand: "Pyunkang Yul", name: "Essence Toner", emoji: "🌿", good: ["Astragalus extract"], pct: "83% rec" } ], serum: [ { rank: 1, brand: "Dr. Jart+", name: "Cicapair Tiger Grass Serum", emoji: "🧪", good: ["Centella", "No fragrance"], pct: "85% rec" }, { rank: 2, brand: "Purito", name: "Centella Unscented Serum", emoji: "🌿", good: ["Centella asiatica"], pct: "81% rec" } ], moisturizer: [ { rank: 1, brand: "La Roche-Posay", name: "Toleriane Double Repair Face Moisturizer", emoji: "🫙", good: ["Ceramides", "Niacinamide", "No fragrance"], pct: "90% rec" }, { rank: 2, brand: "Avène", name: "Cicalfate+ Restorative Protective Cream", emoji: "🌸", good: ["Avène spring water", "Sucralfate"], pct: "84% rec" } ], spf: [ { rank: 1, brand: "EltaMD", name: "UV Physical Broad-Spectrum SPF 41", emoji: "☀️", good: ["Zinc oxide", "No fragrance"], pct: "87% rec" }, { rank: 2, brand: "Altruist", name: "Sensitive SPF 50", emoji: "🌤️", good: ["No fragrance", "Mineral filters"], pct: "82% rec" } ], mask: [ { rank: 1, brand: "Avène", name: "Soothing Sheet Mask", emoji: "🌸", good: ["Avène spring water", "No fragrance"], pct: "83% rec" }, { rank: 2, brand: "Benton", name: "Goodbye Redness Centella Mask", emoji: "🌿", good: ["Centella", "No fragrance"], pct: "79% rec" } ] } };

// ---------- Placeholder result data ----------
const defaultResult = {
  skinType: "Oily",
  persona: {
    name: "The Butter Girl",
    emoji: "🧈",
    tagline: "Rich, glossy, and a little too much. Your skin never misses a beat.",
  },
  ethnicity: "East Asian", // from quiz; null if not provided
  concerns: ["Enlarged pores", "Occasional breakouts", "Sensitivity on cheeks"],
  summary: "Oily skin with sensitivity around the cheeks.",
  ingredients: {
    good: ["Niacinamide", "Salicylic acid", "Centella asiatica", "Zinc PCA", "Green tea", "Hyaluronic acid"],
    watch: ["Retinol", "AHA (Glycolic)", "Vitamin C (L-AA)", "Witch hazel"],
    avoid: ["Denatured alcohol", "Coconut oil", "Fragrance", "Essential oils"],
  },
  data: {
    headline: "68% of Oily skin users recommend lightweight moisturizers",
    minority: "21% prefer richer creams at night",
    sample: "Based on 14,200 reviews from Reddit, TikTok & Sephora",
  },
  categories: [
    {
      category: "Cleanser",
      emoji: "🧼",
      brand: "CeraVe",
      name: "Foaming Facial Cleanser",
      good: ["Niacinamide", "Ceramides"],
      watch: "Fragrance-free formula — but contains SLS",
      reason: "Cuts oil without stripping your barrier",
    },
    {
      category: "Toner",
      emoji: "💦",
      brand: "COSRX",
      name: "AHA/BHA Clarifying Treatment Toner",
      good: ["Salicylic acid", "Willow bark"],
      watch: "Contains low % AHA — go slow if sensitive",
      reason: "Unclogs pores between cleanses",
    },
    {
      category: "Serum",
      emoji: "🧪",
      brand: "The Ordinary",
      name: "Niacinamide 10% + Zinc 1%",
      good: ["Niacinamide", "Zinc PCA"],
      watch: "Can pill under sunscreen if over-applied",
      reason: "Targets pores + breakouts in one step",
    },
    {
      category: "Moisturizer",
      emoji: "🥛",
      brand: "Beauty of Joseon",
      name: "Dynasty Cream",
      good: ["Centella asiatica", "Hyaluronic acid"],
      watch: "Lightly fragranced with rice extract",
      reason: "Lightweight hydration that won't clog you",
    },
    {
      category: "Face Mask",
      emoji: "🍃",
      brand: "Innisfree",
      name: "Super Volcanic Pore Clay Mask",
      good: ["Volcanic clay", "Green tea"],
      watch: "Don't leave on past 10 min — can over-dry",
      reason: "Weekly pore reset for oily zones",
    },
  ],
  twins: [
    {
      name: "Mei Tanaka",
      handle: "@meiglow",
      avatar: "👩🏻",
      matchLabel: "Oily + Sensitive like you",
      ethnicity: "East Asian",
      swearsBy: "Beauty of Joseon Relief Sun",
    },
    {
      name: "Hana Park",
      handle: "@hanaskin",
      avatar: "🧑🏻‍🦰",
      matchLabel: "Oily skin, breakout-prone",
      ethnicity: "East Asian",
      swearsBy: "Niacinamide 10% serum",
    },
    {
      name: "Yuki R.",
      handle: "@yuki.routine",
      avatar: "👧🏻",
      matchLabel: "Oily + enlarged pores",
      ethnicity: "East Asian",
      swearsBy: "COSRX BHA toner, 3x a week",
    },
  ],
};

const TREATMENT_DATA: Record<string, { name: string; emoji: string; pct: string; hook: string; celeb: string; cost: string; reviewCount: string; downtime: string; sessions: string; desc: string; videos: { platform: string; title: string }[]; forSkinTypes: string[] }[]> = { oily: [ { name: "Chemical Peel", emoji: "⚗️", pct: "71% rec", hook: "Clears congestion and shrinks pores in one session", celeb: "Kim Kardashian has done this", cost: "$150–400", reviewCount: "943", downtime: "3–5 days", sessions: "3–6x/year", desc: "A chemical solution removes the top layer of skin, clearing pores, evening tone, and reducing oiliness. Kim Kardashian publicly documented her chemical peel on social media.", videos: [ { platform: "TK", title: "What a chemical peel actually looks like — real procedure" }, { platform: "IG", title: "Chemical peel before & after: oily skin results" } ], forSkinTypes: ["oily", "combination"] }, { name: "Laser Pore Treatment", emoji: "🔬", pct: "68% rec", hook: "Permanently reduces enlarged pores and controls shine", celeb: "Victoria Beckham has done this", cost: "$300–800", reviewCount: "612", downtime: "2–4 days", sessions: "3x series", desc: "Laser energy targets overactive sebaceous glands to reduce pore size and oil production long-term. Victoria Beckham has referenced laser treatments in beauty interviews.", videos: [ { platform: "TK", title: "Laser pore treatment — derm explains what happens" }, { platform: "IG", title: "My oily skin after 3 laser sessions" } ], forSkinTypes: ["oily"] }, { name: "Microneedling", emoji: "🪡", pct: "69% rec", hook: "Rebuilds collagen and tightens pores over time", celeb: "Gwyneth Paltrow has done this", cost: "$200–700", reviewCount: "832", downtime: "2–3 days", sessions: "3–4x/year", desc: "Tiny needles create micro-injuries that trigger collagen production, tightening pores and improving texture. Gwyneth Paltrow has discussed microneedling on her Goop platform.", videos: [ { platform: "TK", title: "Microneedling — what it feels like and the results" }, { platform: "IG", title: "Before & after microneedling: 4 session results" } ], forSkinTypes: ["oily", "combination", "normal"] }, { name: "LED Therapy", emoji: "💡", pct: "77% rec", hook: "Kills acne bacteria and reduces inflammation with zero pain", celeb: "Jessica Alba has done this", cost: "$100–250", reviewCount: "621", downtime: "None", sessions: "Monthly", desc: "Blue LED light targets acne-causing bacteria while red light reduces inflammation. Completely painless with no downtime. Jessica Alba has referenced LED therapy in skincare interviews.", videos: [ { platform: "TK", title: "LED light therapy — is it actually worth it?" }, { platform: "IG", title: "LED therapy results after 6 sessions" } ], forSkinTypes: ["oily", "sensitive", "combination"] } ], dry: [ { name: "PRF Injection", emoji: "💉", pct: "74% rec", hook: "Deep hydration from your own blood's growth factors", celeb: "Hailey Bieber has done this", cost: "$600–900", reviewCount: "487", downtime: "1–2 days", sessions: "3x series", desc: "PRF uses your own blood's platelet-rich fibrin to stimulate collagen and deeply hydrate skin. A natural alternative to fillers. Hailey Bieber has openly discussed PRF injections for skin glow in Harper's Bazaar.", videos: [ { platform: "TK", title: "What PRF actually looks like — real procedure filmed" }, { platform: "IG", title: "PRF before & after: 3 month results" } ], forSkinTypes: ["dry", "normal"] }, { name: "Hydrafacial", emoji: "✨", pct: "81% rec", hook: "Instant glow, zero downtime — most popular worldwide", celeb: "Jennifer Aniston has done this", cost: "$150–300", reviewCount: "1204", downtime: "None", sessions: "Monthly", desc: "Deep cleanse, exfoliation, and hydration in one 30-minute treatment. Immediate visible results with no downtime. Jennifer Aniston has cited Hydrafacial as part of her regular skincare routine in InStyle.", videos: [ { platform: "TK", title: "I got a Hydrafacial — here's exactly what happened" }, { platform: "IG", title: "Hydrafacial results after 4 sessions" } ], forSkinTypes: ["dry", "normal", "sensitive"] }, { name: "Microneedling", emoji: "🪡", pct: "69% rec", hook: "Boosts collagen and restores skin's moisture barrier", celeb: "Gwyneth Paltrow has done this", cost: "$200–700", reviewCount: "832", downtime: "2–3 days", sessions: "3–4x/year", desc: "Triggers collagen production to restore barrier function and improve skin texture. Gwyneth Paltrow has discussed microneedling on her Goop platform.", videos: [ { platform: "TK", title: "Microneedling for dry skin — what actually changed" }, { platform: "IG", title: "Collagen boosting results: before & after" } ], forSkinTypes: ["dry", "oily", "combination", "normal"] }, { name: "LED Therapy", emoji: "💡", pct: "77% rec", hook: "Calms and repairs dry skin barrier with zero irritation", celeb: "Jessica Alba has done this", cost: "$100–250", reviewCount: "621", downtime: "None", sessions: "Monthly", desc: "Red LED light stimulates collagen and repairs the skin barrier. Completely gentle — perfect for dry and sensitive skin. Jessica Alba has referenced LED therapy in skincare interviews.", videos: [ { platform: "TK", title: "LED therapy for dry skin — is it worth it?" }, { platform: "IG", title: "My skin barrier after 6 LED sessions" } ], forSkinTypes: ["dry", "sensitive", "combination"] } ], combination: [ { name: "Chemical Peel", emoji: "⚗️", pct: "71% rec", hook: "Balances oily zones while smoothing dry patches", celeb: "Kim Kardashian has done this", cost: "$150–400", reviewCount: "943", downtime: "3–5 days", sessions: "3–6x/year", desc: "Targets oily T-zone congestion while evening out dry areas. Kim Kardashian publicly documented her chemical peel experience on social media.", videos: [ { platform: "TK", title: "Chemical peel for combo skin — what to expect" }, { platform: "IG", title: "Before & after: combination skin chemical peel" } ], forSkinTypes: ["oily", "combination"] }, { name: "Microneedling", emoji: "🪡", pct: "69% rec", hook: "Evens out texture across oily and dry zones", celeb: "Gwyneth Paltrow has done this", cost: "$200–700", reviewCount: "832", downtime: "2–3 days", sessions: "3–4x/year", desc: "Creates uniform collagen stimulation across the face, balancing combination skin texture over time. Gwyneth Paltrow has discussed microneedling on her Goop platform.", videos: [ { platform: "TK", title: "Microneedling combo skin — 3 session results" }, { platform: "IG", title: "How microneedling fixed my uneven texture" } ], forSkinTypes: ["oily", "combination", "normal"] }, { name: "Hydrafacial", emoji: "✨", pct: "81% rec", hook: "Clears oily zones and hydrates dry areas in one go", celeb: "Jennifer Aniston has done this", cost: "$150–300", reviewCount: "1204", downtime: "None", sessions: "Monthly", desc: "The multi-step treatment adapts to different skin zones — extracting congestion in oily areas while infusing hydration where it's dry. Jennifer Aniston has cited Hydrafacial in InStyle.", videos: [ { platform: "TK", title: "Hydrafacial for combo skin — worth it?" }, { platform: "IG", title: "Monthly Hydrafacial: 6 month results" } ], forSkinTypes: ["dry", "normal", "sensitive", "combination"] }, { name: "LED Therapy", emoji: "💡", pct: "77% rec", hook: "Targets both breakouts and dry patches simultaneously", celeb: "Jessica Alba has done this", cost: "$100–250", reviewCount: "621", downtime: "None", sessions: "Monthly", desc: "Combines blue and red light to address both oily and dry concerns at once. No downtime, safe for all skin zones. Jessica Alba has referenced LED therapy in skincare interviews.", videos: [ { platform: "TK", title: "LED for combination skin — blue vs red light" }, { platform: "IG", title: "LED therapy: 3 month skin diary" } ], forSkinTypes: ["oily", "sensitive", "combination"] } ], normal: [ { name: "PRF Injection", emoji: "💉", pct: "74% rec", hook: "Maintains your great skin and adds a natural glow boost", celeb: "Hailey Bieber has done this", cost: "$600–900", reviewCount: "487", downtime: "1–2 days", sessions: "3x series", desc: "Uses your own growth factors to keep skin at its best and add subtle volume and glow. Prevention-focused. Hailey Bieber has openly discussed PRF injections in Harper's Bazaar.", videos: [ { platform: "TK", title: "PRF for normal skin — preventative treatment explained" }, { platform: "IG", title: "PRF glow results: 3 months later" } ], forSkinTypes: ["dry", "normal"] }, { name: "Hydrafacial", emoji: "✨", pct: "81% rec", hook: "Monthly reset to keep balanced skin at its best", celeb: "Jennifer Aniston has done this", cost: "$150–300", reviewCount: "1204", downtime: "None", sessions: "Monthly", desc: "A maintenance treatment that keeps normal skin glowing and clear. Jennifer Aniston has cited Hydrafacial as part of her regular skincare routine in InStyle.", videos: [ { platform: "TK", title: "Why I get a Hydrafacial every month" }, { platform: "IG", title: "Normal skin Hydrafacial monthly routine" } ], forSkinTypes: ["dry", "normal", "sensitive"] }, { name: "Microneedling", emoji: "🪡", pct: "69% rec", hook: "Preventative collagen boost before signs of aging appear", celeb: "Gwyneth Paltrow has done this", cost: "$200–700", reviewCount: "832", downtime: "2–3 days", sessions: "3–4x/year", desc: "Building collagen reserves now slows future aging. Gwyneth Paltrow has discussed microneedling on her Goop platform.", videos: [ { platform: "TK", title: "Preventative microneedling in your 20s — worth it?" }, { platform: "IG", title: "Collagen banking: what it is and why it works" } ], forSkinTypes: ["oily", "combination", "normal"] }, { name: "LED Therapy", emoji: "💡", pct: "77% rec", hook: "Easy maintenance treatment — no downtime, big glow", celeb: "Jessica Alba has done this", cost: "$100–250", reviewCount: "621", downtime: "None", sessions: "Monthly", desc: "Low-effort, high-reward maintenance for normal skin. Keeps collagen levels up and skin glowing. Jessica Alba has referenced LED therapy in skincare interviews.", videos: [ { platform: "TK", title: "LED therapy monthly routine — before & after" }, { platform: "IG", title: "6 months of LED: is it worth the hype?" } ], forSkinTypes: ["dry", "sensitive", "combination"] } ], sensitive: [ { name: "LED Therapy", emoji: "💡", pct: "77% rec", hook: "The only treatment gentle enough for reactive skin", celeb: "Jessica Alba has done this", cost: "$100–250", reviewCount: "621", downtime: "None", sessions: "Monthly", desc: "Red LED light calms inflammation, reduces redness, and repairs the barrier — completely pain-free. The safest in-office treatment for sensitive skin. Jessica Alba has referenced LED therapy in skincare interviews.", videos: [ { platform: "TK", title: "LED therapy for sensitive skin — safe and effective" }, { platform: "IG", title: "My redness after 6 LED sessions" } ], forSkinTypes: ["dry", "sensitive", "combination"] }, { name: "Hydrafacial", emoji: "✨", pct: "81% rec", hook: "Deep cleanse with zero irritation — no redness after", celeb: "Jennifer Aniston has done this", cost: "$150–300", reviewCount: "1204", downtime: "None", sessions: "Monthly", desc: "A customizable treatment that can be adjusted for reactive skin. No harsh extractions, no irritation. Jennifer Aniston has cited Hydrafacial in InStyle.", videos: [ { platform: "TK", title: "Hydrafacial for sensitive skin — what to tell your provider" }, { platform: "IG", title: "Sensitive skin Hydrafacial: my honest review" } ], forSkinTypes: ["dry", "normal", "sensitive"] }, { name: "PRF Injection", emoji: "💉", pct: "74% rec", hook: "Your own biology — zero foreign substances, zero reactions", celeb: "Hailey Bieber has done this", cost: "$600–900", reviewCount: "487", downtime: "1–2 days", sessions: "3x series", desc: "Because PRF uses your own blood, the risk of reaction is minimal — making it one of the safest injectable options for sensitive skin. Hailey Bieber has openly discussed PRF in Harper's Bazaar.", videos: [ { platform: "TK", title: "PRF for sensitive skin — why it's different from fillers" }, { platform: "IG", title: "PRF: natural glow with no foreign substances" } ], forSkinTypes: ["dry", "normal"] }, { name: "Calming Facial", emoji: "🌸", pct: "83% rec", hook: "In-office barrier repair with zero risk of flare-up", celeb: "No celebrity reference — data-backed only", cost: "$80–200", reviewCount: "394", downtime: "None", sessions: "Monthly", desc: "A professional calming facial uses medical-grade centella, barrier repair actives, and soothing masks to reset reactive skin. Safe for even the most sensitive skin types.", videos: [ { platform: "TK", title: "Calming facial for reactive skin — what happens" }, { platform: "IG", title: "Before & after: sensitive skin calming facial" } ], forSkinTypes: ["sensitive"] } ] };

const MUST_GET_PRODUCTS: Record<string, { type: string; brand: string; name: string; emoji: string; why: string; pct: string; affiliates: string[] }[]> = { oily: [ { type: "Cleanser", brand: "CeraVe", name: "Foaming Facial Cleanser", emoji: "🧼", why: "Cuts oil without stripping your barrier", pct: "84% rec", affiliates: ["Amazon", "Ulta"] }, { type: "Serum", brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", emoji: "🧪", why: "Shrinks pores and controls shine all day", pct: "91% rec", affiliates: ["Amazon", "Sephora"] }, { type: "SPF", brand: "EltaMD", name: "UV Clear SPF 46", emoji: "☀️", why: "Lightweight, matte finish — no white cast", pct: "93% rec", affiliates: ["Amazon", "Sephora"] }, { type: "Face Mask", brand: "Innisfree", name: "Super Volcanic Pore Clay Mask", emoji: "🌋", why: "Weekly pore reset for oily zones", pct: "77% rec", affiliates: ["Amazon", "Ulta"] } ], dry: [ { type: "Toner", brand: "Gokujyun", name: "Super Hyaluronic Acid Lotion", emoji: "💧", why: "Floods dry skin with layers of hydration", pct: "91% rec", affiliates: ["Amazon", "Sephora"] }, { type: "Serum", brand: "Medicube", name: "Collagen Niacinamide Serum", emoji: "🧪", why: "Repairs barrier while you sleep", pct: "87% rec", affiliates: ["Amazon"] }, { type: "Moisturizer", brand: "Sekisei", name: "Labo Labo Super Gel Moisturizer", emoji: "🫙", why: "Rich but non-sticky — dry skin best friend", pct: "85% rec", affiliates: ["Amazon"] }, { type: "Face Mask", brand: "Medicube", name: "Red Erasing Cream Mask", emoji: "🎭", why: "Weekly reset for parched flaky skin", pct: "83% rec", affiliates: ["Amazon", "Ulta"] } ], combination: [ { type: "Toner", brand: "Some By Mi", name: "AHA BHA PHA 30 Days Toner", emoji: "💧", why: "Balances oily zones while hydrating dry patches", pct: "81% rec", affiliates: ["Amazon", "Ulta"] }, { type: "Serum", brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", emoji: "🧪", why: "Controls T-zone without drying cheeks", pct: "88% rec", affiliates: ["Amazon", "Sephora"] }, { type: "Moisturizer", brand: "Tatcha", name: "The Water Cream", emoji: "🫙", why: "Lightweight hydration for combo skin", pct: "83% rec", affiliates: ["Sephora"] }, { type: "Face Mask", brand: "Dr. Jart+", name: "Dermask Micro Jet Clearing Solution", emoji: "🎭", why: "Targets both oily and dry zones at once", pct: "73% rec", affiliates: ["Sephora", "Ulta"] } ], normal: [ { type: "Serum", brand: "SkinCeuticals", name: "C E Ferulic Serum", emoji: "🧪", why: "The gold standard for prevention and glow", pct: "91% rec", affiliates: ["Sephora"] }, { type: "Moisturizer", brand: "Tatcha", name: "The Water Cream", emoji: "🫙", why: "Effortless hydration for balanced skin", pct: "87% rec", affiliates: ["Sephora"] }, { type: "SPF", brand: "Supergoop", name: "Unseen Sunscreen SPF 40", emoji: "☀️", why: "Invisible finish — wear it every single day", pct: "89% rec", affiliates: ["Sephora", "Ulta"] }, { type: "Face Mask", brand: "Glow Recipe", name: "Watermelon Glow Sleeping Mask", emoji: "🍉", why: "Weekly glow boost for maintenance skin", pct: "80% rec", affiliates: ["Sephora", "Amazon"] } ], sensitive: [ { type: "Cleanser", brand: "Vanicream", name: "Gentle Facial Cleanser", emoji: "🧼", why: "Zero fragrance zero reaction every time", pct: "92% rec", affiliates: ["Amazon", "Ulta"] }, { type: "Serum", brand: "Dr. Jart+", name: "Cicapair Tiger Grass Serum", emoji: "🧪", why: "Calms redness and repairs barrier fast", pct: "85% rec", affiliates: ["Sephora"] }, { type: "Moisturizer", brand: "La Roche-Posay", name: "Toleriane Double Repair Moisturizer", emoji: "🫙", why: "Fragrance-free barrier repair for reactive skin", pct: "90% rec", affiliates: ["Amazon", "Ulta"] }, { type: "Face Mask", brand: "Benton", name: "Goodbye Redness Centella Mask", emoji: "🌿", why: "Calms flare-ups and redness in 20 minutes", pct: "79% rec", affiliates: ["Amazon"] } ] };

function QuizResultPage() {
  const [saved, setSaved] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);
  const [stored, setStored] = useState<null | {
    skinTypeLabel?: string;
    persona?: { name: string; emoji: string; tagline: string };
    concerns?: string[];
    ingredients?: { good: string[]; watch: string[]; avoid: string[] };
  }>(null);

  // Hydrate from quiz payload written by /quiz
  useEffect(() => {
    try {
      const raw = localStorage.getItem("skintea.quizResult");
      if (raw) {
        const parsed = JSON.parse(raw);
        setStored(parsed);
        setSaved(true);
        if (parsed.skinTypeLabel) {
          localStorage.setItem("skintea_skin_type", parsed.skinTypeLabel.toLowerCase());
        }
      } else {
        localStorage.setItem("skintea_skin_type", defaultResult.skinType.toLowerCase());
      }
    } catch {
      // ignore
    }
  }, []);

  const result = {
    ...defaultResult,
    skinType: stored?.skinTypeLabel ?? defaultResult.skinType,
    persona: (stored as any)?.character ? CHARACTER_META[(stored as any).character as CharacterKey] : (stored?.persona ?? defaultResult.persona),
    concerns: stored?.concerns?.length ? stored.concerns : defaultResult.concerns,
    ingredients: stored?.ingredients ?? defaultResult.ingredients,
    character: ((stored as any)?.character ?? "glazed-donut") as CharacterKey,
  };

  const [activeTab, setActiveTab] = useState(1);
  const hashtags = CHARACTER_HASHTAGS[result.character] ?? CHARACTER_HASHTAGS["glazed-donut"];
  const [activeRecTab, setActiveRecTab] = useState("cleanser");
  const REC_TABS = [ { num: 1, key: "cleanser", label: "Cleanser" }, { num: 2, key: "toner", label: "Toner" }, { num: 3, key: "serum", label: "Serum" }, { num: 4, key: "moisturizer", label: "Moisturizer" }, { num: 5, key: "spf", label: "SPF" }, { num: 6, key: "mask", label: "Mask" } ];
  const skinTypeKey = (result.skinType || "oily").toLowerCase().replace("combination", "combination") as string;
  const currentRecs = SKIN_RECOMMENDATIONS[skinTypeKey] ?? SKIN_RECOMMENDATIONS["oily"];

  if (selectedTreatment) {
    const skinKey = (result.skinType || "oily").toLowerCase();
    const allTreatments = TREATMENT_DATA[skinKey] ?? TREATMENT_DATA["oily"];
    const treatment = allTreatments.find(t => t.name === selectedTreatment);
    if (treatment) {
      const sectionLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", color: "#999", textTransform: "uppercase", margin: "4px 0 8px" };
      const costFrom = treatment.cost.split("–")[0];
      const clinics = [
        { name: "Glow Clinic LA", location: "West Hollywood · 0.8mi", emoji: "🏥", price: `From ${costFrom}` },
        { name: "SkinBar Beverly", location: "Beverly Hills · 1.2mi", emoji: "💆", price: `From ${costFrom}` },
      ];
      return (
        <div style={{ minHeight: "100vh", background: "#FFFCF8", paddingBottom: 80 }}>
          <div style={{ background: "#1C0A00", padding: "16px 18px 20px" }}>
            <button
              onClick={() => setSelectedTreatment(null)}
              style={{ background: "transparent", border: "none", color: "rgba(255,252,248,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              ← Treatments
            </button>
            <div style={{ fontSize: 44, marginBottom: 10 }}>{treatment.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#FFFCF8", lineHeight: 1.1, marginBottom: 4 }}>{treatment.name}</div>
            <div style={{ fontSize: 10, color: "rgba(255,252,248,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{treatment.hook}</div>
            <div style={{ display: "inline-block", background: "#A8001C", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 99 }}>{treatment.pct}</div>
          </div>
          <div style={{ padding: "16px 14px 24px" }}>
            <div style={{ fontSize: 13, color: "#1C0A00", lineHeight: 1.65, marginBottom: 14 }}>{treatment.desc}</div>
            <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
              {[{ label: "Avg cost", value: treatment.cost }, { label: "Downtime", value: treatment.downtime }, { label: "Sessions", value: treatment.sessions }].map((s, i) => (
                <div key={i} style={{ flex: 1, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1C0A00" }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={sectionLabelStyle}>WHO'S DONE IT</div>
            <div style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 99, background: "#1C0A00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👤</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1C0A00", marginBottom: 2 }}>{treatment.celeb}</div>
                <div style={{ fontSize: 11, color: "#999", lineHeight: 1.4, fontStyle: "italic", marginBottom: 4 }}>{treatment.hook}</div>
                <div style={{ fontSize: 9, color: "#A8001C", fontWeight: 700 }}>Verified</div>
              </div>
            </div>
            <div style={sectionLabelStyle}>SEE HOW IT LOOKS</div>
            {treatment.videos.map((v, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: "10px 12px", marginBottom: 6, cursor: "pointer" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: v.platform === "TK" ? "#000" : "linear-gradient(135deg, #A8001C, #E0407C)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>{v.platform}</div>
                <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#1C0A00", lineHeight: 1.35 }}>{v.title}</div>
                <span style={{ fontSize: 12, color: "#bbb" }}>→</span>
              </div>
            ))}
            <div style={{ ...sectionLabelStyle, marginTop: 14 }}>CLINICS NEAR YOU</div>
            {clinics.map((c, i) => (
              <div key={i} style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ width: 44, height: 44, background: "#FFFCF8", border: "0.5px solid #E8DDD4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{c.emoji}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1C0A00", marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: "#999", marginBottom: 4 }}>{c.location}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#A8001C" }}>{c.price}</div>
                </div>
              </div>
            ))}
            <div style={{ ...sectionLabelStyle, marginTop: 14 }}>REAL REVIEWS</div>
            <div style={{ background: "#1C0A00", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 11, color: "rgba(255,252,248,0.7)", lineHeight: 1.4 }}>
                <strong style={{ color: "#FFFCF8" }}>{treatment.reviewCount}</strong> real reviews from members — costs, results, who it worked for.
              </div>
              <button style={{ background: "#A8001C", color: "#fff", border: "none", borderRadius: 99, padding: "8px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>Unlock</button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div style={{ background: C.bg, color: C.espresso, minHeight: "100vh" }}>
      {/* Top nav */}
      <header
        style={{
          background: C.espresso,
          color: "#fff",
          padding: "16px 20px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Link to="/" style={{ textDecoration: "none" }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 20, color: "#FFFCF8" }}>Skin</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 20, color: "#A8001C" }}>tea</span>
            </Link>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,252,248,0.4)", marginTop: 2 }}>
              GOT SKINTEA? SPILL IT
            </div>
          </div>
          <nav style={{ display: "flex", gap: 18, fontSize: 13 }}>
            <Link to="/products" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>Products</Link>
            <Link to="/quiz" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>Quiz</Link>
            <span style={{ color: "#fff", opacity: 0.6, display: "inline-flex", alignItems: "center", gap: 4 }}>
              Tea <Lock size={12} />
            </span>
          </nav>
        </div>
      </header>

      {/* Character hero */}
      <div style={{ background: "#1C0A00", padding: "22px 18px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", color: "#A8001C", textTransform: "uppercase", marginBottom: 18, textAlign: "center" }}>
          HERE'S YOUR TEA
        </div>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <div style={{ position: "absolute", inset: -10, borderRadius: 32, background: "radial-gradient(ellipse at center, rgba(168,0,28,0.2), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ width: 120, height: 120, borderRadius: 28, background: "linear-gradient(145deg, #2a1200, #3d1a00)", border: "1.5px solid rgba(168,0,28,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 62 }}>
            {result.persona.emoji}
          </div>
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 28, color: "#FFFCF8", textAlign: "center", lineHeight: 1.1, marginBottom: 4 }}>
          {result.persona.name}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,252,248,0.45)", textAlign: "center", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
          {result.skinType} Skin
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", padding: "0 12px 22px" }}>
          {hashtags.map((tag, i) => {
            const accent = i % 2 === 0;
            return (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 99,
                  padding: "5px 11px",
                  color: accent ? "#A8001C" : "rgba(255,252,248,0.65)",
                  background: accent ? "rgba(168,0,28,0.1)" : "rgba(255,252,248,0.06)",
                  border: accent ? "0.5px solid rgba(168,0,28,0.25)" : "0.5px solid rgba(255,252,248,0.1)",
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tagline strip */}
      <div style={{ background: "#FFFCF8", borderRadius: "16px 16px 0 0", padding: "18px 18px 0" }}>
        <div style={{ fontSize: 13, color: "#1C0A00", lineHeight: 1.65, fontStyle: "italic", textAlign: "center", paddingBottom: 16, borderBottom: "0.5px solid #E8DDD4" }}>
          "{result.persona.tagline}"
        </div>
      </div>

      {/* Profile sync banner */}
      <div style={{ margin: "14px 16px 0", background: "#F0FAF1", border: "0.5px solid #2D7A3A", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 8, height: 8, background: "#2D7A3A", borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ fontSize: 11, color: "#2D7A3A", fontWeight: 600, lineHeight: 1.4 }}>
          <strong>Saved to your profile.</strong> Your skin type, concerns, and recommendations are now on your Skintea page.
        </div>
      </div>

      {/* Content */}
      <main
        style={{
          background: C.bg,
          borderRadius: 0,
          marginTop: 0,
          padding: "24px 16px 60px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 1. SKIN PROFILE */}
          <SectionLabel>SKIN PROFILE</SectionLabel>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, letterSpacing: "0.1em" }}>
                  YOU'RE GIVING — {result.skinType.toUpperCase()}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, lineHeight: 1.1 }}>
                  {result.persona.name}
                </div>
                <div style={{ fontSize: 13, color: C.textMid, marginTop: 6, maxWidth: 360, lineHeight: 1.45 }}>
                  {result.persona.tagline}
                </div>
              </div>
              <div
                style={{
                  width: 56, height: 56, borderRadius: 14, background: C.imageBg,
                  display: "grid", placeItems: "center", fontSize: 26,
                }}
                aria-hidden
              >
                {result.persona.emoji}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>
                TOP CONCERNS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.concerns.map((c) => (
                  <span
                    key={c}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: C.imageBg,
                      color: C.espresso,
                      fontWeight: 600,
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <p style={{ marginTop: 16, marginBottom: 0, fontSize: 14, color: C.textMid, lineHeight: 1.5 }}>
              {result.summary}
            </p>
          </Card>

          {/* 2. INGREDIENT LIST */}
          <SectionLabel>YOUR INGREDIENT LIST</SectionLabel>
          <Card>
            <IngredientGroup
              title="Good for you"
              icon={<Check size={14} />}
              fg={C.good}
              bg={C.goodBg}
              items={result.ingredients.good}
            />
            <div style={{ height: 12 }} />
            <IngredientGroup
              title="Watch out"
              icon={<AlertTriangle size={14} />}
              fg={C.warn}
              bg={C.warnBg}
              items={result.ingredients.watch}
            />
            <div style={{ height: 12 }} />
            <IngredientGroup
              title="Avoid"
              icon={<X size={14} />}
              fg={C.bad}
              bg={C.badBg}
              items={result.ingredients.avoid}
            />
            <p style={{ marginTop: 14, marginBottom: 0, fontSize: 12, color: C.textLight, fontStyle: "italic" }}>
              {saved ? "Saved — " : ""}These highlights follow you across the site.
            </p>
          </Card>

          {/* 3. SKINTEA DATA */}
          <SectionLabel>SKINTEA DATA</SectionLabel>
          <Card>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: C.crimson, lineHeight: 1 }}>68%</div>
              <div style={{ fontSize: 13, color: C.textMid }}>majority</div>
            </div>
            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
              {result.data.headline}
            </p>

            {/* Bar */}
            <div style={{ marginTop: 16, height: 8, background: C.imageBg, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: "68%", height: "100%", background: C.crimson }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: C.textLight }}>
              <span>68% recommend lightweight</span>
              <span>21% prefer rich creams</span>
            </div>

            <div
              style={{
                marginTop: 16, paddingTop: 14,
                borderTop: `1px solid ${C.border}`,
                fontSize: 12, color: C.textLight,
              }}
            >
              {result.data.sample}
            </div>
          </Card>

          {/* 4. PRODUCTS */}
          <div>
            <SectionLabel>RECOMMENDED FOR YOU</SectionLabel>
            <div style={{ overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", margin: "0 -16px", padding: "0 16px", display: "flex" }}>
              <div style={{ display: "flex", gap: 8, width: "max-content", paddingBottom: 12 }}>
                {REC_TABS.map((tab) => {
                  const isActive = activeRecTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveRecTab(tab.key)}
                      style={{
                        background: isActive ? "#1C0A00" : "#fff",
                        color: isActive ? "#FFFCF8" : "#999",
                        border: isActive ? "none" : "0.5px solid #E8DDD4",
                        borderRadius: 99,
                        padding: "7px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 9, fontWeight: 800, marginRight: 2 }}>{tab.num}</span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
              {(currentRecs[activeRecTab] ?? []).map((item) => (
                <div key={`${activeRecTab}-${item.rank}`} style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ height: 100, background: "#FFFCF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, borderBottom: "0.5px solid #E8DDD4", position: "relative" }}>
                    <div style={{ position: "absolute", top: 7, left: 7, width: 20, height: 20, background: "#1C0A00", color: "#FFFCF8", borderRadius: 99, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {item.rank}
                    </div>
                    {item.emoji}
                  </div>
                  <div style={{ padding: "8px 10px 12px" }}>
                    <div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginBottom: 2 }}>{item.brand}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1C0A00", lineHeight: 1.35, marginBottom: 6 }}>{item.name}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {item.good.map((g) => (
                        <span key={g} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, background: "#F0FAF1", color: "#2D7A3A", fontWeight: 700 }}>{g}</span>
                      ))}
                      {item.watch && (
                        <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, background: "#FFFBEB", color: "#A87400", fontWeight: 700 }}>{item.watch}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#A8001C", fontWeight: 700, marginTop: 5 }}>{item.pct}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4b. SKIN TWIN */}
          <SectionLabel>YOUR SKIN TWIN</SectionLabel>
          <p style={{ margin: "-8px 0 0", fontSize: 14, color: C.textMid }}>
            Same skin type. Same vibe. See what's working for them.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {result.twins
              .filter((t) => !result.ethnicity || t.ethnicity === result.ethnicity)
              .map((t) => (
                <TwinCard key={t.handle} twin={t} />
              ))}
          </div>
          <p style={{ margin: "-4px 0 0", fontSize: 11, color: C.textLight, fontStyle: "italic" }}>
            Matched by skin type and background — not sponsored.
          </p>

          {/* SHARE AND GIFT */}
          <SectionLabel>SHARE AND GIFT</SectionLabel>
          <div style={{ background: "#1C0A00", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,252,248,0.6)", marginBottom: 2 }}>Your public profile</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FFFCF8" }}>skintea.com/u/username</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#A8001C", background: "rgba(168,0,28,0.12)", border: "0.5px solid rgba(168,0,28,0.3)", borderRadius: 99, padding: "5px 12px" }}>
              Copy link
            </span>
          </div>
          <div style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#FFF5F5", border: "0.5px solid #A8001C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                🎁
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1C0A00", marginBottom: 3 }}>Send as a gift</div>
                <div style={{ fontSize: 11, color: "#999", lineHeight: 1.5 }}>
                  Share your skin profile so friends and family can pick the perfect products for you — matched to your actual skin type.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button type="button" style={{ flex: 1, background: "#A8001C", color: "#FFFCF8", border: "none", borderRadius: 99, padding: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Share my profile
              </button>
              <button type="button" style={{ flex: 1, background: "transparent", color: "#1C0A00", border: "0.5px solid #E8DDD4", borderRadius: 99, padding: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Add to wishlist
              </button>
            </div>
          </div>

          {/* 5. SAMPLE KIT */}
          <SectionLabel>TRY BEFORE YOU COMMIT</SectionLabel>
          <Card>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 64, height: 64, borderRadius: 14, background: C.imageBg,
                  display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0,
                }}
                aria-hidden
              >
                🧴
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Your Sample Kit</div>
                <p style={{ marginTop: 6, marginBottom: 0, fontSize: 13, color: C.textMid, lineHeight: 1.5 }}>
                  A full skincare set curated for your skin type. Cleanser, toner, serum, moisturizer.
                </p>
                <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800 }}>$50</div>
              </div>
            </div>
            <button
              type="button"
              style={{
                marginTop: 16, width: "100%",
                background: C.espresso, color: "#fff",
                border: "none", borderRadius: 12,
                padding: "14px 16px", fontWeight: 700, fontSize: 14,
                cursor: "pointer",
              }}
            >
              See Your Kit
            </button>
          </Card>

          {/* 6. TREATMENTS LOCKED */}
          <div>
            <SectionLabel>RECOMMENDED TREATMENTS</SectionLabel>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 12, lineHeight: 1.4 }}>
              Open to everyone. Real reviews are members-only.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(TREATMENT_DATA[skinTypeKey] ?? TREATMENT_DATA["oily"]).slice(0, 4).map((t) => (
                <div
                  key={t.name}
                  onClick={() => setSelectedTreatment(t.name)}
                  style={{ background: "#fff", border: "0.5px solid #E8DDD4", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}
                >
                  <div style={{ background: "#1C0A00", padding: "10px 10px 8px" }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{t.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#FFFCF8", lineHeight: 1.2, marginBottom: 2 }}>{t.name}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#A8001C" }}>{t.pct}</div>
                  </div>
                  <div style={{ padding: "8px 10px 10px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#1C0A00", lineHeight: 1.35, marginBottom: 6 }}>{t.hook}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#FFF5F5", borderRadius: 6, padding: "5px 7px", marginBottom: 6 }}>
                      <div style={{ width: 6, height: 6, background: "#A8001C", borderRadius: "50%", flexShrink: 0 }} />
                      <div style={{ fontSize: 9, color: "#A8001C", fontWeight: 700, lineHeight: 1.3 }}>{t.celeb}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#1C0A00" }}>{t.cost}</div>
                      <div style={{ width: 22, height: 22, background: "#1C0A00", borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#FFFCF8", fontWeight: 800 }}>→</div>
                    </div>
                  </div>
                  <div style={{ borderTop: "0.5px solid #F0E8E0", padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 9 }}>🔒</span>
                    <div style={{ fontSize: 8, color: "#bbb", fontWeight: 600 }}>
                      <span style={{ color: "#A8001C" }}>{t.reviewCount}</span> reviews · members only
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Retake */}
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Link
              to="/quiz"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 13, color: C.textMid, textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
            >
              <RotateCcw size={14} /> Retake quiz
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------- Subcomponents ----------
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.14em",
        color: "#A8001C",
        textTransform: "uppercase",
        marginTop: 18,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "0.5px solid #E8DDD4",
        borderRadius: 12,
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

function IngredientGroup({
  title, icon, fg, bg, items,
}: {
  title: string;
  icon: React.ReactNode;
  fg: string;
  bg: string;
  items: string[];
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span
          style={{
            width: 22, height: 22, borderRadius: 999,
            background: bg, color: fg,
            display: "grid", placeItems: "center",
          }}
        >
          {icon}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: fg }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((i) => (
          <span
            key={i}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 999,
              background: bg,
              color: fg,
              fontWeight: 600,
              border: `1px solid ${fg}22`,
            }}
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  item,
}: {
  item: {
    category: string; emoji: string; brand: string; name: string;
    good: string[]; watch: string; reason: string;
  };
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 14,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 64, height: 64, borderRadius: 12,
          background: C.imageBg,
          display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0,
        }}
        aria-hidden
      >
        {item.emoji}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, color: C.crimson, fontWeight: 800, letterSpacing: "0.14em" }}>
          {item.category.toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, marginTop: 4 }}>{item.brand}</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 1, lineHeight: 1.3 }}>
          {item.name}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {item.good.map((g) => (
            <span
              key={g}
              style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 999,
                background: C.goodBg, color: C.good, fontWeight: 700,
              }}
            >
              ✓ {g}
            </span>
          ))}
          <span
            style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 999,
              background: C.warnBg, color: C.warn, fontWeight: 700,
            }}
          >
            ⚠ {item.watch}
          </span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: C.textMid, lineHeight: 1.4 }}>
          {item.reason}
        </p>
      </div>
    </div>
  );
}

function TwinCard({
  twin,
}: {
  twin: { name: string; handle: string; avatar: string; matchLabel: string; ethnicity: string; swearsBy: string };
}) {
  return (
    <div
      style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: 14,
        display: "flex", gap: 12, alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 56, height: 56, borderRadius: 999,
          background: C.imageBg,
          display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0,
        }}
        aria-hidden
      >
        {twin.avatar}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{twin.name}</div>
        <div style={{ fontSize: 12, color: C.textLight, marginTop: 1 }}>{twin.handle}</div>
        <div
          style={{
            display: "inline-block", marginTop: 8,
            fontSize: 11, padding: "3px 8px", borderRadius: 999,
            background: C.badBg, color: C.crimson, fontWeight: 700,
          }}
        >
          {twin.matchLabel}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: C.textMid, lineHeight: 1.4 }}>
          Swears by: <strong style={{ color: C.espresso }}>{twin.swearsBy}</strong>
        </p>
        <button
          type="button"
          style={{
            marginTop: 10, background: "transparent",
            border: `1px solid ${C.borderStrong}`,
            color: C.espresso, borderRadius: 999,
            padding: "6px 12px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
          }}
        >
          See their routine <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}