# Ingredient ingestion

One-off script that fills `products.ingredients` for Skincare products that are
still missing it. It is a terminal tool, not part of the app.

## How it decides what to trust

incidecoder is the primary source — its meta-description carries the complete
INCI list. The other retailers (peachesandcreme, saranghae, cultbeauty,
lookfantastic, ulta) are kept as fallbacks and are only tried when incidecoder
returns nothing.

A second retailer is **not** required. Instead, every parsed list is validated
token-by-token against the CosIng-derived ingredient dictionary (28,353 names,
MIT licensed). A list is written only when:

- at least 5 ingredients parsed, and
- no single token appears more than twice (the sub-blend guard — that signature
  means the page published the manufacturer's sub-blend breakdown, which would
  dedupe into a correctly spelled but wrongly *ordered* list), and
- at least 97% of tokens resolve against the dictionary.

Anything else is queued for a human. When two sources do resolve and disagree on
the ingredient set, the product is queued as well.

The dictionary is downloaded once and cached to
`scripts/ingredients/.cache/ingredients.csv` (gitignored).

## Running it

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment.

```bash
# Safe default: prints what it would write, writes nothing
bun run scripts/ingredients/ingest.ts

# Test a handful of one brand
bun run scripts/ingredients/ingest.ts --brand COSRX --limit 5

# Actually write (explicit opt-in)
bun run scripts/ingredients/ingest.ts --brand COSRX --write
```

Flags:

| Flag | Meaning |
| --- | --- |
| `--brand <name>` | Run one brand at a time (exact brand string). |
| `--limit <n>` | Stop after `n` products — for test runs. |
| `--dry-run` | Print only. **This is the default.** |
| `--write` | Opt in to writing to the database. |

The script waits at least ~1 second between requests to the same host, so a full
brand takes a while. It never overwrites a row that already has ingredients.

The summary prints per-brand written/queued/failed counts plus the average
dictionary match rate across written products. If that average drops below 99%,
the parser is probably picking up non-ingredient text — investigate before
trusting the run.

## The review queue

Anything the script will not vouch for is written to
`scripts/ingredients/review-queue.json` instead of the database:

- fewer than 97% of tokens matched the dictionary (the entry lists the unmatched
  tokens and the match rate, so you can see what the parser grabbed)
- the source was rejected as a sub-blend breakdown
- two sources resolved and disagree on the ingredient set
- no source resolved at all

Each entry carries the product id, brand, name, the reason, and every candidate
list with the URL it came from, so a human can resolve it by hand. Nothing in
the queue has been written to the database.

One case is resolved automatically rather than queued: when one candidate is a
strict subset of the other, the longer list wins (a shorter list is usually a
truncated page, not an older formula). That decision is logged when it happens.
