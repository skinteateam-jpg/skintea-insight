import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// One image path for every clinic card and the clinic page. A clinic's own photos (clinics.photos) always win; with none,
// the card shows a stock image for the clinic's category, marked "Photo coming soon". Replacing a category image with a
// real photo is a data change only: add entries to clinics.photos.

export type ClinicCategory = "dermatology" | "laser" | "med_spa" | "plastic_surgery" | "skin_care_clinic";

// clinics.photos entries (validated in the database by clinic_photos_valid): never stock, never without a source.
// google_places_scrape photos carry recorded_at and are replaced before Skintea publishes (see CLAUDE.md).
export type ClinicPhoto = {
  url: string;
  source: "clinic_supplied" | "skintea_shot" | "google_places_scrape";
  permission_granted_at?: string;
  recorded_at?: string;
  alt?: string;
  width?: number;
  height?: number;
};

export type DisplayImage = { url: string; kind: "clinic" | "category"; alt: string };

export const CATEGORY_LABELS: Record<ClinicCategory, string> = {
  dermatology: "dermatology",
  laser: "laser clinic",
  med_spa: "med spa",
  plastic_surgery: "plastic surgery",
  skin_care_clinic: "skin care clinic",
};

type CategoryImageMap = Partial<Record<ClinicCategory, string[]>>;
let categoryImagesPromise: Promise<CategoryImageMap> | null = null;

export function loadCategoryImages(): Promise<CategoryImageMap> {
  if (!categoryImagesPromise) {
    categoryImagesPromise = (async () => {
      const { data } = await supabase
        .from("category_images" as any)
        .select("category,image_url,sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      const map: CategoryImageMap = {};
      for (const row of ((data as any[]) ?? [])) {
        const c = row.category as ClinicCategory;
        (map[c] ??= []).push(row.image_url as string);
      }
      return map;
    })();
  }
  return categoryImagesPromise;
}

export function useCategoryImages(): CategoryImageMap {
  const [map, setMap] = useState<CategoryImageMap>({});
  useEffect(() => {
    let alive = true;
    loadCategoryImages().then((m) => { if (alive) setMap(m); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return map;
}

export function clinicPhotos(value: unknown): ClinicPhoto[] {
  if (!Array.isArray(value)) return [];
  return value.filter((p: any) =>
    p && typeof p.url === "string" && /^https:\/\//.test(p.url) && (p.source === "clinic_supplied" || p.source === "skintea_shot" || p.source === "google_places_scrape")) as ClinicPhoto[];
}

function sized(url: string, width: number): string {
  if (!url.startsWith("https://images.unsplash.com/")) return url;
  return `${url.split("?")[0]}?w=${width}&q=70&auto=format&fit=crop`;
}

function stableIndex(key: string, n: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return n > 0 ? h % n : 0;
}

export function displayImages(
  clinic: { id: string; name: string; photos?: unknown; category?: string | null },
  categoryImages: CategoryImageMap,
  width = 800,
  failed?: Set<string>,
): DisplayImage[] {
  // Photos that failed to load are dropped here, so every view built from this list (hero, strip) stays in step;
  // if all of a clinic's photos fail, the category image takes over.
  const own = clinicPhotos(clinic.photos).filter((p) => !failed?.has(p.url));
  const category = clinic.category as ClinicCategory | null | undefined;
  const list = category ? categoryImages[category] ?? [] : [];
  const fallback: DisplayImage[] = list.length === 0 ? [] : [{
    url: sized(list[stableIndex(clinic.id, list.length)], width), kind: "category",
    alt: `Illustrative ${CATEGORY_LABELS[category!]} image, not a photo of ${clinic.name}`,
  }];
  // The category image is also the last candidate after a clinic's own photos, so a card whose photos all fail to load
  // (e.g. expired Google photo URLs) shows the marked category image rather than "Photo unavailable".
  if (own.length > 0) return [...own.map((p) => ({ url: p.url, kind: "clinic" as const, alt: p.alt || clinic.name })), ...fallback];
  return fallback;
}
