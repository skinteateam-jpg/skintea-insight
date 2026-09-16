// Shop buttons on the product page. One button per retailer that can actually reach this product.
//
// Affiliate IDs are not approved yet, so today every button ends up on the retailer's normal
// product page (link_type "direct") or its search page (link_type "search"). When an affiliate
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

function appendParam(url: string, param: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${param}`;
}

// Order of resolution (spec): affiliate_url, then product_url + affiliate param, then product_url,
// then the retailer's search page — search only when the brand is officially carried there.
// Anything else: no button for that retailer.
export function resolveRetailerLink(
  retailer: RetailerRow,
  link: ProductRetailerLinkRow | undefined,
  opts: { brandCarried: boolean; brand: string | null; productName: string | null },
): { url: string; linkType: LinkType } | null {
  if (!retailer.is_active) return null;

  if (link?.affiliate_url) return { url: link.affiliate_url, linkType: "affiliate" };

  if (link?.product_url) {
    if (retailer.affiliate_id && retailer.affiliate_param_template) {
      const param = retailer.affiliate_param_template.replace("{id}", encodeURIComponent(retailer.affiliate_id));
      return { url: appendParam(link.product_url, param), linkType: "affiliate" };
    }
    return { url: link.product_url, linkType: "direct" };
  }

  if (opts.brandCarried && retailer.search_url_template) {
    const q = [opts.brand ?? "", opts.productName ?? ""].join(" ").trim();
    if (!q) return null;
    return { url: retailer.search_url_template.replace("{q}", encodeURIComponent(q)), linkType: "search" };
  }

  return null;
}

// A retailer never appears unless it carries the brand: either it has a real link row for this
// product, or the brand is listed in brand_retailers for it.
export function buildShopButtons(args: {
  retailers: RetailerRow[];
  links: ProductRetailerLinkRow[];
  carriedRetailerIds: Set<string>;
  brand: string | null;
  productName: string | null;
}): ShopButton[] {
  const byRetailer = new Map(args.links.map((l) => [l.retailer_id, l]));
  const buttons: ShopButton[] = [];
  for (const r of args.retailers) {
    const link = byRetailer.get(r.id);
    const carried = args.carriedRetailerIds.has(r.id);
    if (!link && !carried) continue;
    if (link && link.in_stock === false) continue;
    const resolved = resolveRetailerLink(r, link, {
      brandCarried: carried,
      brand: args.brand,
      productName: args.productName,
    });
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
  // Price ascending, unknown price last, then the retailer's own sort order. Never by commission.
  const order = new Map(args.retailers.map((r, i) => [r.id, i]));
  return buttons.sort((a, b) => {
    const ap = a.price ?? Number.POSITIVE_INFINITY;
    const bp = b.price ?? Number.POSITIVE_INFINITY;
    if (ap !== bp) return ap - bp;
    return (order.get(a.retailerId) ?? 0) - (order.get(b.retailerId) ?? 0);
  });
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

export async function fetchShopData(productId: string, brand: string | null) {
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
  let carried: string[] = [];
  if (brand) {
    const { data: pairs } = await (supabase as any)
      .from("brand_retailers")
      .select("retailer_id")
      .ilike("brand", brand);
    carried = (pairs ?? []).map((p: any) => p.retailer_id);
  }
  return {
    retailers: (retailers ?? []) as RetailerRow[],
    links: (links ?? []) as ProductRetailerLinkRow[],
    carriedRetailerIds: new Set<string>(carried),
  };
}
