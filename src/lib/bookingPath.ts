// What a clinic's stored website actually is. The booking CTA may only open a page that can take a booking:
// the clinic's own site or a booking platform. Social profiles, directories, hospital/parent-organisation pages,
// link shorteners and one-page mail builders cannot, so they never become "Book Consultation" (2026-09-16).
// Anything not recognised below is treated as the clinic's own site.

export type WebsiteKind =
  | "own_site"
  | "booking_platform"
  | "social_profile"
  | "directory_page"
  | "hospital_page"
  | "short_link"
  | "page_builder";

const BOOKING_PLATFORMS = [
  "booksy.com", "square.site", "squareup.com", "zoca.com", "vagaro.com", "glossgenius.com", "fresha.com",
  "schedulicity.com", "mindbodyonline.com", "acuityscheduling.com", "janeapp.com", "boulevard.io", "joinblvd.com",
  "calendly.com", "setmore.com", "zenoti.com",
];
const SOCIAL = ["instagram.com", "facebook.com", "tiktok.com", "linktr.ee", "x.com", "twitter.com", "youtube.com", "yelp.com"];
const DIRECTORIES = ["koreaportal.com", "portraitcare.com", "jany.io", "edan.io", "google.com", "maps.app.goo.gl", "healthgrades.com", "zocdoc.com"];
const HOSPITALS = ["keckmedicine.org", "kaiserpermanente.org", "chla.org", "adventisthealth.org", "cedars-sinai.org", "uclahealth.org"];
const SHORT_LINKS = ["bit.ly", "tinyurl.com", "t.co", "rebrand.ly"];
const PAGE_BUILDERS = ["mailchimpsites.com", "carrd.co"];

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

const matches = (host: string, list: string[]) => list.some((d) => host === d || host.endsWith(`.${d}`));

export function classifyWebsite(url: string | null | undefined): WebsiteKind | null {
  if (!url) return null;
  const host = hostOf(url);
  if (!host) return null;
  if (matches(host, BOOKING_PLATFORMS)) return "booking_platform";
  if (matches(host, SOCIAL)) return "social_profile";
  if (matches(host, DIRECTORIES)) return "directory_page";
  if (matches(host, HOSPITALS)) return "hospital_page";
  if (matches(host, SHORT_LINKS)) return "short_link";
  if (matches(host, PAGE_BUILDERS)) return "page_builder";
  return "own_site";
}

export function isBookingPath(kind: WebsiteKind | null): boolean {
  return kind === "own_site" || kind === "booking_platform";
}

// What the link is, said plainly, for the inquire sheet.
export function websiteLinkLabel(url: string, kind: WebsiteKind): string {
  const host = hostOf(url) ?? "";
  switch (kind) {
    case "own_site": return "Visit website →";
    case "booking_platform": return "Book online →";
    case "social_profile": return host.includes("instagram") ? "Instagram profile →" : host.includes("facebook") ? "Facebook page →" : "Social profile →";
    case "directory_page": return "Directory listing →";
    case "hospital_page": return "Hospital page →";
    case "short_link": return `Link shared by the clinic (${host}) →`;
    case "page_builder": return "Clinic web page →";
  }
}
