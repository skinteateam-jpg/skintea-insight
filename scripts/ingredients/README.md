# Ingredient ingestion

One-off script that fills `products.ingredients` for Skincare products that are
still missing it. It is a terminal tool, not part of the app.

## Why two sources

In a manual pass over 57 Anua products, roughly 1 in 6 needed human judgment:
retailers publishing different formulas after a reformulation, retailers
truncating long lists, retailers publishing the manufacturer's sub-blend
breakdown instead of a consolidated INCI list, and one retailer publishing a
completely different product's ingredients. A single-source scraper would write
all of that as fact, so the script corroborates two independent retailers and
only writes when they agree.

It also rejects a source outright when any single ingredient appears more than
twice in it — that signature means it is a sub-blend breakdown (Water listed
seven times), which would dedupe into a correctly spelled but wrongly *ordered*
list. Wrong order is worse than no data, because nothing flags it.

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

The script waits at least ~1 second between requests to the same host, so a
full brand takes a while. It never overwrites a row that already has
ingredients.

## The review queue

Anything the script will not vouch for is appended to
`scripts/ingredients/review-queue.json` instead of being written:

- the two sources disagree on the ingredient set
- only one source could be found (no corroboration)
- no source could be found at all

Each entry carries the product id, brand, name, the reason, and every candidate
list with the URL it came from, so a human can compare them side by side and
resolve it by hand. Nothing in the queue has been written to the database.

One case is resolved automatically rather than queued: when one candidate is a
strict subset of the other, the longer list wins (a shorter list is usually a
truncated page, not an older formula). That decision is logged when it happens.
