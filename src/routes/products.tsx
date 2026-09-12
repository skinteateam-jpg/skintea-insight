import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";

import AppFrame from "@/components/AppFrame";
import BottomNav from "@/components/BottomNav";
import ProductCard, { formatCompact } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: "Skintea — Real product rankings" },
      {
        name: "description",
        content:
          "Browse skincare and makeup ranked by real TikTok views, recent Instagram Reels and tagged opinions.",
      },
      { property: "og:title", content: "Skintea — Real product rankings" },
      {
        property: "og:description",
        content:
          "Skincare and makeup ranked by real social activity and tagged opinions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

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

const CATEGORIES = [
  "All",
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

const SECTION_CATEGORIES = [
  "Skincare",
  "Lip",
  "Face",
  "Sunscreen",
  "Cheek",
  "Bodycare",
  "Device",
  "Fragrance",
  "Eye",
] as const;

function ProductsPage() {
  const navigate = useNavigate();
  const [soaring, setSoaring] = useState<RankedProduct[]>([]);
  const [soaringLoading, setSoaringLoading] = useState(true);
  const [categoryRankings, setCategoryRankings] = useState<Record<string, RankedProduct[]>>({});
  const [showLogin, setShowLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [categorySubs, setCategorySubs] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setSoaringLoading(true);
      const args = {
        p_category: null,
        p_subcategory: null,
        p_product_type: null,
        p_limit: 20,
      };
      const soaringResult = await supabase.rpc("ranked_products_soaring", args as never);

      if (cancelled) return;
      if (soaringResult.error) console.error("ranked_products_soaring failed", soaringResult.error);
      setSoaring((soaringResult.data ?? []) as RankedProduct[]);
      setSoaringLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCategoryRankings({});

    const requests = SECTION_CATEGORIES.map(async (category) => {
      const result = await supabase.rpc(
        "ranked_products_tiktok",
        {
          p_category: category,
          p_subcategory: null,
          p_product_type: null,
          p_limit: 20,
        } as never,
      );
      if (cancelled) return;
      if (result.error) console.error("ranked_products_tiktok failed", result.error);
      setCategoryRankings((current) => ({
        ...current,
        [category]: (result.data ?? []) as RankedProduct[],
      }));
    });

    void Promise.all(requests);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("distinct_product_subcategories");
      if (cancelled) return;
      if (error) {
        console.error("distinct_product_subcategories failed", error);
        return;
      }

      const groups = new Map<string, Set<string>>();
      for (const row of (data ?? []) as SubcategoryRow[]) {
        if (!row.category || !row.subcategory || row.category === "Goods") continue;
        const existing = groups.get(row.category) ?? new Set<string>();
        existing.add(row.subcategory);
        groups.set(row.category, existing);
      }

      const next: Record<string, string[]> = {};
      for (const [category, subcategories] of groups) {
        next[category] = Array.from(subcategories).sort((a, b) => a.localeCompare(b));
      }
      setCategorySubs(next);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
      const unique = ((data ?? []) as SearchProduct[]).filter((product) => {
        const key = product.product_family_name ?? product.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setSearchResults(unique);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

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
          {CATEGORIES.map((category) =>
            category === "All" ? (
              <Link
                key={category}
                to="/products"
                className="shrink-0 border-b-[3px] border-brand-crimson px-3.5 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-brand-crimson no-underline"
              >
                {category}
              </Link>
            ) : (
              <Link
                key={category}
                to="/category/$slug"
                params={{ slug: category }}
                className="shrink-0 border-b-[3px] border-transparent px-3.5 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-brand-espresso no-underline hover:border-brand-crimson hover:text-brand-crimson"
              >
                {category}
              </Link>
            ),
          )}
        </nav>

        <main className="mx-auto w-full max-w-[1180px] py-5 md:py-8">
          <RankingSection
            title="Soaring"
            subtitle="Most new Reels in the last 90 days"
            products={soaring}
            loading={soaringLoading}
            metric={(product) => `${product.metric_value} new Reels`}
            onSave={() => setShowLogin(true)}
          />
          {SECTION_CATEGORIES.map((category) => {
            const products = categoryRankings[category];
            if (!products || products.length < 3) return null;
            return (
              <CategorySection
                key={category}
                category={category}
                products={products}
                subcategories={categorySubs[category] ?? []}
                onSave={() => setShowLogin(true)}
              />
            );
          })}
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
  metric,
  onSave,
}: {
  title: string;
  subtitle: string;
  products: RankedProduct[];
  loading: boolean;
  metric?: (product: RankedProduct) => string;
  onSave: () => void;
}) {
  return (
    <section className="px-4 pb-8 md:px-0">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-brand-espresso">{title}</h2>
          <p className="mt-0.5 text-[11px] text-brand-muted">{subtitle}</p>
        </div>
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
          Not enough data yet.
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
                metricLabel={metric?.(product)}
                onSave={onSave}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CategorySection({
  category,
  products,
  subcategories,
  onSave,
}: {
  category: string;
  products: RankedProduct[];
  subcategories: string[];
  onSave: () => void;
}) {
  return (
    <section className="px-4 pb-10 md:px-0">
      <Link
        to="/category/$slug"
        params={{ slug: category }}
        className="mb-3 flex items-center justify-between text-brand-espresso no-underline"
      >
        <h2 className="text-[16px] font-semibold">{category}</h2>
        <ChevronRight size={18} className="text-brand-muted" />
      </Link>

      <div className="grid grid-cols-3 gap-3">
        {products.slice(0, 3).map((product, index) => (
          <div key={product.id} className="relative min-w-0">
            <ProductCard
              id={product.id}
              brand={product.brand ?? ""}
              name={product.product_family_name ?? product.name}
              price={product.price}
              currency={product.currency}
              imageUrl={product.image_url}
              metricLabel={`${formatCompact(product.metric_value)} TikTok views`}
              onSave={onSave}
            />
            <span className="pointer-events-none absolute left-2 top-2 rounded-sm bg-brand-espresso px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>

      {subcategories.length >= 2 && (
        <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-md border border-brand-border bg-card">
          {subcategories.map((subcategory) => {
            const thumbnail = products.find(
              (product) => product.subcategory === subcategory && product.image_url,
            )?.image_url;
            return (
              <Link
                key={subcategory}
                to="/browse"
                search={{ category, subcategory, sort: "popular", page: 1 }}
                className="flex min-h-14 items-center gap-2 border-b border-r border-brand-border p-2 text-[12px] font-semibold text-brand-espresso no-underline hover:bg-brand-cream"
              >
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-brand-cream">
                  {thumbnail && (
                    <img
                      src={thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">{subcategory}</span>
                <ChevronRight size={14} className="shrink-0 text-brand-muted" />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}