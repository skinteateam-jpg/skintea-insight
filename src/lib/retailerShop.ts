// Shop buttons on the product page. One button per retailer that can actually reach this product.
//
// Affiliate IDs are not approved yet, so today every button ends up on the retailer's normal
// product page (link_type "direct"). A retailer with no per-product URL renders no button: a search
// page is not evidence the retailer sells this product (CLAUDE.md, "Product retailer chips", 2026-09-16). When an affiliate
// URL or an affiliate id lands in the database, resolveRetailerLink starts returning it and the
// UI does not change.
import { supabase } from "@/integrations/supabase/client";

export type RetailerRow = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  search_url_template: string | null;
  affiliate_id: string | null;
  affiliate_param_template: string | null;
  is_active: boolean;
  sort_order: number;
};

export type ProductRetailerLinkRow = {
  id: string;
  product_id: string;
  retailer_id: string;
  product_url: string | null;
  affiliate_url: string | null;
  price: number | null;
  in_stock: boolean;
  verified: boolean;
};

export type LinkType = "affiliate" | "direct" | "search";

export type ShopButton = {
  retailerId: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  url: string;
  linkType: LinkType;
  price: number | null;
};

// The six retailers of the "Shop at" row, in render order. A retailer renders a button only when
// product_retailer_links holds a real URL for this product; otherwise it renders nothing.
export const SHOP_ROW_SLUGS = [
  "sephora",
  "ulta",
  "amazon",
  "olive_young_global",
  "yesstyle",
  "stylevana",
] as const;

function appendParam(url: string, param: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${param}`;
}

// Order of resolution: affiliate_url, then product_url + affiliate param, then product_url.
// No search-page fallback (removed 2026-09-16): a retailer's search results are not a per-product URL,
// and a search link would show a retailer that may not carry the product at all.
export function resolveRetailerLink(
  retailer: RetailerRow,
  link: ProductRetailerLinkRow | undefined,
  opts: { brand: string | null; productName: string | null },
): { url: string; linkType: LinkType } | null {
  if (link?.affiliate_url) return { url: link.affiliate_url, linkType: "affiliate" };

  if (link?.product_url) {
    if (retailer.affiliate_id && retailer.affiliate_param_template) {
      const param = retailer.affiliate_param_template.replace("{id}", encodeURIComponent(retailer.affiliate_id));
      return { url: appendParam(link.product_url, param), linkType: "affiliate" };
    }
    return { url: link.product_url, linkType: "direct" };
  }

  void opts;
  return null;
}

// The product's own "Shop" link (brand_site) leads when the product has a URL, then each of the six
// retailers that has a per-product URL, in their fixed order.
export function buildShopButtons(args: {
  retailers: RetailerRow[];
  links: ProductRetailerLinkRow[];
  brand: string | null;
  productName: string | null;
  productUrl?: string | null;
  productPrice?: number | null;
}): ShopButton[] {
  const byRetailer = new Map(args.links.map((l) => [l.retailer_id, l]));
  const bySlug = new Map(args.retailers.map((r) => [r.slug, r]));
  const buttons: ShopButton[] = [];

  // 1. The original Shop button: the product's own link and price, unchanged.
  const brandSite = bySlug.get("brand_site");
  if (brandSite && args.productUrl) {
    const link = byRetailer.get(brandSite.id);
    buttons.push({
      retailerId: brandSite.id,
      slug: brandSite.slug,
      name: "Shop",
      logoUrl: brandSite.logo_url,
      url: link?.affiliate_url ?? link?.product_url ?? args.productUrl,
      linkType: link?.affiliate_url ? "affiliate" : "direct",
      price: link?.price ?? args.productPrice ?? null,
    });
  }

  // 2. The six retailers in their fixed order, each only with a per-product URL.
  for (const slug of SHOP_ROW_SLUGS) {
    const r = bySlug.get(slug);
    if (!r) continue;
    const link = byRetailer.get(r.id);
    const resolved = resolveRetailerLink(r, link, { brand: args.brand, productName: args.productName });
    if (!resolved) continue;
    buttons.push({
      retailerId: r.id,
      slug: r.slug,
      name: r.name,
      logoUrl: r.logo_url,
      url: resolved.url,
      linkType: resolved.linkType,
      price: link?.price ?? null,
    });
  }
  return buttons;
}

// Fire and forget: a failed insert must never delay or block opening the retailer.
export function logOutboundClick(args: {
  productId: string;
  retailerId: string;
  userId: string | null;
  linkType: LinkType;
  sourcePage: string;
}): void {
  try {
    void (supabase as any)
      .from("outbound_clicks")
      .insert({
        product_id: args.productId,
        retailer_id: args.retailerId,
        user_id: args.userId,
        link_type: args.linkType,
        source_page: args.sourcePage,
      })
      .then(() => undefined, () => undefined);
  } catch {
    /* ignored on purpose */
  }
}

// brand_retailers is optional data now and is not read here: no retailer is gated on it.
export async function fetchShopData(productId: string) {
  const [{ data: retailers }, { data: links }] = await Promise.all([
    (supabase as any)
      .from("retailers")
      .select("id,slug,name,logo_url,search_url_template,affiliate_id,affiliate_param_template,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    (supabase as any)
      .from("product_retailer_links")
      .select("id,product_id,retailer_id,product_url,affiliate_url,price,in_stock,verified")
      .eq("product_id", productId),
  ]);
  return {
    retailers: (retailers ?? []) as RetailerRow[],
    links: (links ?? []) as ProductRetailerLinkRow[],
  };
}
