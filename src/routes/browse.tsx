import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AppFrame from "@/components/AppFrame";
import ProductCard, { formatCompact } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const PAGE_SIZE = 24;

const SORTS = [
  { value: "popular", label: "Popular" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "A-Z" },
] as const;

type BrowseSearch = {
  q?: string;
  category?: string;
  subcategory?: string;
  type?: string;
  brands?: string;
  min?: number;
  max?: number;
  sort: string;
  page: number;
};

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export const Route = createFileRoute("/browse")({
  validateSearch: (search: Record<string, unknown>): BrowseSearch => ({
    q: str(search.q),
    category: str(search.category),
    subcategory: str(search.subcategory),
    type: str(search.type),
    brands: str(search.brands),
    min: num(search.min),
    max: num(search.max),
    sort: str(search.sort) ?? "popular",
    page: Math.max(1, Math.round(num(search.page) ?? 1)),
  }),
  component: BrowsePage,
  head: () => ({
    meta: [
      { title: "Browse all products — Skintea" },
      {
        name: "description",
        content:
          "Search and filter the full Skintea catalog by brand, price and category, ranked by real review volume.",
      },
      { property: "og:title", content: "Browse all products — Skintea" },
      {
        property: "og:description",
        content:
          "Search and filter the full Skintea catalog by brand, price and category.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type BrowseRow = {
  id: string;
  brand: string;
  name: string;
  product_family_name: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  category: string | null;
  subcategory: string | null;
  product_type: string | null;
  total_views: number | null;
  video_count: number | null;
  recommend_pct: number | null;
  decisive_tags: number | null;
  total_count: number;
};

type FacetRow = {
  brand: string;
  product_count: number;
  min_price: number | null;
  max_price: number | null;
};

function BrowsePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/browse" });
  const gridRef = useRef<HTMLDivElement>(null);

  const activeBrands = search.brands
    ? search.brands.split(",").map((b) => b.trim()).filter(Boolean)
    : [];

  const [queryInput, setQueryInput] = useState(search.q ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setQueryInput(search.q ?? "");
  }, [search.q]);

  function setSearch(patch: Partial<BrowseSearch>, resetPage = true) {
    navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
        ...(resetPage ? { page: 1 } : {}),
      }),
    });
  }

  const productsQuery = useQuery({
    queryKey: ["browse-products", search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("browse_products", {
        p_q: search.q,
        p_category: search.category,
        p_subcategory: search.subcategory,
        p_product_type: search.type,
        p_brands: activeBrands.length > 0 ? activeBrands : undefined,
        p_min_price: search.min,
        p_max_price: search.max,
        p_sort: search.sort,
        p_offset: (search.page - 1) * PAGE_SIZE,
        p_limit: PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as unknown as BrowseRow[];
    },
  });

  const facetsQuery = useQuery({
    queryKey: [
      "browse-facets",
      search.q,
      search.category,
      search.subcategory,
      search.type,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("browse_facets", {
        p_q: search.q,
        p_category: search.category,
        p_subcategory: search.subcategory,
        p_product_type: search.type,
      });
      if (error) throw error;
      return (data ?? []) as unknown as FacetRow[];
    },
  });

  const rows = productsQuery.data ?? [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const loading = productsQuery.isPending;

  const facets = facetsQuery.data ?? [];
  const priceFloor = facets.length > 0 ? facets[0].min_price ?? undefined : undefined;
  const priceCeil = facets.length > 0 ? facets[0].max_price ?? undefined : undefined;

  function submitQuery() {
    const q = queryInput.trim();
    navigate({ search: { sort: search.sort, page: 1, ...(q ? { q } : {}) } });
  }

  function toggleBrand(brand: string) {
    const next = activeBrands.includes(brand)
      ? activeBrands.filter((b) => b !== brand)
      : [...activeBrands, brand];
    setSearch({ brands: next.length > 0 ? next.join(",") : undefined });
  }

  function clearAll() {
    navigate({ search: { sort: search.sort, page: 1, ...(search.q ? { q: search.q } : {}) } });
  }

  function goToPage(page: number) {
    navigate({ search: (prev) => ({ ...prev, page }) });
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const taxonomyLabel = search.type ?? search.subcategory ?? search.category;
  const priceActive = search.min != null || search.max != null;
  const activeFilterCount =
    activeBrands.length + (priceActive ? 1 : 0) + (taxonomyLabel ? 1 : 0);

  const countLabel = search.q
    ? `${totalCount.toLocaleString()} ${totalCount === 1 ? "result" : "results"} for "${search.q}"`
    : `${totalCount.toLocaleString()} ${totalCount === 1 ? "product" : "products"}`;

  const filterPanel = (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-espresso">
          Brand
        </div>
        <div className="flex max-h-[340px] flex-col gap-1.5 overflow-y-auto pr-1">
          {facets.length === 0 && (
            <div className="text-[12px] text-brand-muted">No brands available.</div>
          )}
          {facets.map((f) => (
            <label
              key={f.brand}
              className="flex cursor-pointer items-center gap-2 text-[13px] text-brand-espresso"
            >
              <input
                type="checkbox"
                checked={activeBrands.includes(f.brand)}
                onChange={() => toggleBrand(f.brand)}
                className="h-3.5 w-3.5 accent-[var(--brand-crimson)]"
              />
              <span className="flex-1 truncate">{f.brand}</span>
              <span className="text-[11px] text-brand-muted">{f.product_count}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-espresso">
          Price
        </div>
        <div className="flex items-center gap-2">
          <PriceInput
            label="Min"
            value={search.min}
            min={priceFloor}
            max={priceCeil}
            onCommit={(v) => setSearch({ min: v })}
          />
          <span className="text-brand-muted">–</span>
          <PriceInput
            label="Max"
            value={search.max}
            min={priceFloor}
            max={priceCeil}
            onCommit={(v) => setSearch({ max: v })}
          />
        </div>
        {priceFloor != null && priceCeil != null && (
          <div className="mt-1.5 text-[11px] text-brand-muted">
            ${Math.floor(priceFloor)} – ${Math.ceil(priceCeil)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AppFrame fluid>
      <div className="min-h-screen pb-24">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-brand-border bg-card px-4 py-3.5 md:px-0">
          <Link to="/products" className="block no-underline">
            <div className="leading-none">
              <span className="font-display text-[22px] font-bold italic text-brand-espresso">
                Skin
              </span>
              <span className="font-display text-[22px] font-bold italic text-brand-crimson">
                tea
              </span>
            </div>
            <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-brand-muted">
              Got Skintea? Spill it.
            </div>
          </Link>
          <div className="flex flex-1 items-center gap-2 rounded-md border-[1.5px] border-brand-espresso bg-card px-2.5 py-1.5">
            <button
              type="button"
              aria-label="Search"
              onClick={submitQuery}
              className="flex items-center"
            >
              <Search size={14} className="text-brand-espresso" strokeWidth={2.5} />
            </button>
            <input
              type="text"
              placeholder="Search products, brands"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitQuery();
              }}
              className="flex-1 border-none bg-transparent text-[13px] font-medium text-brand-espresso outline-none"
            />
            {queryInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQueryInput("");
                  navigate({ search: { sort: search.sort, page: 1 } });
                }}
              >
                <X size={14} className="text-brand-espresso" />
              </button>
            )}
          </div>
        </header>

        <div className="flex gap-8 pt-5">
          {/* Desktop sidebar */}
          <aside className="hidden w-[240px] shrink-0 md:block">
            <div className="sticky top-6">{filterPanel}</div>
          </aside>

          <div className="min-w-0 flex-1">
            {/* Result header */}
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-[15px] font-medium text-brand-espresso">
                {loading ? "\u00A0" : countLabel}
              </h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="flex items-center gap-1.5 rounded-md border border-brand-border px-2.5 py-1.5 text-[12px] font-medium text-brand-espresso md:hidden"
                >
                  <SlidersHorizontal size={13} />
                  Filters
                  {activeFilterCount > 0 && ` (${activeFilterCount})`}
                </button>
                <select
                  aria-label="Sort products"
                  value={search.sort}
                  onChange={(e) => setSearch({ sort: e.target.value })}
                  className="rounded-md border border-brand-border bg-card px-2 py-1.5 text-[12px] font-medium text-brand-espresso"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chips */}
            {activeFilterCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {taxonomyLabel && (
                  <Chip
                    label={taxonomyLabel}
                    onRemove={() =>
                      setSearch({
                        category: undefined,
                        subcategory: undefined,
                        type: undefined,
                      })
                    }
                  />
                )}
                {activeBrands.map((b) => (
                  <Chip key={b} label={b} onRemove={() => toggleBrand(b)} />
                ))}
                {priceActive && (
                  <Chip
                    label={`$${search.min ?? 0} – $${search.max ?? "∞"}`}
                    onRemove={() => setSearch({ min: undefined, max: undefined })}
                  />
                )}
                {activeFilterCount >= 2 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[12px] font-medium text-brand-crimson underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}

            {/* Grid */}
            <div ref={gridRef} className="mt-4 scroll-mt-6">
              {loading ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                  {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-md border border-brand-border bg-card"
                    >
                      <div className="aspect-square w-full animate-pulse bg-brand-cream" />
                      <div className="flex flex-col gap-2 p-3">
                        <div className="h-2.5 w-1/2 animate-pulse rounded bg-brand-border" />
                        <div className="h-3 w-full animate-pulse rounded bg-brand-border" />
                        <div className="h-3 w-4/5 animate-pulse rounded bg-brand-border" />
                        <div className="h-3.5 w-1/3 animate-pulse rounded bg-brand-border" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : totalCount === 0 ? (
                <div className="flex flex-col items-start gap-3 py-16">
                  <p className="text-[14px] text-brand-espresso">
                    No products match these filters.
                  </p>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-md border border-brand-espresso px-3 py-1.5 text-[12px] font-medium text-brand-espresso"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                  {rows.map((r) => (
                    <ProductCard
                      key={r.id}
                      id={r.id}
                      brand={r.brand ?? ""}
                      name={r.product_family_name ?? r.name}
                      price={r.price}
                      currency={r.currency}
                      imageUrl={r.image_url}
                      recommendPct={r.recommend_pct}
                      decisiveTags={r.decisive_tags}
                      metricLabel={
                        r.total_views && Number(r.total_views) > 0
                          ? `${formatCompact(Number(r.total_views))} TikTok views`
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!loading && totalCount > 0 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={search.page <= 1}
                  onClick={() => goToPage(search.page - 1)}
                  className="rounded-md border border-brand-border px-3 py-1.5 text-[12px] font-medium text-brand-espresso disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-[12px] text-brand-muted">
                  Page {search.page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={search.page >= totalPages}
                  onClick={() => goToPage(search.page + 1)}
                  className="rounded-md border border-brand-border px-3 py-1.5 text-[12px] font-medium text-brand-espresso disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-[14px]">Filters</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">{filterPanel}</div>
            <div className="px-4 pb-6">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-full rounded-md bg-brand-espresso px-4 py-2.5 text-[13px] font-medium text-white"
              >
                Apply
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <BottomNav />
    </AppFrame>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-card px-2.5 py-1 text-[12px] text-brand-espresso">
      {label}
      <button type="button" aria-label={`Remove ${label} filter`} onClick={onRemove}>
        <X size={12} className="text-brand-muted" />
      </button>
    </span>
  );
}

function PriceInput({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number | undefined;
  min?: number;
  max?: number;
  onCommit: (v: number | undefined) => void;
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : "");

  useEffect(() => {
    setDraft(value != null ? String(value) : "");
  }, [value]);

  function commit() {
    const raw = draft.trim();
    if (raw === "") {
      onCommit(undefined);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      onCommit(undefined);
      return;
    }
    let clamped = n;
    if (min != null) clamped = Math.max(min, clamped);
    if (max != null) clamped = Math.min(max, clamped);
    onCommit(clamped);
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={`${label} price`}
      placeholder={label}
      value={draft}
      min={min}
      max={max}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      className="w-full min-w-0 rounded-md border border-brand-border bg-card px-2 py-1.5 text-[13px] text-brand-espresso outline-none"
    />
  );
}
