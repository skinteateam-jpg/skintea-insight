/**
 * Skintea — ingredient flags by skin type.
 * Quiz -> skin type -> red / green ingredients.
 * Red and green are relative to THAT skin type, never a score on the product.
 * The same product can be green for dry and red for oily. That is correct, not a bug.
 * Sentiment percentages stay separate. This file must never touch them.
 */

export type SkinType =
  | "oily" | "dry" | "combination" | "normal" | "sensitive" | "acne-prone";
export type Verdict = "red" | "green";

interface Rule {
  verdict: Verdict;
  label: string;
  names: string[];
  topThirdOnly?: boolean;
}

const COMEDOGENIC = [
  "Isopropyl Palmitate", "Cocos Nucifera Oil", "Butyrospermum Parkii Butter", "Oleic Acid",
  "Dextrin Palmitate", "Cetyl Palmitate", "Myristyl Glucoside", "Ethylhexyl Palmitate",
  "Glyceryl Stearate",
];

const HEAVY_OCCLUSIVE = [
  "Hydrogenated Polyisobutene", "Hydrogenated Polydecene", "Microcrystalline Wax",
  "Synthetic Wax", "Copernicia Cerifera Wax", "Polyisobutene", "Dicaprylyl Ether",
];

const OIL_CONTROL = [
  "Niacinamide", "Salicylic Acid", "Betaine Salicylate", "Capryloyl Salicylic Acid",
  "Zinc PCA", "Zinc Lactate", "Sodium Salicylate", "Azelaic Acid", "Silica", "Kaolin",
  "Houttuynia Cordata Extract", "Houttuynia Cordata Flower/Leaf/Stem Water",
];

const BARRIER_LIPIDS = [
  "Ceramide NP", "Ceramide AP", "Ceramide EOP", "Ceramide NG", "Ceramide NS", "Ceramide AS",
  "Cholesterol", "Phytosphingosine", "Sphingolipids", "Glycolipids", "Squalane",
  "Hydrogenated Lecithin", "Phytosterols", "Beta-Sitosterol",
];

const HUMECTANTS = [
  "Glycerin", "Sodium Hyaluronate", "Hyaluronic Acid", "Hydrolyzed Hyaluronic Acid",
  "Sodium Acetylated Hyaluronate", "Panthenol", "Betaine", "Trehalose", "Ectoin",
  "Hydroxyethyl Urea", "Beta-Glucan", "Polyglutamic Acid", "Sorbitol", "Propanediol",
];

const SOOTHING = [
  "Panthenol", "Madecassoside", "Asiaticoside", "Asiatic Acid", "Madecassic Acid",
  "Centella Asiatica Extract", "Centella Asiatica Leaf Extract", "Allantoin", "Beta-Glucan",
  "Bisabolol", "Dipotassium Glycyrrhizate", "Glycyrrhizic Acid", "Ectoin",
  "Houttuynia Cordata Extract", "Chamomilla Recutita Flower Extract",
];

const IRRITANTS = [
  "Fragrance", "Limonene", "Linalool", "Citronellol", "Geraniol",
  "Melaleuca Alternifolia Leaf Oil", "Rosmarinus Officinalis (Rosemary) Oil",
  "Pelargonium Graveolens Flower Oil", "Menthyl Lactate", "Menthoxypropanediol",
  "Isopropyl Alcohol",
];

const STRONG_ACTIVES = [
  "Glycolic Acid", "Lactic Acid", "Salicylic Acid", "Retinol", "Capryloyl Salicylic Acid",
  "Ascorbic Acid", "Tranexamic Acid",
];

const DRYING = [
  "Isopropyl Alcohol", "Alcohol Denat", "Sodium Cocoyl Isethionate",
  "Sodium Methyl Cocoyl Taurate", "Lauryl Hydroxysultaine",
];

const MALASSEZIA_FEEDERS = [
  "Caprylic/Capric Triglyceride", "Polysorbate 20", "Cetearyl Olivate", "Sorbitan Olivate",
  "Sorbitan Isostearate", "Sorbitan Laurate", "Sorbitan Oleate", "Sorbitan Palmitate",
  "Sorbitan Sesquioleate", "Isopropyl Palmitate", "Ethylhexyl Palmitate", "Ethylhexyl Stearate",
  "Glyceryl Stearate", "Glyceryl Stearate SE", "Glyceryl Stearate Citrate", "Glyceryl Oleate",
  "Glyceryl Caprylate", "Oleic Acid", "Linoleic Acid", "Linolenic Acid", "Palmitic Acid",
  "Stearic Acid", "Cetearyl Alcohol", "Cetyl Palmitate", "Butyrospermum Parkii Butter",
  "Cocos Nucifera Oil", "Olea Europaea Fruit Oil", "Helianthus Annuus Seed Oil",
  "Simmondsia Chinensis Seed Oil", "Macadamia Ternifolia Seed Oil",
  "Macadamia Integrifolia/Tetraphylla Seed Oil", "Vitis Vinifera Seed Oil",
  "Camellia Sinensis Seed Oil", "Salvia Hispanica Seed Oil", "Carthamus Tinctorius Seed Oil",
  "Moringa Oleifera Seed Oil", "Limnanthes Alba Seed Oil", "Hippophae Rhamnoides Fruit Oil",
  "Hippophae Rhamnoides Oil", "Pyrus Malus Seed Oil", "Citrus Grandis Seed Oil",
  "Glycine Soja Oil", "Oryza Sativa Bran Oil", "Hydrogenated Rice Bran Oil",
  "Galactomyces Ferment Filtrate", "Saccharomyces Ferment", "Saccharomyces Ferment Filtrate",
  "Lactobacillus Ferment", "Lactobacillus Ferment Filtrate", "Lactobacillus Ferment Lysate",
  "Bifida Ferment Lysate", "Lecithin", "Hydrogenated Lecithin", "Dextrin Palmitate",
  "Sucrose Palmitate", "Sucrose Distearate", "Sucrose Polystearate", "Jojoba Esters",
];

const BY_SKIN_TYPE: Record<SkinType, Rule[]> = {
  oily: [
    { verdict: "red", label: "May clog pores", names: COMEDOGENIC, topThirdOnly: true },
    { verdict: "red", label: "Heavy occlusives", names: HEAVY_OCCLUSIVE, topThirdOnly: true },
    { verdict: "green", label: "Helps control oil and pores", names: OIL_CONTROL },
  ],
  dry: [
    { verdict: "red", label: "Can be drying", names: DRYING, topThirdOnly: true },
    { verdict: "red", label: "Strong actives, may strip a dry barrier", names: STRONG_ACTIVES, topThirdOnly: true },
    { verdict: "green", label: "Rebuilds the moisture barrier", names: BARRIER_LIPIDS },
    { verdict: "green", label: "Draws in and holds water", names: HUMECTANTS },
  ],
  combination: [
    { verdict: "red", label: "May clog pores", names: COMEDOGENIC, topThirdOnly: true },
    { verdict: "green", label: "Balances oil without stripping", names: OIL_CONTROL },
    { verdict: "green", label: "Hydrates the dry areas", names: HUMECTANTS },
  ],
  sensitive: [
    { verdict: "red", label: "Common irritants", names: IRRITANTS },
    { verdict: "red", label: "Strong actives, introduce slowly", names: STRONG_ACTIVES },
    { verdict: "green", label: "Calms and soothes", names: SOOTHING },
    { verdict: "green", label: "Supports a compromised barrier", names: BARRIER_LIPIDS },
  ],
  normal: [
    { verdict: "red", label: "Common irritants", names: IRRITANTS },
    { verdict: "green", label: "Keeps a healthy barrier healthy", names: BARRIER_LIPIDS },
    { verdict: "green", label: "Everyday hydration", names: HUMECTANTS },
  ],
  "acne-prone": [
    { verdict: "red", label: "May clog pores", names: COMEDOGENIC, topThirdOnly: true },
    { verdict: "red", label: "Feeds malassezia (fungal acne)", names: MALASSEZIA_FEEDERS },
    { verdict: "green", label: "Targets breakouts", names: OIL_CONTROL },
    { verdict: "green", label: "Calms inflammation", names: SOOTHING },
  ],
};

const norm = (s: string) => s.trim().toLowerCase();

function hits(ingredients: string[], names: string[], topThirdOnly = false): string[] {
  const cut = topThirdOnly ? Math.max(1, Math.ceil(ingredients.length / 3)) : ingredients.length;
  const want = new Set(names.map(norm));
  const scope = ingredients.slice(0, cut);
  return [...new Set(scope.filter((x) => want.has(norm(x))))];
}

export interface IngredientFlag {
  verdict: Verdict;
  label: string;
  matched: string[];
}

export const hasIngredientData = (ingredients: string[] | null | undefined) =>
  Array.isArray(ingredients) && ingredients.length > 0;

export function getFlags(
  ingredients: string[] | null | undefined,
  skinType: SkinType
): IngredientFlag[] {
  if (!hasIngredientData(ingredients)) return [];
  const ing = ingredients as string[];
  const flags: IngredientFlag[] = [];
  for (const rule of BY_SKIN_TYPE[skinType]) {
    const matched = hits(ing, rule.names, rule.topThirdOnly);
    if (matched.length) flags.push({ verdict: rule.verdict, label: rule.label, matched });
  }
  return flags.sort((a, b) => (a.verdict === b.verdict ? 0 : a.verdict === "red" ? -1 : 1));
}

export function isFungalAcneSafe(ingredients: string[] | null | undefined): boolean | null {
  if (!hasIngredientData(ingredients)) return null;
  return hits(ingredients as string[], MALASSEZIA_FEEDERS).length === 0;
}

export function readSkinType(): SkinType | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("skintea_skin_type");
  if (!raw) return null;
  const v = raw.trim().toLowerCase().replace(/[_\s]+/g, "-");
  const allowed: SkinType[] = ["oily", "dry", "combination", "normal", "sensitive", "acne-prone"];
  return (allowed as string[]).includes(v) ? (v as SkinType) : null;
}
