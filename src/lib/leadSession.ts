// Anonymous lead session id. The lead RPCs trust whoever holds this id, so it
// must be an unguessable v4 UUID: never sequential, never derived from anything.
const KEY = "skintea_lead_session";
// src/routes/quiz.tsx keeps its own copy under this key. Both keys always hold the
// same id, or one visitor would become two leads (quiz fields on one, clinic events on the other).
const QUIZ_KEY = "skintea.sessionId";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Used only when localStorage throws (private mode, blocked storage).
let memoryId: string | null = null;

function randomUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Returns null during SSR: there is no browser session to attach to.
export function getLeadSessionId(): string | null {
  if (typeof window === "undefined" || typeof crypto === "undefined") return null;
  try {
    const ls = window.localStorage;
    const quizId = ls.getItem(QUIZ_KEY);
    const ownId = ls.getItem(KEY);
    // The quiz's id wins: its lead carries the quiz answers.
    const id = quizId && UUID_V4.test(quizId) ? quizId : ownId && UUID_V4.test(ownId) ? ownId : randomUuid();
    if (quizId !== id) ls.setItem(QUIZ_KEY, id);
    if (ownId !== id) ls.setItem(KEY, id);
    return id;
  } catch {
    if (!memoryId) memoryId = randomUuid();
    return memoryId;
  }
}
