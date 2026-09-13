import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import AppFrame from "@/components/AppFrame";
import BottomNav from "@/components/BottomNav";
import ProductCard, { formatCompact } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_LABEL_TO_SLUG } from "@/lib/categorySlugs";

type CategoryNode = {
  slug: string;
  level: number;
  parent_slug: string | null;
  label: string;
  sort_order: number;
  is_navigable: boolean;
};


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

type ProductTaxonomyRow = {
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

function labelFromSlug(slug: string) {
  const known = Object.entries(CATEGORY_LABEL_TO_SLUG).find(([, value]) => value === slug);
  const source = known ? known[0] : slug.replace(/-/g, " ");
  return source.replace(/\b\w/g, (character) => character.toUpperCase());
}

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
  head: ({ params }) => {
    const label = labelFromSlug(params.slug);
    return {
      meta: [
        { title: `${label} rankings — Skintea` },
        {
          name: "description",
          content: `Browse ${label} products ranked by real social activity and tagged opinions.`,
        },
        { property: "og:title", content: `${label} rankings — Skintea` },
        {
          property: "og:description",
          content: `Browse ${label} products ranked by real social activity and tagged opinions.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [taxonomyRows, setTaxonomyRows] = useState<ProductTaxonomyRow[]>([]);
  const [rankings, setRankings] = useState(EMPTY_RAILS);
  const [brands, setBrands] = useState<FacetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("slug,level,parent_slug,label,sort_order,is_navigable")
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("product_categories fetch failed", error);
        setTree([]);
        return;
      }
      setTree((data ?? []) as CategoryNode[]);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const parentTabs = useMemo(
    () => tree.filter((node) => node.level === 1 && node.is_navigable),
    [tree],
  );
  const currentParent = useMemo(
    () => tree.find((node) => node.level === 1 && node.slug === slug) ?? null,
    [tree, slug],
  );
  const categoryLabel = currentParent?.label ?? null;

  // Legacy label URLs (/category/Skincare, /category/Cheek) redirect to the slug URL.
  const redirectSlug = useMemo(() => {
    if (tree.length === 0 || currentParent) return null;
    const labelMatch = tree.find(
      (node) => node.level === 1 && node.label.toLowerCase() === slug.trim().toLowerCase(),
    );
    if (labelMatch) return labelMatch.slug;
    const mapped = CATEGORY_LABEL_TO_SLUG[slug.trim().toLowerCase()];
    if (mapped && tree.some((node) => node.level === 1 && node.slug === mapped)) return mapped;
    return null;
  }, [tree, currentParent, slug]);
  const notFound = tree.length > 0 && !currentParent && !redirectSlug;

  useEffect(() => {
    if (!redirectSlug) return;
    navigate({ to: "/category/$slug", params: { slug: redirectSlug }, replace: true });
  }, [redirectSlug, navigate]);

  useEffect(() => {
    setSelectedSubcategory(null);
    setSelectedProductType(null);
    if (!categoryLabel) {
      setTaxonomyRows([]);
      return;
    }
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("subcategory,product_type")
        .eq("category", categoryLabel)
        .eq("is_active", true)
        .limit(5000);
      if (cancelled) return;
      if (error) {
        console.error("product taxonomy counts failed", error);
        setTaxonomyRows([]);
        return;
      }
      setTaxonomyRows((data ?? []) as ProductTaxonomyRow[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [categoryLabel]);
  const childTabs = useMemo(() => {
    if (!currentParent) return [] as CategoryNode[];
    return tree.filter(
      (node) =>
        node.level === 2 &&
        node.parent_slug === currentParent.slug &&
        taxonomyRows.some((row) => row.subcategory === node.label),
    );
  }, [tree, currentParent, taxonomyRows]);
  const selectedChild = useMemo(
    () => childTabs.find((node) => node.label === selectedSubcategory) ?? null,
    [childTabs, selectedSubcategory],
  );
  const grandchildChips = useMemo(() => {
    if (!selectedChild) return [] as CategoryNode[];
    return tree.filter(
      (node) =>
        node.level === 3 &&
        node.parent_slug === selectedChild.slug &&
        taxonomyRows.some(
          (row) =>
            row.subcategory === selectedChild.label && row.product_type === node.label,
        ),
    );
  }, [tree, selectedChild, taxonomyRows]);

  useEffect(() => {
    if (!categoryLabel) {
      setRankings(EMPTY_RAILS);
      setBrands([]);
      setLoading(tree.length === 0);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const commonArgs = {
        p_category: categoryLabel,
        p_subcategory: selectedSubcategory,
        p_product_type: selectedProductType,
        p_limit: 20,
      };
      const [tiktokResult, soaringResult, recommendedResult, facetsResult] =
        await Promise.all([
          supabase.rpc("ranked_products_tiktok", { ...commonArgs, p_limit: 30 } as never),
          supabase.rpc("ranked_products_soaring", commonArgs as never),
          supabase.rpc("ranked_products_recommended", commonArgs as never),
          supabase.rpc(
            "browse_facets",
            {
              p_q: null,
              p_category: categoryLabel,
              p_subcategory: selectedSubcategory,
              p_product_type: selectedProductType,
            } as never,
          ),
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
  }, [categoryLabel, tree.length, selectedSubcategory, selectedProductType]);


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
          {parentTabs.map((category) => {
            const active = category.label === slug;
            return (
              <Link
                key={category.slug}
                to="/category/$slug"
                params={{ slug: category.label }}
                className={
                  active
                    ? "shrink-0 border-b-[3px] border-brand-crimson px-3.5 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-brand-crimson no-underline"
                    : "shrink-0 border-b-[3px] border-transparent px-3.5 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-brand-espresso no-underline hover:border-brand-crimson hover:text-brand-crimson"
                }
              >
                {category.label}
              </Link>
            );
          })}

        </nav>

        {childTabs.length > 0 && (
          <div className="flex gap-5 overflow-x-auto border-b border-brand-border bg-card px-4 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => {
                setSelectedSubcategory(null);
                setSelectedProductType(null);
              }}
              className={
                selectedSubcategory === null
                  ? "shrink-0 border-b-2 border-brand-espresso py-3 text-[12px] font-semibold text-brand-espresso"
                  : "shrink-0 border-b-2 border-transparent py-3 text-[12px] text-brand-muted"
              }
            >
              All
            </button>
            {childTabs.map((child) => (
              <button
                key={child.slug}
                type="button"
                onClick={() => {
                  setSelectedSubcategory(child.label);
                  setSelectedProductType(null);
                }}
                className={
                  selectedSubcategory === child.label
                    ? "shrink-0 border-b-2 border-brand-espresso py-3 text-[12px] font-semibold text-brand-espresso"
                    : "shrink-0 border-b-2 border-transparent py-3 text-[12px] text-brand-muted"
                }
              >
                {child.label}
              </button>
            ))}
          </div>
        )}

        {grandchildChips.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b border-brand-border bg-card px-4 py-2.5 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSelectedProductType(null)}
              className={
                selectedProductType === null
                  ? "shrink-0 rounded-full border border-brand-espresso bg-brand-espresso px-3 py-1 text-[11px] font-semibold text-primary-foreground"
                  : "shrink-0 rounded-full border border-brand-border bg-card px-3 py-1 text-[11px] font-medium text-brand-muted"
              }
            >
              All
            </button>
            {grandchildChips.map((node) => (
              <button
                key={node.slug}
                type="button"
                onClick={() => setSelectedProductType(node.label)}
                className={
                  selectedProductType === node.label
                    ? "shrink-0 rounded-full border border-brand-espresso bg-brand-espresso px-3 py-1 text-[11px] font-semibold text-primary-foreground"
                    : "shrink-0 rounded-full border border-brand-border bg-card px-3 py-1 text-[11px] font-medium text-brand-muted"
                }
              >
                {node.label}
              </button>
            ))}
          </div>
        )}


        <main className="mx-auto w-full max-w-[1180px] py-5 md:py-8">
          <RankingSection
            title="Soaring"
            subtitle="Most new Reels in the last 90 days"
            products={rankings.soaring}
            loading={loading}
            seeAllSearch={seeAllSearch}
            metric={(product) => `${product.metric_value} new Reels`}
            onSave={() => setShowLogin(true)}
          />
          <RankingGrid
            products={rankings.tiktok}
            loading={loading}
            seeAllSearch={seeAllSearch}
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

function RankingGrid({
  products,
  loading,
  seeAllSearch,
  onSave,
}: {
  products: RankedProduct[];
  loading: boolean;
  seeAllSearch: {
    category: string;
    subcategory?: string;
    sort: string;
    page: number;
  };
  onSave: () => void;
}) {
  return (
    <section className="px-4 pb-8 md:px-0">
      <div className="mb-3">
        <h1 className="text-[18px] font-bold text-brand-espresso">Ranking</h1>
        <p className="mt-0.5 text-[11px] text-brand-muted">Ranked by total TikTok views</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`ranking-skeleton-${index}`}
              className="min-w-0 overflow-hidden rounded-md border border-brand-border bg-card"
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
        <div className="grid grid-cols-3 gap-3">
          {products.map((product, index) => (
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
      )}

      <Link
        to="/browse"
        search={seeAllSearch}
        className="mt-4 inline-block text-[12px] font-semibold text-brand-crimson underline"
      >
        See all
      </Link>
    </section>
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