import { Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(n));
}

export type ProductCardProps = {
  id: string;
  brand: string;
  name: string;
  price: number | null;
  currency?: string | null;
  imageUrl?: string | null;
  rank?: number;
  metricLabel?: string;
  recommendPct?: number | null;
  decisiveTags?: number | null;
  onSave?: () => void;
};

function priceLabel(price: number | null, currency?: string | null): string {
  if (price == null) return "";
  const symbol = !currency || currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${Number(price) % 1 === 0 ? Number(price).toFixed(0) : Number(price).toFixed(2)}`;
}

export default function ProductCard({
  id,
  brand,
  name,
  price,
  currency,
  imageUrl,
  rank,
  metricLabel,
  recommendPct,
  decisiveTags,
  onSave,
}: ProductCardProps) {
  const showRecommend =
    recommendPct != null && decisiveTags != null && decisiveTags >= 10;

  return (
    <Link
      to="/product-detail/$id"
      params={{ id }}
      className="group relative flex flex-col overflow-hidden rounded-md border border-brand-border bg-card no-underline transition-shadow hover:shadow-[0_4px_16px_rgba(28,10,0,0.08)]"
    >
      <div className="relative aspect-square w-full bg-brand-cream p-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${brand} ${name}`}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-[28px] font-medium text-brand-muted">
              {(brand || name || "?").charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {rank != null && (
          <span className="absolute left-2 top-2 rounded-sm bg-brand-espresso px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
            #{rank}
          </span>
        )}

        {onSave && (
          <button
            type="button"
            aria-label="Save product"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSave();
            }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-brand-border bg-card"
          >
            <Bookmark size={13} className="text-brand-espresso" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="text-[11px] font-medium text-brand-muted">{brand}</div>
        <div className="line-clamp-2 text-[14px] font-medium text-brand-espresso">
          {name}
        </div>
        {price != null && (
          <div className="mt-0.5 text-[15px] font-bold text-brand-espresso">
            {priceLabel(price, currency)}
          </div>
        )}
        {metricLabel && (
          <div className="text-[11px] text-brand-muted">{metricLabel}</div>
        )}
        {showRecommend && (
          <div className="text-[11px] text-brand-crimson">
            {Math.round(recommendPct!)}% recommend
          </div>
        )}
      </div>
    </Link>
  );
}
