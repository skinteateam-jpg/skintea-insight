// Lead-capture instrumentation. leads / lead_events / lead_treatments have RLS on,
// no policies and no table grants for anon/authenticated: the lead_upsert and
// lead_event_add RPCs are the only write path. Nothing here may throw into the UI.
import { supabase } from "@/integrations/supabase/client";
import { getLeadSessionId } from "./leadSession";

export type LeadFields = {
  zip: string;
  city: string;
  other_treatment_note: string;
  budget_band: string;
  is_first_time: boolean;
  skin_type: string;
  age_bracket: string;
  email: string;
  contact_consent: boolean;
  treatment_ids: string[];
};

export type LeadEventType =
  | "field_set"
  | "quiz_completed"
  | "clinic_view"
  | "consultation_click"
  | "booking_link_click"
  | "email_submitted";

type RpcError = { message: string; code?: string } | null;

// Mirrors the CHECK constraints on public.leads. A value that fails them makes the
// whole lead_upsert call raise, so it is dropped here instead of sent.
const SKIN_TYPES = ["oily", "dry", "combination", "sensitive", "normal"];
const ZIP = /^[0-9]{5}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidLeadEmail(email: string): boolean {
  const v = email.trim().toLowerCase();
  return v.length <= 254 && EMAIL.test(v);
}

// The RPCs are not in the generated types yet.
function rpc(fn: string, args: Record<string, unknown>): Promise<{ error: RpcError }> {
  return (supabase as any).rpc(fn, args);
}

// Every argument is sent, nulls included. lead_upsert has two overloads and
// PostgREST picks one by the argument names present; p_treatment_ids exists only
// on the current one, so sending it always selects that overload.
function upsertArgs(sessionId: string, f: Partial<LeadFields>) {
  if (f.zip != null && !ZIP.test(f.zip)) {
    console.warn("[leads] dropping zip that is not 5 digits");
    f = { ...f, zip: undefined };
  }
  if (f.skin_type != null && !SKIN_TYPES.includes(f.skin_type)) {
    console.warn("[leads] dropping skin_type outside the five allowed values");
    f = { ...f, skin_type: undefined };
  }
  return {
    p_session_id: sessionId,
    p_zip: f.zip ?? null,
    p_city: f.city ?? null,
    p_other_treatment_note: f.other_treatment_note ?? null,
    p_budget_band: f.budget_band ?? null,
    p_is_first_time: f.is_first_time ?? null,
    p_skin_type: f.skin_type ?? null,
    p_age_bracket: f.age_bracket ?? null,
    p_email: f.email ?? null,
    p_contact_consent: f.contact_consent ?? null,
    p_treatment_ids: f.treatment_ids && f.treatment_ids.length ? f.treatment_ids : null,
  };
}

// lead_event_add raises "unknown session" when no lead row exists yet, so the
// first event of a session creates the row with an all-null upsert. Once per page load.
let ensured: { sessionId: string; done: Promise<boolean> } | null = null;

function ensureLead(sessionId: string): Promise<boolean> {
  if (ensured && ensured.sessionId === sessionId) return ensured.done;
  const done = rpc("lead_upsert", upsertArgs(sessionId, {})).then(
    ({ error }) => {
      if (error) {
        ensured = null;
        console.warn("[leads] lead_upsert (ensure) failed:", error.message);
        return false;
      }
      return true;
    },
    (e) => {
      ensured = null;
      console.warn("[leads] lead_upsert (ensure) failed:", e);
      return false;
    },
  );
  ensured = { sessionId, done };
  return done;
}

// Returns the RPC error (or a synthetic one) instead of throwing.
async function upsert(fields: Partial<LeadFields>): Promise<RpcError> {
  try {
    const sessionId = getLeadSessionId();
    if (!sessionId) return { message: "no session (server render)" };
    const { error } = await rpc("lead_upsert", upsertArgs(sessionId, fields));
    if (error) {
      console.warn("[leads] lead_upsert failed:", error.message);
      return error;
    }
    ensured = { sessionId, done: Promise.resolve(true) };
    return null;
  } catch (e) {
    console.warn("[leads] lead_upsert failed:", e);
    return { message: String(e) };
  }
}

export async function leadUpsert(fields: Partial<LeadFields>): Promise<void> {
  await upsert(fields);
}

export async function leadEvent(
  type: LeadEventType,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    const sessionId = getLeadSessionId();
    if (!sessionId) return;
    // Never carry an email in an event payload.
    const { email: _omit, ...clean } = payload ?? {};
    const args = { p_session_id: sessionId, p_event_type: type, p_payload: clean };

    if (!(await ensureLead(sessionId))) return;
    let { error } = await rpc("lead_event_add", args);
    if (error && /unknown session/i.test(error.message)) {
      // The lead row was removed after this page load created it; recreate once.
      ensured = null;
      if (!(await ensureLead(sessionId))) return;
      ({ error } = await rpc("lead_event_add", args));
    }
    if (error) console.warn(`[leads] lead_event_add(${type}) failed:`, error.message);
  } catch (e) {
    console.warn(`[leads] lead_event_add(${type}) failed:`, e);
  }
}

export type EmailSubmitResult = "ok" | "invalid_email" | "error";

// Email capture, only ever called after the visitor ticked the consent box.
// Order matters: email and consent must be stored before email_submitted, or
// lead_event_add will not promote the lead to stage 2. The event carries no payload,
// so the address never enters lead_events.
export async function leadSubmitEmail(email: string): Promise<EmailSubmitResult> {
  const value = email.trim();
  if (!isValidLeadEmail(value)) return "invalid_email";
  const error = await upsert({ email: value, contact_consent: true });
  if (error) {
    // 23514 = check_violation (leads_email_check).
    return error.code === "23514" || /email/i.test(error.message) ? "invalid_email" : "error";
  }
  await leadEvent("email_submitted");
  return "ok";
}

// Consultation CTA. The event goes first so the lead row exists; the click row is
// then written server-side, where consultation_clicks.lead_id is resolved from the
// session id (the browser cannot read leads).
export async function recordConsultationClick(clinicId: string): Promise<void> {
  try {
    await leadEvent("consultation_click", { clinic_id: clinicId });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("/api/public/consultation-click", {
      method: "POST",
      headers,
      body: JSON.stringify({ clinic_id: clinicId, session_id: getLeadSessionId() }),
    });
    if (res.ok) return;
    console.warn("[leads] consultation-click route failed:", res.status);
  } catch (e) {
    console.warn("[leads] consultation-click route failed:", e);
  }
  // Fallback: the original anonymous insert, without lead_id, so the click is not lost.
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("consultation_clicks").insert({ clinic_id: clinicId, user_id: data.user?.id ?? null });
  } catch (e) {
    console.warn("[leads] consultation_clicks fallback insert failed:", e);
  }
}
