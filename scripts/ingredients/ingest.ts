/**
 * One-off ingredient ingestion script.
 *
 * Fills products.ingredients (text[], INCI order, Title Case) for Skincare rows
 * that are still empty. incidecoder is the primary source; every parsed list is
 * validated token-by-token against the CosIng-derived ingredient dictionary
 * before it is written. Anything that fails validation goes to
 * scripts/ingredients/review-queue.json instead.
 *
 * Usage (see README.md):
 *   bun run scripts/ingredients/ingest.ts --dry-run
 *   bun run scripts/ingredients/ingest.ts --brand COSRX --limit 5 --write
 */

import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { inflateRawSync } from 'node:zlib';

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

const SCRIPT_DIR = resolve(import.meta.dirname ?? '.');
const CACHE_DIR = resolve(SCRIPT_DIR, '.cache');
const DICT_CSV = resolve(CACHE_DIR, 'ingredients.csv');
const QUEUE_PATH = resolve(SCRIPT_DIR, 'review-queue.json');
const DICT_ZIP_URL =
  'https://codeload.github.com/beauteeru/cosmetic-ingredients-dataset/zip/refs/heads/main';

/** Minimum share of tokens that must resolve against the dictionary to write. */
const MATCH_THRESHOLD = 0.98;

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
  // safety net: if a label prefix leaked through, keep only the part after the last colon
  if (t.includes(':')) t = t.slice(t.lastIndexOf(':') + 1).trim();
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
  const acronymIdx = ACRONYMS.indexOf(upper);
  if (acronymIdx >= 0) return ACRONYMS[acronymIdx]!;
  if (CERAMIDE_CODES.includes(upper)) return upper;
  // alkyl designators: C12-20, C14-22, C9-12, C12-13
  if (/^c\d+(-\d+)?$/i.test(piece)) return piece.toUpperCase();
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
      const m = chunk.match(/^(\(*)(.*?)(\)*)$/);
      const open = m?.[1] ?? '';
      const core = m?.[2] ?? chunk;
      const close = m?.[3] ?? '';
      // hyphenated: PEG-150, 3-O-Ethyl, Polyglyceryl-10, o-Cymen-5-ol
      const hyphened = core
        .split('-')
        .map((p, i, arr) => {
          if (/^\d+$/.test(p)) return p;
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
// CosIng dictionary
// ---------------------------------------------------------------------------

/** Names CosIng does not carry under the spelling retailers use. */
const ALIASES: Record<string, string> = {
  aqua: 'water',
  'aqua/water': 'water',
  'aqua (water)': 'water',
  'water/aqua/eau': 'water',
  'aqua/water/eau': 'water',
  eau: 'water',
  parfum: 'fragrance',
  glycerine: 'glycerin',
};

/** Genuine INCI names simply missing from this dump. */
const LOCAL_ADDITIONS = [
  'vegetable oil',
  'c12-13 alketh-9',
  'melaleuca alternifolia leaf oil',
  'propolis extract',
  'camellia sinensis leaf water',
  'aloe barbadensis leaf water',
  'sodium carboxymethyl cellulose',
  'mineral oil',
  'polyurethane film',
];

/** Locate a file inside a zip via its central directory and inflate it. */
function extractFromZip(zip: Buffer, endsWith: string): Buffer | null {
  // End of central directory record
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const entries = zip.readUInt16LE(eocd + 10);
  let ptr = zip.readUInt32LE(eocd + 16);

  for (let e = 0; e < entries; e++) {
    if (zip.readUInt32LE(ptr) !== 0x02014b50) return null;
    const method = zip.readUInt16LE(ptr + 10);
    const compressedSize = zip.readUInt32LE(ptr + 20);
    const nameLen = zip.readUInt16LE(ptr + 28);
    const extraLen = zip.readUInt16LE(ptr + 30);
    const commentLen = zip.readUInt16LE(ptr + 32);
    const localOffset = zip.readUInt32LE(ptr + 42);
    const name = zip.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');

    if (name.toLowerCase().endsWith(endsWith.toLowerCase())) {
      const lhNameLen = zip.readUInt16LE(localOffset + 26);
      const lhExtraLen = zip.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + lhNameLen + lhExtraLen;
      const data = zip.subarray(dataStart, dataStart + compressedSize);
      return method === 0 ? Buffer.from(data) : inflateRawSync(data);
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function parseCsvNames(csv: string): string[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const splitRow = (row: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (inQuotes && row[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };

  const header = splitRow(lines[0]!).map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf('name');
  const idx = nameIdx >= 0 ? nameIdx : 0;
  const names: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const v = splitRow(lines[i]!)[idx];
    if (v) names.push(v.trim());
  }
  return names;
}

async function loadDictionary(): Promise<Set<string>> {
  let csv: string;
  if (existsSync(DICT_CSV)) {
    csv = await readFile(DICT_CSV, 'utf8');
  } else {
    console.log('Downloading CosIng ingredient dictionary (first run only)…');
    const res = await fetch(DICT_ZIP_URL);
    if (!res.ok) throw new Error(`dictionary download failed: HTTP ${res.status}`);
    const zip = Buffer.from(await res.arrayBuffer());
    const file = extractFromZip(zip, 'ingredients.csv');
    if (!file) throw new Error('ingredients.csv not found inside the downloaded zip');
    csv = file.toString('utf8');
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(DICT_CSV, csv, 'utf8');
    console.log(`Cached dictionary to ${DICT_CSV}`);
  }

  const dict = new Set<string>();
  for (const n of parseCsvNames(csv)) dict.add(n.toLowerCase().replace(/\s+/g, ' ').trim());
  for (const n of LOCAL_ADDITIONS) dict.add(n);
  console.log(`Dictionary loaded: ${dict.size} ingredient names\n`);
  return dict;
}

/**
 * Result of testing one form against the dictionary.
 * `alias` is set only when the hit came via the alias table — those are the
 * only tokens we are allowed to rewrite on write.
 */
type Hit = { alias: string | null };

function dictHit(dict: Set<string>, formRaw: string): Hit | null {
  const form = formRaw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!form) return null;
  const alias = ALIASES[form];
  if (alias && dict.has(alias)) return { alias };
  if (dict.has(form)) return { alias: null };
  return null;
}

/**
 * Resolve a token to its canonical stored spelling, or null when unmatched.
 * Alias-table hits are rewritten to the alias target; every other hit keeps
 * the source spelling (only toTitleCase normalisation is applied).
 * Tries forms a–e in order.
 */
export function resolveIngredient(dict: Set<string>, token: string): string | null {
  const base = token.replace(/\s+/g, ' ').trim();
  const out = (hit: Hit) => toTitleCase(hit.alias ?? base);

  // a. as-is
  let hit = dictHit(dict, base);
  if (hit) return out(hit);

  // b. parenthetical removed
  const outside = base.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (outside && outside !== base) {
    hit = dictHit(dict, outside);
    if (hit) return out(hit);
  }

  // c. parenthetical contents
  const inner = [...base.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]!.trim()).filter(Boolean);
  for (const p of inner) {
    hit = dictHit(dict, p);
    if (hit) return out(hit);
  }

  // d. hyphen/space swapped both ways
  for (const form of [base, outside].filter(Boolean)) {
    hit = dictHit(dict, form.replace(/-/g, ' '));
    if (hit) return out(hit);
    hit = dictHit(dict, form.replace(/ /g, '-'));
    if (hit) return out(hit);
  }

  // e. two-part slash names, but never real slash INCI ("Caprylic/Capric Triglyceride")
  const parts = base.split('/');
  if (parts.length === 2) {
    const ok = parts.every(
      (p) => !/\d/.test(p) && p.trim().split(/\s+/).length <= 3 && p.trim().length > 1,
    );
    if (ok) {
      const hits = parts.map((p) => dictHit(dict, p.trim()));
      if (hits.every((h) => h !== null)) return toTitleCase(base);
    }
  }

  return null;
}

export function validate(
  dict: Set<string>,
  list: string[],
): { rate: number; unmatched: string[]; resolved: string[] } {
  const unmatched: string[] = [];
  const resolved: string[] = [];
  for (const token of list) {
    const canonical = resolveIngredient(dict, token);
    if (canonical === null) {
      unmatched.push(token);
      resolved.push(toTitleCase(token));
    } else {
      resolved.push(canonical);
    }
  }
  const rate = list.length === 0 ? 0 : (list.length - unmatched.length) / list.length;
  return { rate, unmatched, resolved };
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

type Candidate = { source: string; url: string; list: string[]; subBlend?: boolean };

type SourceDef = {
  name: string;
  urls: (brand: string, name: string) => string[];
  extract: (html: string) => string | null;
};

/** Primary source: its meta-description carries the complete INCI list. */
const PRIMARY: SourceDef = {
  name: 'incidecoder',
  urls: (brand, name) => [
    `https://incidecoder.com/products/${slug(brand)}-${slug(name)}`,
    `https://incidecoder.com/search/product?query=${encodeURIComponent(`${brand} ${name}`)}`,
  ],
  extract: (html) => {
    const blob = metaDescription(html) ?? afterIngredientLabel(stripTags(html));
    if (!blob) return null;
    // incidecoder meta descriptions are "<Product> ingredients explained: Aqua/Water, ..." —
    // drop everything up to and including that phrase (no-op when the phrase is absent)
    return blob.replace(/^[\s\S]*?ingredients\s+explained\s*:\s*/i, '');
  },
};

/** Fallbacks — only tried when the primary returns nothing. */
const FALLBACKS: SourceDef[] = [
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
      return { source: src.name, url, list, subBlend: true };
    }
    return { source: src.name, url, list };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Comparison (only used when a fallback also resolves)
// ---------------------------------------------------------------------------

type Decision =
  | { kind: 'write'; list: string[]; note?: string }
  | { kind: 'queue'; reason: string };

export function decide(a: Candidate, b: Candidate): Decision {
  const keysA = a.list.map(compareKey);
  const keysB = b.list.map(compareKey);
  const setA = new Set(keysA);
  const setB = new Set(keysB);
  const longer = a.list.length >= b.list.length ? a : b;
  const shorter = longer === a ? b : a;

  const sameSet = setA.size === setB.size && [...setA].every((k) => setB.has(k));
  if (sameSet) return { kind: 'write', list: longer.list };

  const longerSet = new Set(longer.list.map(compareKey));
  const isSubset = [...new Set(shorter.list.map(compareKey))].every((k) => longerSet.has(k));
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
  unmatched?: string[];
  match_rate?: number;
  candidates: { source: string; url: string; ingredients: string[] }[];
  queued_at: string;
};

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

  const dict = await loadDictionary();

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
  const writtenRates: number[] = [];

  for (const [i, row] of targets.entries()) {
    console.log(`[${i + 1}/${targets.length}] ${row.brand} — ${row.name}`);

    const candidates: Candidate[] = [];
    try {
      const primary = await candidateFrom(PRIMARY, row.brand, row.name);
      if (primary) {
        candidates.push(primary);
        if (!primary.subBlend) console.log(`   ✓ ${primary.source}: ${primary.list.length} ingredients`);
      } else {
        // Only reach for the other retailers when the primary found nothing.
        for (const src of FALLBACKS) {
          const c = await candidateFrom(src, row.brand, row.name);
          if (c) {
            candidates.push(c);
            if (!c.subBlend) console.log(`   ✓ ${c.source}: ${c.list.length} ingredients`);
            if (candidates.length >= 2) break;
          }
        }
      }
    } catch (e) {
      console.log(`   ✗ fetch error: ${(e as Error).message}`);
    }

    const enqueue = (reason: string, extra?: { unmatched?: string[]; rate?: number }) => {
      queue.push({
        id: row.id,
        brand: row.brand,
        name: row.name,
        reason,
        ...(extra?.unmatched ? { unmatched: extra.unmatched } : {}),
        ...(extra?.rate !== undefined ? { match_rate: Number(extra.rate.toFixed(4)) } : {}),
        candidates: candidates.map((c) => ({ source: c.source, url: c.url, ingredients: c.list })),
        queued_at: new Date().toISOString(),
      });
      console.log(`   → queued for review: ${reason}`);
    };

    const usable = candidates.filter((c) => !c.subBlend);

    if (candidates.length === 0) {
      enqueue('no source found');
      bump(row.brand, 'failed');
      continue;
    }
    if (usable.length === 0) {
      enqueue('source rejected: sub-blend breakdown (repeated tokens)');
      bump(row.brand, 'queued');
      continue;
    }

    let list: string[];
    let note: string | undefined;
    let sourceLabel: string;
    if (usable.length >= 2) {
      const decision = decide(usable[0]!, usable[1]!);
      if (decision.kind === 'queue') {
        enqueue(decision.reason);
        bump(row.brand, 'queued');
        continue;
      }
      list = decision.list;
      note = decision.note;
      sourceLabel = usable.map((c) => c.source).join(' + ');
    } else {
      const only = usable[0]!;
      // incidecoder is a dedicated INCI database and is trusted on its own.
      // Any other single source still needs a second opinion.
      if (only.source !== 'incidecoder') {
        enqueue(`only one source found (${only.source}) — retailer sources need corroboration`);
        bump(row.brand, 'queued');
        continue;
      }
      list = only.list;
      sourceLabel = 'incidecoder, uncorroborated';
    }

    if (list.length < 5) {
      enqueue(`only ${list.length} ingredients parsed`);
      bump(row.brand, 'queued');
      continue;
    }


    const { rate, unmatched, resolved } = validate(dict, list);
    const pct = (rate * 100).toFixed(1);
    if (unmatched.length > 0) {
      console.log(`   unmatched (${unmatched.length}): ${unmatched.join(' | ')}`);
    }
    if (rate < MATCH_THRESHOLD) {
      enqueue(
        `only ${pct}% of tokens matched the ingredient dictionary (threshold ${(MATCH_THRESHOLD * 100).toFixed(0)}%) — the parser may have grabbed marketing copy`,
        { unmatched, rate },
      );
      bump(row.brand, 'queued');
      continue;
    }

    if (note) console.log(`   ℹ ${note}`);
    const normalised = resolved.filter((s) => s.length > 1);

    if (args.dryRun) {
      console.log(
        `   would write ${normalised.length} ingredients (${sourceLabel}, ${pct}% dictionary match): ${normalised.slice(0, 8).join(', ')}…`,
      );
      writtenRates.push(rate);
      bumpSource(sourceLabel);
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
      console.log(
        `   ✓ wrote ${normalised.length} ingredients (${sourceLabel}, ${pct}% dictionary match)`,
      );
      writtenRates.push(rate);
      bumpSource(sourceLabel);
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
      brand.padEnd(24) + String(s.written).padEnd(9) + String(s.queued).padEnd(8) + String(s.failed),
    );
    w += s.written;
    q += s.queued;
    f += s.failed;
  }
  console.log('-'.repeat(46));
  console.log('TOTAL'.padEnd(24) + String(w).padEnd(9) + String(q).padEnd(8) + String(f));
  console.log(`\nWritten: ${w}   Queued for review: ${q}   Failed: ${f}`);

  if (writtenRates.length > 0) {
    const avg = writtenRates.reduce((s, r) => s + r, 0) / writtenRates.length;
    const avgPct = avg * 100;
    console.log(`Average dictionary match rate across written products: ${avgPct.toFixed(2)}%`);
    if (avgPct < 99) {
      console.log('⚠︎ Average match rate is below 99% — the parser is probably picking up non-ingredient text.');
    }
  }
  if (args.dryRun) console.log('\nDRY RUN — nothing was written. Re-run with --write to persist.');
}

await main();
