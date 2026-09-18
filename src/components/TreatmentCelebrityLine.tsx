import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MUTED = "#999999";
const ESPRESSO = "#1C0A00";

/**
 * "Talked about by …" — the celebrity / influencer evidence layer, as one line under the treatment
 * name (Chi, 2026-09-18). It replaces the "Who has talked about it" section, whose name now belongs
 * to the Skintea members who posted Tea about the treatment.
 *
 * Names only, each linking to the place the person said it. No avatars, no follower counts, no
 * platform, no date, no quote and no section heading — this is a pointer to evidence, not a claim
 * about a person and not an endorsement. When no row qualifies the line is absent entirely.
 *
 * Rules kept, unchanged:
 *  - Rows attach to TREATMENT pages only. They are never joined to a clinic and never link to one.
 *  - `quote` is evidence, not display: it is stored so a written claim can be checked against the
 *    person's own words, and is deliberately never rendered. It is not even selected here.
 *  - This section is counted in no figure.
 */
export type CelebrityLineRow = {
  id: string;
  celeb_name: string;
  source_url: string | null;
  embed_url: string | null;
  said_on: string | null;
};

/**
 * A row whose `celeb_name` is an account handle rather than a person's name is not rendered
 * (Chi, 2026-09-18): a handle is the account's own credit for its post, and "Talked about by
 * heylina" prints a username as if it were a name. Two rules, because one cannot catch all three
 * known cases:
 *   - structural: a name starting with "@", or carrying no capital letter at all
 *     (@dutchworld_americangirl, heylina);
 *   - by name: a handle-shaped name no rule can see from the string alone (Loanthebadass — a single
 *     capitalised word, exactly like the real single-word name "Scarlet", which does render).
 * A new row named by its handle has to be added below. The real fix is storing the person's name on
 * the row; that is a data change, not a display one, and is not made from here.
 */
const HANDLE_NAMES = new Set(["loanthebadass"]);

export function isHandleName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  if (!n) return true;
  if (n.startsWith("@")) return true;
  if (n === n.toLowerCase()) return true;
  return HANDLE_NAMES.has(n.toLowerCase());
}

/** Where the person said it: the source, or the embed when no source URL was recorded. */
export function evidenceHref(row: CelebrityLineRow): string | null {
  const url = (row.source_url ?? "").trim() || (row.embed_url ?? "").trim();
  return url || null;
}

/** One entry per person, newest evidence first, handles and unlinkable rows dropped. */
export function namesFor(rows: CelebrityLineRow[]): { name: string; href: string }[] {
  const seen = new Set<string>();
  const out: { name: string; href: string }[] = [];
  const sorted = [...rows].sort((a, b) => (b.said_on ?? "").localeCompare(a.said_on ?? "") || a.celeb_name.localeCompare(b.celeb_name));
  for (const r of sorted) {
    const name = (r.celeb_name ?? "").trim();
    if (isHandleName(name)) continue;
    const href = evidenceHref(r);
    if (!href) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, href });
  }
  return out;
}

export default function TreatmentCelebrityLine({ treatmentId }: { treatmentId: string }) {
  const [rows, setRows] = useState<CelebrityLineRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // `quote` is never selected: it is evidence for checking a claim, not display.
      const { data } = await (supabase as any)
        .from("celebrity_mentions")
        .select("id, celeb_name, source_url, embed_url, said_on")
        .eq("treatment_id", treatmentId)
        .eq("active", true);
      if (!alive) return;
      setRows(((data as any[]) ?? []) as CelebrityLineRow[]);
    })();
    return () => { alive = false; };
  }, [treatmentId]);

  const people = namesFor(rows);
  if (people.length === 0) return null;

  return (
    <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
      Talked about by{" "}
      {people.map((p, i) => (
        <span key={p.href}>
          {i > 0 && (i === people.length - 1 ? " and " : ", ")}
          <a
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: ESPRESSO, fontWeight: 600, textDecoration: "underline" }}
          >
            {p.name}
          </a>
        </span>
      ))}
    </div>
  );
}
