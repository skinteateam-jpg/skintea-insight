// Lead-capture instrumentation. leads / lead_events / lead_treatments have RLS on,
// no policies and no table grants for anon/authenticated: the lead_upsert and
// lead_event_add RPCs are the only write path. Nothing here may throw into the UI.
//
// No lead row on a bare page load. A first clinic_view is held in this browser only
// (localStorage) and the lead is created, with held events flushed in order, when the
// visitor does something: views a second distinct clinic, completes the quiz, clicks a
// consultation or booking link, or submits an email. Nothing is ever flushed on unload.
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
type HeldEvent = { type: LeadEventType; payload: Record<string, unknown> };

// Mirrors the CHECK constraints on public.leads. A zip or skin_type that fails them
// makes the whole lead_upsert call raise, so it is dropped here instead of sent.
// Email is left to the database constraint, which is the authority on what is valid.
const SKIN_TYPES = ["oily", "dry", "combination", "sensitive", "normal"];
const ZIP = /^[0-9]{5}$/;

const PENDING_KEY = "skintea_lead_pending";
const CREATED_KEY = "skintea_lead_created";
const MAX_HELD = 20;

// The RPCs are not in the generated types yet.
function rpc(fn: string, args: Record<string, unknown>): Promise<{ error: RpcError }> {
  return (supabase as any).rpc(fn, args);
}

// ---------- local state (localStorage, with an in-memory fallback) ----------
const memory: Record<string, string | null> = {};

function store(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory[key] ?? null;
  }
}

function save(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    memory[key] = value;
  }
}

function leadKnown(sessionId: string): boolean {
  return store(CREATED_KEY) === sessionId;
}

function markCreated(sessionId: string | null) {
  save(CREATED_KEY, sessionId);
}

function readHeld(sessionId: string): HeldEvent[] {
  try {
    const raw = store(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { sessionId?: string; events?: HeldEvent[] };
    return parsed.sessionId === sessionId && Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

function writeHeld(sessionId: string, events: HeldEvent[]) {
  save(PENDING_KEY, events.length ? JSON.stringify({ sessionId, events: events.slice(0, MAX_HELD) }) : null);
}

// ---------- serial queue: events must land in the order they happened ----------
let chain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

// ---------- raw calls (not queued; only called from inside the queue) ----------

// Every argument is sent, nulls included, so PostgREST always resolves the same
// lead_upsert signature.
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

async function rawUpsert(sessionId: string, fields: Partial<LeadFields>): Promise<RpcError> {
  try {
    const { error } = await rpc("lead_upsert", upsertArgs(sessionId, fields));
    if (error) {
      console.warn("[leads] lead_upsert failed:", error.message);
      return error;
    }
    markCreated(sessionId);
    return null;
  } catch (e) {
    console.warn("[leads] lead_upsert failed:", e);
    return { message: String(e) };
  }
}

// "ok" | "unknown" (no lead row for this session) | "error"
async function rawEvent(sessionId: string, ev: HeldEvent): Promise<"ok" | "unknown" | "error"> {
  try {
    const { error } = await rpc("lead_event_add", { p_session_id: sessionId, p_event_type: ev.type, p_payload: ev.payload });
    if (!error) return "ok";
    if (/unknown session/i.test(error.message)) {
      markCreated(null);
      return "unknown";
    }
    console.warn(`[leads] lead_event_add(${ev.type}) failed:`, error.message);
    return "error";
  } catch (e) {
    console.warn(`[leads] lead_event_add(${ev.type}) failed:`, e);
    return "error";
  }
}

// Sends held events in their original order, removing each once it has landed.
// The lead row must already exist.
async function flushHeld(sessionId: string): Promise<boolean> {
  const held = readHeld(sessionId);
  for (let i = 0; i < held.length; i++) {
    const r = await rawEvent(sessionId, held[i]);
    if (r !== "ok") {
      writeHeld(sessionId, held.slice(i));
      return false;
    }
  }
  writeHeld(sessionId, []);
  return true;
}

// Creates the lead if this browser has not seen it created, then flushes held events.
async function ensureLeadAndFlush(sessionId: string): Promise<boolean> {
  if (!leadKnown(sessionId)) {
    if (await rawUpsert(sessionId, {})) return false;
  }
  return flushHeld(sessionId);
}

async function sendEvent(sessionId: string, ev: HeldEvent): Promise<void> {
  if (!(await ensureLeadAndFlush(sessionId))) return;
  if ((await rawEvent(sessionId, ev)) === "unknown") {
    // The lead was deleted server-side after this browser created it. A clinic view alone
    // must not recreate it, so it is held like any first view; any other action recreates it once.
    if (ev.type === "clinic_view") {
      writeHeld(sessionId, [...readHeld(sessionId), ev]);
      return;
    }
    if (await ensureLeadAndFlush(sessionId)) await rawEvent(sessionId, ev);
  }
}

// ---------- public API ----------

export function leadEvent(type: LeadEventType, payload?: Record<string, unknown>): Promise<void> {
  return enqueue(async () => {
    try {
      const sessionId = getLeadSessionId();
      if (!sessionId) return;
      // Never carry an email in an event payload.
      const { email: _omit, ...clean } = payload ?? {};
      const ev: HeldEvent = { type, payload: clean };

      if (type === "clinic_view" && !leadKnown(sessionId)) {
        const held = readHeld(sessionId);
        const clinicId = clean.clinic_id;
        const otherClinicHeld = held.some((h) => h.type === "clinic_view" && h.payload.clinic_id !== clinicId);
        if (!otherClinicHeld) {
          // A bare view: hold it. A repeat view of the same held clinic is not held twice.
          if (!held.some((h) => h.type === "clinic_view" && h.payload.clinic_id === clinicId)) {
            writeHeld(sessionId, [...held, ev]);
          }
          return;
        }
        // A second distinct clinic: create the lead, flush the held view, then send this one.
      }
      await sendEvent(sessionId, ev);
    } catch (e) {
      console.warn(`[leads] ${type} failed:`, e);
    }
  });
}

export function leadUpsert(fields: Partial<LeadFields>): Promise<void> {
  return enqueue(async () => {
    const sessionId = getLeadSessionId();
    if (!sessionId) return;
    if (!(await rawUpsert(sessionId, fields))) await flushHeld(sessionId);
  });
}

// For code that creates the lead through another RPC (the quiz's quiz_response_save):
// call before that RPC, so held clinic views land before quiz_completed.
export function leadFlushHeld(): Promise<void> {
  return enqueue(async () => {
    const sessionId = getLeadSessionId();
    if (!sessionId || readHeld(sessionId).length === 0) return;
    await ensureLeadAndFlush(sessionId);
  });
}

// For code that created the lead through its own lead_upsert call.
export function noteLeadCreated(): void {
  const sessionId = getLeadSessionId();
  if (sessionId) markCreated(sessionId);
}

export type EmailSubmitResult = "ok" | "invalid_email" | "error";

// Email capture. `contactConsent` is the separate, unticked "let matched clinics contact me"
// box; the email is accepted with or without it. Email and consent are stored first, then held
// events, then email_submitted with no payload, so the address never enters lead_events and the
// lead reaches stage 2 only when consent is true (the database rule). An unticked box sends
// contact_consent false, so a visitor who unticks it withdraws consent they gave earlier.
export function leadSubmitEmail(email: string, contactConsent: boolean): Promise<EmailSubmitResult> {
  return enqueue(async () => {
    const sessionId = getLeadSessionId();
    const value = email.trim();
    if (!sessionId) return "error";
    if (!value) return "invalid_email";
    // A rejected address raises inside lead_upsert and rolls back, so no lead row is created.
    const error = await rawUpsert(sessionId, { email: value, contact_consent: contactConsent });
    if (error) {
      // 23514 = check_violation (leads_email_check).
      return error.code === "23514" || /email/i.test(error.message) ? "invalid_email" : "error";
    }
    await sendEvent(sessionId, { type: "email_submitted", payload: {} });
    return "ok";
  });
}

// Consultation CTA. The event goes first so the lead row exists; the click row is then
// written server-side, where consultation_clicks.lead_id is resolved from the session id.
export async function recordConsultationClick(clinicId: string): Promise<void> {
  let failure = "";
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
    failure = `HTTP ${res.status}`;
  } catch (e) {
    failure = String(e);
  }
  // The app has no error-reporting service; console.error is the only error path.
  console.error(
    "[leads] consultation-click route failed (" + failure + "). Falling back to a direct consultation_clicks " +
      "insert WITHOUT lead_id: this click will not be linked to its lead.",
    { clinic_id: clinicId },
  );
  try {
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase.from("consultation_clicks").insert({ clinic_id: clinicId, user_id: data.user?.id ?? null });
    if (error) console.error("[leads] consultation_clicks fallback insert failed too; the click is lost:", error.message);
  } catch (e) {
    console.error("[leads] consultation_clicks fallback insert failed too; the click is lost:", e);
  }
}
