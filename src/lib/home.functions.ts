import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { aggregate, isOpinionRow, MIN_TAGGED, SKIN_TYPES } from "@/lib/opinionAggregate";

type Product = { id: string; name: string; brand: string | null; image_url: string | null };
type OpinionRow = {
  id: string;
  product_id: string | null;
  sentiment: string | null;
  skin_type: string | null;
  platform: string;
  subreddit: string | null;
  quote: string | null;
  content: string | null;
  source_url: string | null;
  tagged_at: string | null;
  created_at: string | null;
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

async function allOpinionRows(client: ReturnType<typeof publicClient>) {
  const rows: OpinionRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from("social_review_tags")
      .select("id,product_id,sentiment,skin_type,platform,subreddit,quote,content,source_url,tagged_at,created_at")
      .not("sentiment", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as OpinionRow[]));
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows.filter(isOpinionRow);
}

function reviewText(row: OpinionRow) {
  const text = (row.quote || row.content || "").trim();
  if (text.length <= 280) return text;
  const slice = text.slice(0, 277);
  const sentence = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  return `${(sentence > 120 ? slice.slice(0, sentence + 1) : slice).trim()}…`;
}

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const client = publicClient();
  const opinions = await allOpinionRows(client);
  const productIds = [...new Set(opinions.map((row) => row.product_id).filter((id): id is string => Boolean(id)))];
  const now = new Date();
  const utcWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));

  const [productsResult, activeProductCountResult, brandFacetsResult, concernsResult, productConcernsResult, treatmentConcernsResult, treatmentsResult, treatmentReviewsResult, clinicsResult, clinicTreatmentsResult, clinicReviewsResult, clinicScoresResult, weekPostsResult, weekSurgeryResult] = await Promise.all([
    productIds.length ? client.from("products").select("id,name,brand,image_url").in("id", productIds).eq("is_active", true) : Promise.resolve({ data: [], error: null }),
    client.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    client.rpc("catalog_brand_facets", { p_category: null, p_subcategory: null, p_product_type: null, p_search: null }),
    client.from("concerns").select("id,slug,label,sort_order").eq("is_active", true).order("sort_order"),
    client.from("product_concerns").select("product_id,concern_id,confidence").in("confidence", ["high", "medium"]),
    client.from("treatment_concerns").select("treatment_id,concern_id,confidence"),
    client.from("treatments").select("id,name,slug,subtitle").eq("active", true),
    client.from("treatment_reviews").select("treatment_id"),
    client.from("clinics").select("id,name,neighborhood,distance_miles").eq("listing_filter", "passed").ilike("neighborhood", "%Koreatown%"),
    client.from("clinic_treatments").select("clinic_id,treatment_id"),
    client.from("clinic_reviews").select("id,clinic_id"),
    client.from("clinic_skin_scores").select("clinic_id,recommend_pct,field_provenance"),
    client.from("posts").select("id", { count: "exact", head: true }).gte("created_at", utcWeekStart.toISOString()),
    client.from("surgery_posts").select("id", { count: "exact", head: true }).gte("created_at", utcWeekStart.toISOString()),
  ]);

  const fatal = [productsResult, concernsResult, productConcernsResult, treatmentConcernsResult, treatmentsResult].find((result) => result.error);
  if (fatal?.error) throw fatal.error;

  const products = (productsResult.data ?? []) as Product[];
  const productById = new Map(products.map((product) => [product.id, product]));
  const stats = new Map<string, Record<string, { pct: number; n: number }>>();
  for (const product of products) {
    const bySkin: Record<string, { pct: number; n: number }> = {};
    for (const skin of SKIN_TYPES) {
      const matching = opinions.filter((row) => row.product_id === product.id && row.skin_type?.toLowerCase() === skin);
      if (matching.length < MIN_TAGGED) continue;
      const result = aggregate(matching);
      if (result.recommendPct != null) bySkin[skin] = { pct: result.recommendPct, n: matching.length };
    }
    if (Object.keys(bySkin).length) stats.set(product.id, bySkin);
  }
  const productStats = products
    .filter((product) => stats.has(product.id))
    .map((product) => ({ ...product, skin: stats.get(product.id) ?? {} }));

  const concerns = (concernsResult.data ?? []).map((concern: any) => ({
    id: concern.id as string,
    slug: concern.slug as string,
    label: concern.label as string,
    sortOrder: concern.sort_order as number,
    productCount: new Set((productConcernsResult.data ?? []).filter((row: any) => row.concern_id === concern.id).map((row: any) => row.product_id)).size,
    treatmentCount: new Set((treatmentConcernsResult.data ?? []).filter((row: any) => row.concern_id === concern.id).map((row: any) => row.treatment_id)).size,
  }));

  const treatmentRows = (treatmentsResult.data ?? []) as Array<{ id: string; name: string; slug: string | null; subtitle: string | null }>;
  const treatmentReviewCounts = new Map<string, number>();
  for (const row of treatmentReviewsResult.data ?? []) {
    if (!row.treatment_id) continue;
    treatmentReviewCounts.set(row.treatment_id, (treatmentReviewCounts.get(row.treatment_id) ?? 0) + 1);
  }
  const bridgeConcern = [...concerns].sort((a, b) => b.treatmentCount - a.treatmentCount || a.sortOrder - b.sortOrder)[0] ?? null;
  const bridgeIds = bridgeConcern
    ? [...new Set((treatmentConcernsResult.data ?? []).filter((row: any) => row.concern_id === bridgeConcern.id).map((row: any) => row.treatment_id as string))]
    : [];
  const bridgeTreatments = bridgeIds.map((id) => treatmentRows.find((row) => row.id === id)).filter((row): row is NonNullable<typeof row> => Boolean(row?.slug)).slice(0, 2).map((row) => ({ ...row, reviewCount: treatmentReviewCounts.get(row.id) ?? 0 }));

  const brands = (brandFacetsResult.data ?? []).slice(0, 18).map((row: any) => ({ name: row.brand as string, count: Number(row.n) }));

  const latestTea = [...opinions]
    .filter((row) => row.product_id && row.source_url && reviewText(row))
    .sort((a, b) => String(b.tagged_at ?? b.created_at ?? "").localeCompare(String(a.tagged_at ?? a.created_at ?? "")))
    .slice(0, 2)
    .map((row) => ({
      id: row.id,
      source: row.subreddit ? `r/${row.subreddit}` : row.platform,
      sentiment: row.sentiment ?? "",
      quote: reviewText(row),
      sourceUrl: row.source_url ?? "",
      product: row.product_id ? productById.get(row.product_id) ?? null : null,
    }));

  const treatmentById = new Map(treatmentRows.map((row) => [row.id, row]));
  const clinics = (clinicsResult.data ?? []).map((clinic: any) => {
    const mappedTreatmentIds = new Set((clinicTreatmentsResult.data ?? []).filter((row: any) => row.clinic_id === clinic.id).map((row: any) => row.treatment_id as string));
    const reviewCount = (clinicReviewsResult.data ?? []).filter((row: any) => row.clinic_id === clinic.id).length;
    const measuredScores = (clinicScoresResult.data ?? []).filter((row: any) => {
      if (row.clinic_id !== clinic.id || row.recommend_pct == null) return false;
      const provenance = row.field_provenance?.recommend_pct;
      return provenance?.source === "skintea_measured" && Number.isFinite(Number(provenance?.n)) && Number(provenance.n) > 0;
    });
    const measuredN = measuredScores.reduce((sum: number, row: any) => sum + Number(row.field_provenance.recommend_pct.n), 0);
    const recommendPct = reviewCount >= 5 && measuredN > 0
      ? Math.round(measuredScores.reduce((sum: number, row: any) => sum + Number(row.recommend_pct) * Number(row.field_provenance.recommend_pct.n), 0) / measuredN)
      : null;
    return {
      id: clinic.id as string,
      name: clinic.name as string,
      neighborhood: clinic.neighborhood as string | null,
      distanceMiles: clinic.distance_miles as number | null,
      mappedTreatmentCount: mappedTreatmentIds.size,
      reviewCount,
      recommendPct,
      treatments: [...mappedTreatmentIds].map((id) => treatmentById.get(id)?.name).filter(Boolean).slice(0, 3),
    };
  }).sort((a, b) => {
    const recommendOrder = (b.recommendPct ?? -1) - (a.recommendPct ?? -1);
    return recommendOrder || b.reviewCount - a.reviewCount || b.mappedTreatmentCount - a.mappedTreatmentCount || a.name.localeCompare(b.name);
  }).slice(0, 3);

  const datedReviews = opinions.map((row) => ({ productId: row.product_id, at: row.tagged_at ?? row.created_at })).filter((row): row is { productId: string; at: string } => Boolean(row.productId && row.at));
  return {
    trust: opinions.length ? { taggedCount: opinions.length, platformCount: new Set(opinions.map((row) => row.platform).filter(Boolean)).size } : null,
    productStats,
    concerns,
    bridge: bridgeConcern ? { concern: bridgeConcern, treatments: bridgeTreatments } : null,
    brands,
    activeProductCount: activeProductCountResult.count ?? 0,
    latestTea,
    clinics,
    weeklyStoryCount: (weekPostsResult.count ?? 0) + (weekSurgeryResult.count ?? 0),
    datedReviews,
  };
});

export const getConcernData = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const client = publicClient();
    const { data: concern, error } = await client.from("concerns").select("id,slug,label").eq("slug", data.slug).eq("is_active", true).maybeSingle();
    if (error) throw error;
    if (!concern) return null;
    const [productLinks, treatmentLinks] = await Promise.all([
      client.from("product_concerns").select("product_id").eq("concern_id", concern.id).in("confidence", ["high", "medium"]),
      client.from("treatment_concerns").select("treatment_id").eq("concern_id", concern.id),
    ]);
    if (productLinks.error) throw productLinks.error;
    if (treatmentLinks.error) throw treatmentLinks.error;
    const productIds = [...new Set((productLinks.data ?? []).map((row) => row.product_id))];
    const treatmentIds = [...new Set((treatmentLinks.data ?? []).map((row) => row.treatment_id))];
    const [products, treatments] = await Promise.all([
      productIds.length ? client.from("products").select("id,name,brand,image_url,price,currency").in("id", productIds).eq("is_active", true).order("brand") : Promise.resolve({ data: [], error: null }),
      treatmentIds.length ? client.from("treatments").select("id,name,slug,subtitle,downtime,average_cost").in("id", treatmentIds).eq("active", true).order("sort_order") : Promise.resolve({ data: [], error: null }),
    ]);
    if (products.error) throw products.error;
    if (treatments.error) throw treatments.error;
    return { concern, products: products.data ?? [], treatments: treatments.data ?? [] };
  });