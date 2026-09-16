// Outbound intent logging (2026-09-16). Every time a visitor acts on a clinic listing — calls, books, asks for
// directions, opens the website or a social profile — one row goes to public.clinic_intent_events. This is the
// evidence that Skintea sent the visitor. It stores no personal data: an anonymous session id (the same one the
// lead layer already uses) and the signed-in user's id when there is one.
//
// Never block or delay the action. logClinicIntent is fire-and-forget: it is called in the click handler and
// the browser goes on to follow the link (tel:, a new tab) at once. A failed write is reported to the console only.
import { supabase } from "@/integrations/supabase/client";
import { getLeadSessionId } from "@/lib/leadSession";

export type IntentAction = "call" | "book" | "directions" | "website" | "social";
export type IntentChannel =
  | "tel" | "website" | "booking_platform" | "maps" | "instagram" | "tiktok"
  | "profile_page" | "directory_page" | "short_link";
export type IntentPage = "clinic_page" | "treatment_page" | "clinics_index";
export type IntentSurface = "action_bar" | "inquire_sheet" | "location_section" | "social_chips";

export type ClinicIntent = {
  clinicId: string;
  action: IntentAction;
  channel: IntentChannel;
  page: IntentPage;
  surface: IntentSurface;
  treatmentId?: string | null;
};

export function logClinicIntent(intent: ClinicIntent): void {
  if (typeof window === "undefined") return;
  const sessionId = getLeadSessionId();
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id ?? null;
      if (!sessionId && !userId) return;
      // No .select(): anon may insert but not read, so the insert must not ask for the row back.
      const { error } = await (supabase as any).from("clinic_intent_events").insert({
        clinic_id: intent.clinicId,
        action: intent.action,
        channel: intent.channel,
        page: intent.page,
        surface: intent.surface,
        treatment_id: intent.treatmentId ?? null,
        session_id: sessionId,
        user_id: userId,
      });
      if (error) console.error("[intent] clinic_intent_events insert failed:", error.message);
    } catch (e) {
      console.error("[intent] clinic_intent_events insert failed:", e);
    }
  })();
}

// Treatment context: the treatment page the visitor was on immediately before this clinic page, if any.
// src/router.tsx records the previous pathname on every navigation; the clinic page reads it once on mount.
const PREV_PATH_KEY = "skintea.prevPath";

export function rememberPreviousPath(pathname: string | undefined): void {
  if (typeof window === "undefined" || !pathname) return;
  try { window.sessionStorage.setItem(PREV_PATH_KEY, pathname); } catch { /* storage blocked: no context, nothing else breaks */ }
}

export function previousTreatmentSlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const p = window.sessionStorage.getItem(PREV_PATH_KEY) ?? "";
    const m = p.match(/^\/treatments\/([a-z0-9-]+)\/?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// Which intent channel a stored website counts as.
export function websiteChannel(kind: import("@/lib/bookingPath").WebsiteKind): IntentChannel {
  switch (kind) {
    case "own_site": return "website";
    case "booking_platform": return "booking_platform";
    case "social_profile":
    case "page_builder": return "profile_page";
    case "directory_page":
    case "hospital_page": return "directory_page";
    case "short_link": return "short_link";
  }
}
