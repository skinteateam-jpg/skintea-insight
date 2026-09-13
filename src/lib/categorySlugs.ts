/**
 * Category URL slugs.
 *
 * `products.category` still stores display labels, while category page URLs use
 * the canonical `product_categories.slug`. This map lets us translate a label
 * (current or pre-migration) into the slug used in the URL.
 */
export const CATEGORY_LABEL_TO_SLUG: Record<string, string> = {
  skincare: "skincare",
  suncare: "suncare",
  sunscreen: "suncare",
  "base makeup": "base-makeup",
  face: "base-makeup",
  "eye makeup": "eye-makeup",
  eye: "eye-makeup",
  lip: "lip",
  "cheek & contour": "cheek-contour",
  cheek: "cheek-contour",
  body: "body",
  bodycare: "body",
  goods: "goods",
  device: "device",
  fragrance: "fragrance",
};

/** Resolve a category label (or already-slug value) to its URL slug. */
export function categorySlugFor(label: string): string {
  const key = label.trim().toLowerCase();
  return CATEGORY_LABEL_TO_SLUG[key] ?? key.replace(/\s*&\s*/g, "-").replace(/\s+/g, "-");
}
