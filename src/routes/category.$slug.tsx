import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import AppFrame from "@/components/AppFrame";
import BottomNav from "@/components/BottomNav";
import ProductCard, { formatCompact } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = [
  "Skincare",
  "Lip",
  "Face",
  "Sunscreen",
  "Cheek",
  "Bodycare",
  "Eye",
  "Device",
  "Fragrance",
] as const;

type RankedProduct = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  product_type: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  product_url: string | null;
  product_family_name: string | null;
  shade_name: string | null;
  size_variant: string | null;
  source: string | null;
  metric_value: number;
  metric_secondary: number;
};

type SearchProduct = {
  id: string;
  name: string;
  brand: string | null;
  product_family_name: string | null;
  price: number | null;
};

type SubcategoryRow = {
  category: string | null;
  subcategory: string | null;
  product_type: string | null;
};

type FacetRow = {
  brand: string;
  product_count: number;
  min_price: number | null;
  max_price: number | null;
};

type Rail = "tiktok" | "soaring" | "recommended";

const EMPTY_RAILS: Record<Rail, RankedProduct[]> = {
  tiktok: [],
  soaring: [],
  recommended: [],
};

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} rankings — Skintea` },
      {
        name: "description",
        content: `Browse ${params.slug} products ranked by real social activity and tagged opinions.`,
      },
      { property: "og:title", content: `${params.slug} rankings — Skintea` },
      {
        property: "og:description",
        content: `Browse ${params.slug} products ranked by real social activity and tagged opinions.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [rankings, setRankings] = useState(EMPTY_RAILS);
  const [brands, setBrands] = useState<FacetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);

  useEffect(() => {
    setSelectedSubcategory(null);
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.rpc("distinct_product_subcategories");
      if (cancelled) return;
      if (error) {
        console.error("distinct_product_subcategories failed", error);
        setSubcategories([]);
        return;
      }

      const categorySubcategories = new Set<string>();
      for (const row of (data ?? []) as SubcategoryRow[]) {
        if (row.category === slug && row.subcategory) {
          categorySubcategories.add(row.subcategory);
        }
      }
      setSubcategories(
        Array.from(categorySubcategories).sort((a, b) => a.localeCompare(b)),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const args = {
        p_category: slug,
        p_subcategory: selectedSubcategory,
        p_product_type: null,
        p_limit: 20,
      };
      const [tiktokResult, soaringResult, recommendedResult, facetsResult] =
        await Promise.all([
          supabase.rpc("ranked_products_tiktok", args as never),
          supabase.rpc("ranked_products_soaring", args as never),
          supabase.rpc("ranked_products_recommended", args as never),
          supabase.rpc("browse_facets", {
            p_q: null,
            p_category: slug,
            p_subcategory: selectedSubcategory,
            p_product_type: null,
          }),
        ]);

      if (cancelled) return;
      if (tiktokResult.error) console.error("ranked_products_tiktok failed", tiktokResult.error);
      if (soaringResult.error) console.error("ranked_products_soaring failed", soaringResult.error);
      if (recommendedResult.error) {
        console.error("ranked_products_recommended failed", recommendedResult.error);
      }
      if (facetsResult.error) console.error("browse_facets failed", facetsResult.error);

      setRankings({
        tiktok: (tiktokResult.data ?? []) as RankedProduct[],
        soaring: (soaringResult.data ?? []) as RankedProduct[],
        recommended: (recommendedResult.data ?? []) as RankedProduct[],
      });
      setBrands((facetsResult.data ?? []) as unknown as FacetRow[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, selectedSubcategory]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const query = searchQuery.trim();
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,brand,product_family_name,price")
        .eq("is_active", true)
        .neq("category", "Goods")
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
        .limit(20);
      if (cancelled) return;
      if (error) console.error("Product search failed", error);

      const seen = new Set<string>();
      setSearchResults(
        ((data ?? []) as SearchProduct[]).filter((product) => {
          const key = product.product_family_name ?? product.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }),
      );
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const seeAllSearch = useMemo(
    () => ({
      category: slug,
      sort: "popular",
      page: 1,
      ...(selectedSubcategory ? { subcategory: selectedSubcategory } : {}),
    }),
    [selectedSubcategory, slug],
  );
  const showDropdown = searchQuery.trim().length >= 2 && searchResults.length > 0;

  function submitSearch() {
    const query = searchQuery.trim();
    navigate({
      to: "/browse",
      search: { sort: "popular", page: 1, ...(query ? { q: query } : {}) },
    });
  }

  return (
    <AppFrame fluid>
      <div className="min-h-screen bg-background pb-24 text-brand-espresso">
        <header className="flex items-center gap-3 border-b border-brand-border bg-card px-4 py-3.5 md:px-0">
          <Link to="/products" className="block shrink-0 no-underline">
            <div className="leading-none">
              <span className="font-display text-[22px] font-bold italic text-brand-espresso">Skin</span>
              <span className="font-display text-[22px] font-bold italic text-brand-crimson">tea</span>
            </div>
            <div className="mt-0.5 text-[8px] font-medium text-brand-muted">
              Got Skintea? Spill it.
            </div>
          </Link>

          <div className="relative flex-1">
            <div
              className="flex items-center gap-2 rounded-md border-[1.5px] border-brand-espresso bg-card px-2.5 py-1.5"
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
            >
              <button type="button" aria-label="Search" onClick={submitSearch} className="flex items-center">
                <Search size={14} className="text-brand-espresso" strokeWidth={2.5} />
              </button>
              <input
                type="text"
                placeholder="Search products, brands"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="min-w-0 flex-1 border-none bg-transparent text-[12px] font-medium text-brand-espresso outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="flex items-center"
                >
                  <X size={14} className="text-brand-espresso" />
                </button>
              )}
            </div>

            {showDropdown && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[100] max-h-80 overflow-y-auto rounded-md border-[1.5px] border-brand-espresso bg-card">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      navigate({ to: "/product-detail/$id", params: { id: result.id } });
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="block w-full border-b border-brand-border bg-card px-3 py-2 text-left last:border-b-0 hover:bg-brand-cream"
                  >
                    <div className="text-[11px] font-medium text-brand-muted">{result.brand}</div>
                    <div className="text-[13px] font-medium text-brand-espresso">
                      {result.product_family_name ?? result.name}
                    </div>
                    {result.price != null && (
                      <div className="mt-0.5 text-[12px] font-bold text-brand-espresso">${result.price}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <nav className="flex overflow-x-auto border-b border-brand-border bg-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            to="/products"
            className="shrink-0 border-b-[3px] border-transparent px-3.5 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-brand-espresso no-underline hover:border-brand-crimson hover:text-brand-crimson"
          >
            All
          </Link>
          {CATEGORIES.map((category) => {
            const active = category === slug;
            return (
              <Link
                key={category}
                to="/category/$slug"
                params={{ slug: category }}
                className={
                  active
                    ? "shrink-0 border-b-[3px] border-brand-crimson px-3.5 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-brand-crimson no-underline"
                    : "shrink-0 border-b-[3px] border-transparent px-3.5 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-brand-espresso no-underline hover:border-brand-crimson hover:text-brand-crimson"
                }
              >
                {category}
              </Link>
            );
          })}
        </nav>

        {subcategories.length >= 2 && (
          <div className="flex gap-2 overflow-x-auto border-b border-brand-border bg-card px-4 py-3 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSelectedSubcategory(null)}
              className={
                selectedSubcategory === null
                  ? "shrink-0 rounded-full bg-brand-espresso px-3 py-1.5 text-[12px] font-semibold text-white"
                  : "shrink-0 rounded-full border border-brand-border bg-card px-3 py-1.5 text-[12px] font-semibold text-brand-espresso"
              }
            >
              All
            </button>
            {subcategories.map((subcategory) => (
              <button
                key={subcategory}
                type="button"
                onClick={() => setSelectedSubcategory(subcategory)}
                className={
                  selectedSubcategory === subcategory
                    ? "shrink-0 rounded-full bg-brand-espresso px-3 py-1.5 text-[12px] font-semibold text-white"
                    : "shrink-0 rounded-full border border-brand-border bg-card px-3 py-1.5 text-[12px] font-semibold text-brand-espresso"
                }
              >
                {subcategory}
              </button>
            ))}
          </div>
        )}

        <main className="mx-auto w-full max-w-[1180px] py-5 md:py-8">
          <h1 className="px-4 pb-5 text-[24px] font-bold text-brand-espresso md:px-0">
            {slug}
          </h1>
          <RankingSection
            title="TikTok Ranking"
            subtitle="Ranked by total TikTok views"
            products={rankings.tiktok}
            loading={loading}
            seeAllSearch={seeAllSearch}
            metric={(product) => `${formatCompact(product.metric_value)} TikTok views`}
            ranked
            onSave={() => setShowLogin(true)}
          />
          <RankingSection
            title="Soaring"
            subtitle="Most new Reels in the last 90 days"
            products={rankings.soaring}
            loading={loading}
            seeAllSearch={seeAllSearch}
            metric={(product) => `${product.metric_value} new Reels`}
            onSave={() => setShowLogin(true)}
          />
          <RankingSection
            title="Highest Recommended"
            subtitle="Products with 10 or more tagged opinions"
            products={rankings.recommended}
            loading={loading}
            seeAllSearch={seeAllSearch}
            recommended
            onSave={() => setShowLogin(true)}
          />

          {brands.length > 0 && (
            <section className="px-4 pb-8 md:px-0">
              <h2 className="mb-3 text-[18px] font-bold text-brand-espresso">Popular brands</h2>
              <div className="flex flex-wrap gap-2">
                {brands.slice(0, 12).map((brand) => (
                  <Link
                    key={brand.brand}
                    to="/browse"
                    search={{
                      category: slug,
                      brands: brand.brand,
                      sort: "popular",
                      page: 1,
                    }}
                    className="rounded-full border border-brand-border bg-card px-3 py-1.5 text-[12px] font-semibold text-brand-espresso no-underline hover:border-brand-crimson hover:text-brand-crimson"
                  >
                    {brand.brand}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        {showLogin && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-foreground/50 p-5"
            onClick={() => setShowLogin(false)}
          >
            <div
              className="relative w-full max-w-80 rounded-md border-[1.5px] border-brand-espresso bg-card p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowLogin(false)}
                className="absolute right-3 top-3 text-brand-espresso"
              >
                <X size={18} />
              </button>
              <h2 className="mb-1.5 text-[18px] font-bold text-brand-espresso">Sign in to save products</h2>
              <p className="mb-4 text-[13px] text-brand-espresso">
                Build your watchlist and get notified when reviews shift.
              </p>
              <Link
                to="/login"
                className="block w-full rounded bg-brand-crimson px-3 py-3 text-center text-[13px] font-bold text-primary-foreground no-underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    </AppFrame>
  );
}

function RankingSection({
  title,
  subtitle,
  products,
  loading,
  seeAllSearch,
  metric,
  ranked,
  recommended,
  onSave,
}: {
  title: string;
  subtitle: string;
  products: RankedProduct[];
  loading: boolean;
  seeAllSearch: {
    category: string;
    subcategory?: string;
    sort: string;
    page: number;
  };
  metric?: (product: RankedProduct) => string;
  ranked?: boolean;
  recommended?: boolean;
  onSave: () => void;
}) {
  return (
    <section className="px-4 pb-8 md:px-0">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-brand-espresso">{title}</h2>
          <p className="mt-0.5 text-[11px] text-brand-muted">{subtitle}</p>
        </div>
        <Link
          to="/browse"
          search={seeAllSearch}
          className="shrink-0 text-[12px] font-semibold text-brand-crimson underline"
        >
          See all
        </Link>
      </div>

      {loading ? (
        <div className="flex snap-x gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`${title}-skeleton-${index}`}
              className="w-[128px] shrink-0 snap-start overflow-hidden rounded-md border border-brand-border bg-card"
            >
              <div className="aspect-square animate-pulse bg-brand-cream" />
              <div className="space-y-2 p-3">
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-brand-border" />
                <div className="h-3 w-full animate-pulse rounded bg-brand-border" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-brand-border" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-md border border-brand-border bg-card px-4 py-8 text-[13px] text-brand-muted">
          Not enough data yet
        </div>
      ) : (
        <div className="flex snap-x gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.map((product, index) => (
            <div key={product.id} className="w-[128px] shrink-0 snap-start">
              <ProductCard
                id={product.id}
                brand={product.brand ?? ""}
                name={product.product_family_name ?? product.name}
                price={product.price}
                currency={product.currency}
                imageUrl={product.image_url}
                rank={ranked ? index + 1 : undefined}
                metricLabel={metric?.(product)}
                recommendPct={recommended ? product.metric_value : undefined}
                decisiveTags={recommended ? product.metric_secondary : undefined}
                onSave={onSave}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}