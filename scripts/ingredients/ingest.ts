/**
 * One-off ingredient ingestion script.
 *
 * Fills products.ingredients (text[], INCI order, Title Case) for Skincare rows
 * that are still empty, corroborating across TWO independent retailers before
 * writing anything. Disagreements go to scripts/ingredients/review-queue.json.
 *
 * Usage (see README.md):
 *   bun run scripts/ingredients/ingest.ts --dry-run
 *   bun run scripts/ingredients/ingest.ts --brand COSRX --limit 5 --write
 */

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

type Args = { brand?: string; limit?: number; dryRun: boolean };

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--brand') out.brand = argv[++i];
    else if (a === '--limit') out.limit = Number(argv[++i]);
    else if (a === '--dry-run') out.dryRun = true;
    // explicit opt-in required to write; default stays dry
    else if (a === '--write' || a === '--no-dry-run') out.dryRun = false;
  }
  if (out.limit !== undefined && (!Number.isFinite(out.limit) || out.limit <= 0)) {
    throw new Error('--limit must be a positive number');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Parsing / normalisation
// ---------------------------------------------------------------------------

const NUM_COMMA = '\u0000';

/** Split an INCI string on commas, protecting numeric commas (1,2-Hexanediol). */
export function splitInci(raw: string): string[] {
  const protectedStr = raw.replace(/(?<=\d),(?=\d)/g, NUM_COMMA);
  return protectedStr
    .split(/[,;]/)
    .map((s) => s.replaceAll(NUM_COMMA, ','))
    .map(cleanToken)
    .filter((s) => s.length > 1 && s.length <= 120);
}

/** Trim, drop trailing periods, strip parenthetical percentages / ppm. */
export function cleanToken(tokenRaw: string): string {
  let t = tokenRaw.replace(/\s+/g, ' ').trim();
  // "(70.2%)", "( 3,753ppm )", "70.2%", "3,753 ppm"
  t = t.replace(/\(\s*[\d.,]+\s*(%|ppm|p\.p\.m\.)\s*\)/gi, ' ');
  t = t.replace(/\b[\d.,]+\s*(%|ppm|p\.p\.m\.)\b/gi, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/[.\s]+$/g, '').trim();
  t = t.replace(/^[-–—•*\s]+/, '').trim();
  // drop an unbalanced trailing "(" left behind by stripping
  if ((t.match(/\(/g)?.length ?? 0) > (t.match(/\)/g)?.length ?? 0)) {
    t = t.replace(/\s*\([^)]*$/, '').trim();
  }
  return t;
}

const ACRONYMS = [
  'EDTA', 'DNA', 'PCA', 'PEG', 'PPG', 'PVM', 'MA', 'IPDI', 'VP', 'SE',
  'BHA', 'BHT', 'HCl', 'INCI', 'AHA', 'PVP', 'CI', 'UV', 'SD', 'TEA', 'MEA', 'DEA',
];
const CERAMIDE_CODES = ['NP', 'AP', 'AS', 'EOP', 'NG', 'NS'];
const IRREGULAR: Record<string, string> = {
  'o-cymen-5-ol': 'o-Cymen-5-ol',
  'p-cresol': 'p-Cresol',
  'tetra-di-t-butyl': 'Tetra-di-t-butyl',
};
const LOWER_WORDS = new Set(['and', 'or', 'of', 'the']);

function titleCasePiece(piece: string): string {
  if (!piece) return piece;
  const upper = piece.toUpperCase();
  if (ACRONYMS.includes(upper)) return ACRONYMS[ACRONYMS.indexOf(upper)]!;
  if (CERAMIDE_CODES.includes(upper)) return upper;
  // alkyl designators: C12-20, C14-22, C9-12, C12-13
  if (/^c\d+(-\d+)?$/i.test(piece)) return piece.toUpperCase();
  // PEG-150, PPG-26, Polyglyceryl-10, Laureth-4, CI 77491 handled by hyphen split
  // keep tokens that contain digits mostly intact, just cap the leading letter run
  return piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase();
}

/** Normalise a single ingredient name to the existing Title Case convention. */
export function toTitleCase(nameRaw: string): string {
  const name = nameRaw.replace(/\s+/g, ' ').trim();
  const lower = name.toLowerCase();
  if (IRREGULAR[lower]) return IRREGULAR[lower]!;

  // Split on spaces and slashes, keeping the separators.
  return name
    .split(/(\s+|\/)/)
    .map((chunk) => {
      if (/^(\s+|\/)$/.test(chunk)) return chunk;
      const lc = chunk.toLowerCase();
      if (IRREGULAR[lc]) return IRREGULAR[lc]!;
      if (LOWER_WORDS.has(lc)) return lc;
      // handle parentheses wrappers: (Rice)
      const m = chunk.match(/^(\(*)(.*?)(\)*)$/);
      const open = m?.[1] ?? '';
      const core = m?.[2] ?? chunk;
      const close = m?.[3] ?? '';
      // hyphenated: PEG-150, 3-O-Ethyl, Polyglyceryl-10, o-Cymen-5-ol
      const hyphened = core
        .split('-')
        .map((p, i, arr) => {
          if (/^\d+$/.test(p)) return p;
          // single-letter chemistry markers stay upper (3-O-Ethyl, N-Acetyl)
          if (p.length === 1 && /[a-z]/i.test(p)) {
            return i === 0 && arr.length > 1 && /^[op]$/i.test(p) ? p.toLowerCase() : p.toUpperCase();
          }
          return titleCasePiece(p);
        })
        .join('-');
      return open + hyphened + close;
    })
    .join('');
}

/** Key used for set comparison: case-insensitive, parenthetical names dropped. */
function compareKey(name: string): string {
  return name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

/**
 * A token appearing more than twice means this is the manufacturer's
 * sub-blend breakdown, not an INCI declaration. Reject the whole source.
 */
export function isSubBlendBreakdown(list: string[]): boolean {
  const counts = new Map<string, number>();
  for (const item of list) {
    const k = compareKey(item);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const n of counts.values()) if (n > 2) return true;
  return false;
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", reg: '', trade: '', deg: '°',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z0-9#]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

function metaDescription(html: string): string | null {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i,
    /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeEntities(m[1]);
  }
  return null;
}

/** Longest comma-run in a blob of text that plausibly looks like an INCI list. */
function bestCommaRun(text: string): string | null {
  const candidates = text.split(/(?<=[.!?])\s+(?=[A-Z])|\n{2,}|\|/);
  let best: string | null = null;
  for (const c of candidates) {
    const commas = (c.match(/,/g) ?? []).length;
    if (commas < 5) continue;
    if (!best || c.length > best.length) best = c;
  }
  if (best) return best;
  const commas = (text.match(/,/g) ?? []).length;
  return commas >= 5 ? text : null;
}

/** Pull the segment following an "Ingredients" style label, if present. */
function afterIngredientLabel(text: string): string | null {
  const m = text.match(
    /(?:full list of ingredients|ingredients list|full ingredients|ingredient list|ingredients)\s*[:\-–]\s*([\s\S]{40,4000})/i,
  );
  return m?.[1] ?? null;
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const HOST_DELAY_MS = 1100;
const lastHit = new Map<string, number>();

async function politeFetch(url: string): Promise<string | null> {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  const prev = lastHit.get(host) ?? 0;
  const wait = prev + HOST_DELAY_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());

  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml/i.test(ct)) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type Candidate = { source: string; url: string; list: string[] };

type SourceDef = {
  name: string;
  /** Candidate URLs to try, cheapest/most likely first. */
  urls: (brand: string, name: string) => string[];
  extract: (html: string) => string | null;
};

/**
 * Ordered by observed reliability. incidecoder is first because its
 * meta-description carries the complete INCI list (cheapest source of all).
 */
const SOURCES: SourceDef[] = [
  {
    name: 'incidecoder',
    urls: (brand, name) => [
      `https://incidecoder.com/products/${slug(brand)}-${slug(name)}`,
      `https://incidecoder.com/search/product?query=${encodeURIComponent(`${brand} ${name}`)}`,
    ],
    extract: (html) => metaDescription(html) ?? afterIngredientLabel(stripTags(html)),
  },
  {
    name: 'peachesandcreme',
    urls: (brand, name) => [
      `https://peachesandcremeshop.com/products/${slug(`${brand} ${name}`)}`,
      `https://peachesandcremeshop.com/search?q=${encodeURIComponent(`${brand} ${name}`)}`,
    ],
    extract: (html) => afterIngredientLabel(stripTags(html)),
  },
  {
    name: 'saranghae',
    urls: (brand, name) => [
      `https://saranghae.ch/products/${slug(`${brand} ${name}`)}`,
      `https://saranghae.ch/search?q=${encodeURIComponent(`${brand} ${name}`)}`,
    ],
    extract: (html) => afterIngredientLabel(stripTags(html)),
  },
  {
    name: 'cultbeauty',
    urls: (_brand, name) => [
      `https://www.cultbeauty.com/elysium/search?search=${encodeURIComponent(name)}`,
    ],
    extract: (html) => afterIngredientLabel(stripTags(html)),
  },
  {
    name: 'lookfantastic',
    urls: (_brand, name) => [
      `https://www.lookfantastic.com/elysium/search?search=${encodeURIComponent(name)}`,
    ],
    extract: (html) => afterIngredientLabel(stripTags(html)),
  },
  {
    name: 'ulta',
    urls: (brand, name) => [
      `https://www.ulta.com/search?Ntt=${encodeURIComponent(`${brand} ${name}`)}`,
    ],
    extract: (html) => afterIngredientLabel(stripTags(html)),
  },
];

async function candidateFrom(src: SourceDef, brand: string, name: string): Promise<Candidate | null> {
  for (const url of src.urls(brand, name)) {
    const html = await politeFetch(url);
    if (!html) continue;
    const blob = src.extract(html);
    if (!blob) continue;
    const run = bestCommaRun(blob);
    if (!run) continue;
    const list = splitInci(run);
    if (list.length < 5) continue;
    if (isSubBlendBreakdown(list)) {
      console.log(`   ⚠︎ ${src.name}: rejected (sub-blend breakdown, repeated tokens)`);
      continue;
    }
    return { source: src.name, url, list };
  }
  return null;
}

/** Collect up to two independent candidates. */
async function gatherCandidates(brand: string, name: string): Promise<Candidate[]> {
  const found: Candidate[] = [];
  for (const src of SOURCES) {
    const c = await candidateFrom(src, brand, name);
    if (c) {
      found.push(c);
      console.log(`   ✓ ${c.source}: ${c.list.length} ingredients`);
    }
    if (found.length >= 2) break;
  }
  return found;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

type Decision =
  | { kind: 'write'; list: string[]; note?: string }
  | { kind: 'queue'; reason: string };

export function decide(a: Candidate, b: Candidate): Decision {
  const setA = new Set(a.list.map(compareKey));
  const setB = new Set(b.list.map(compareKey));
  const longer = a.list.length >= b.list.length ? a : b;
  const shorter = longer === a ? b : a;

  const sameSet = setA.size === setB.size && [...setA].every((k) => setB.has(k));
  if (sameSet) {
    // Order may differ; trust the longer/more complete list's order.
    return { kind: 'write', list: longer.list };
  }

  const shorterKeys = new Set(shorter.list.map(compareKey));
  const isSubset = [...shorterKeys].every((k) => new Set(longer.list.map(compareKey)).has(k));
  if (isSubset) {
    return {
      kind: 'write',
      list: longer.list,
      note: `${shorter.source} (${shorter.list.length}) was a strict subset of ${longer.source} (${longer.list.length}) — likely a truncated page; used the longer list`,
    };
  }

  return { kind: 'queue', reason: `sources disagree (${a.source} vs ${b.source})` };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

type ProductRow = { id: string; name: string; brand: string; ingredients: string[] | null };

type QueueEntry = {
  id: string;
  brand: string;
  name: string;
  reason: string;
  candidates: { source: string; url: string; ingredients: string[] }[];
  queued_at: string;
};

const QUEUE_PATH = resolve(import.meta.dirname ?? '.', 'review-queue.json');

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SERVICE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = supabase
    .from('products')
    .select('id,name,brand,ingredients')
    .eq('category', 'Skincare')
    .order('brand', { ascending: true })
    .order('name', { ascending: true });
  if (args.brand) query = query.eq('brand', args.brand);

  const { data, error } = await query;
  if (error) {
    console.error('Failed to load products:', error.message);
    process.exit(1);
  }

  const rows = ((data ?? []) as ProductRow[]).filter(
    (r) => !r.ingredients || r.ingredients.length === 0,
  );
  const targets = args.limit ? rows.slice(0, args.limit) : rows;

  console.log(
    `${targets.length} product(s) missing ingredients${args.brand ? ` for ${args.brand}` : ''}` +
      `${args.dryRun ? '  [DRY RUN — nothing will be written]' : '  [WRITING]'}\n`,
  );

  const queue: QueueEntry[] = [];
  const stats = new Map<string, { written: number; queued: number; failed: number }>();
  const bump = (brand: string, k: 'written' | 'queued' | 'failed') => {
    const s = stats.get(brand) ?? { written: 0, queued: 0, failed: 0 };
    s[k]++;
    stats.set(brand, s);
  };

  for (const [i, row] of targets.entries()) {
    console.log(`[${i + 1}/${targets.length}] ${row.brand} — ${row.name}`);
    let candidates: Candidate[] = [];
    try {
      candidates = await gatherCandidates(row.brand, row.name);
    } catch (e) {
      console.log(`   ✗ fetch error: ${(e as Error).message}`);
    }

    const enqueue = (reason: string) => {
      queue.push({
        id: row.id,
        brand: row.brand,
        name: row.name,
        reason,
        candidates: candidates.map((c) => ({ source: c.source, url: c.url, ingredients: c.list })),
        queued_at: new Date().toISOString(),
      });
      console.log(`   → queued for review: ${reason}`);
    };

    if (candidates.length === 0) {
      enqueue('no source found');
      bump(row.brand, 'failed');
      continue;
    }
    if (candidates.length === 1) {
      enqueue(`only one source found (${candidates[0]!.source}) — needs corroboration`);
      bump(row.brand, 'queued');
      continue;
    }

    const decision = decide(candidates[0]!, candidates[1]!);
    if (decision.kind === 'queue') {
      enqueue(decision.reason);
      bump(row.brand, 'queued');
      continue;
    }

    if (decision.note) console.log(`   ℹ ${decision.note}`);
    const normalised = decision.list.map(toTitleCase).filter((s) => s.length > 1);

    if (args.dryRun) {
      console.log(`   would write ${normalised.length}: ${normalised.slice(0, 8).join(', ')}…`);
      bump(row.brand, 'written');
      continue;
    }

    // Never overwrite a row that already has ingredients.
    const { data: updated, error: upErr } = await supabase
      .from('products')
      .update({ ingredients: normalised })
      .eq('id', row.id)
      .or('ingredients.is.null,ingredients.eq.{}')
      .select('id');

    if (upErr) {
      console.log(`   ✗ write failed: ${upErr.message}`);
      bump(row.brand, 'failed');
    } else if (!updated || updated.length === 0) {
      console.log('   ✗ skipped: row already has ingredients');
      bump(row.brand, 'failed');
    } else {
      console.log(`   ✓ wrote ${normalised.length} ingredients`);
      bump(row.brand, 'written');
    }
  }

  if (queue.length > 0) {
    await mkdir(dirname(QUEUE_PATH), { recursive: true });
    await writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2) + '\n', 'utf8');
    console.log(`\nWrote ${queue.length} entr${queue.length === 1 ? 'y' : 'ies'} to ${QUEUE_PATH}`);
  }

  let w = 0;
  let q = 0;
  let f = 0;
  console.log('\n--- Summary ---');
  console.log('brand'.padEnd(24) + 'written  queued  failed');
  for (const [brand, s] of [...stats.entries()].sort()) {
    console.log(
      brand.padEnd(24) +
        String(s.written).padEnd(9) +
        String(s.queued).padEnd(8) +
        String(s.failed),
    );
    w += s.written;
    q += s.queued;
    f += s.failed;
  }
  console.log('-'.repeat(46));
  console.log('TOTAL'.padEnd(24) + String(w).padEnd(9) + String(q).padEnd(8) + String(f));
  if (args.dryRun) console.log('\nDRY RUN — nothing was written. Re-run with --write to persist.');
}

await main();
