// Where a long verbatim quote's excerpt starts. Pure: text and product names in, character offset out.
//
// A long post (an empties round-up, a 50-product review) often names the tagged product far below the opening, so an
// excerpt of the first 280 characters shows nothing about it. The excerpt starts instead at the line or sentence where
// the tagged product is discussed:
//   1. Terms come from the product name and its line (family) name, lower-cased, split on anything that is not a letter
//      or digit. The brand's own words, generic words and 1–2 letter words are dropped; numbers are kept.
//   2. The text is cut into segments at real line breaks and at sentence ends (. ! ? followed by space). Each segment is
//      scored on its own (never borrowing words from the next segment): the number of distinct terms it contains.
//   3. A segment names the product when it holds (a number from the name plus one other term) or (three other terms).
//      Snail 92 therefore matches "Advanced Snail AIO cream" (advanced, snail, cream) but not "Snail 96 essence".
//   4. If a naming segment starts in the first 200 characters, the product is already visible: the excerpt starts at 0.
//   5. Otherwise the naming segment with the most terms wins; on a tie, the earliest (the first place it is discussed).
// When nothing names the product, the excerpt starts at the beginning, exactly as before.

const GENERIC = new Set([
  "the", "and", "with", "for", "all", "one", "new", "mini", "set", "kit", "line", "size", "original", "formula", "spf", "pa",
  "ml", "oz", "pack", "edition", "limited", "version", "type", "best", "pro",
]);
const VISIBLE = 200;

export function excerptTerms(names: Array<string | null | undefined>, brand: string | null | undefined): string[] {
  const brandWords = new Set(String(brand ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const terms = new Set<string>();
  for (const name of names) {
    for (const w of String(name ?? "").toLowerCase().replace(/^line\s+/, "").split(/[^a-z0-9]+/)) {
      if (!w || brandWords.has(w) || GENERIC.has(w)) continue;
      if (/^\d+$/.test(w) || w.length >= 3) terms.add(w);
    }
  }
  return [...terms];
}

export function excerptStart(text: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const numbers = terms.filter((t) => /^\d+$/.test(t));
  const words = terms.filter((t) => !/^\d+$/.test(t));
  const segments: Array<{ start: number; end: number }> = [];
  const re = /\n+|[.!?](?=\s)/g;
  let from = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + (m[0].startsWith("\n") ? 0 : 1);
    if (end > from) segments.push({ start: from, end });
    from = m.index + m[0].length;
  }
  if (from < text.length) segments.push({ start: from, end: text.length });
  let best = -1;
  let bestScore = 0;
  for (const seg of segments) {
    let s = seg.start;
    while (s < seg.end && /\s/.test(text[s])) s++;
    const lower = text.slice(s, seg.end).toLowerCase();
    const has = (t: string) => new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(lower);
    const n = numbers.filter(has).length;
    const w = words.filter(has).length;
    const names = (n >= 1 && w >= 1) || w >= 3 || (terms.length === 1 && n + w === 1);
    if (!names) continue;
    if (s < VISIBLE) return 0;
    const score = n + w;
    if (score > bestScore) { best = s; bestScore = score; }
  }
  return best < 0 ? 0 : best;
}
