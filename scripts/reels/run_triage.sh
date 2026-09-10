#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${APIFY_TOKEN:-}" ]]; then
  echo "APIFY_TOKEN not set" >&2
  exit 1
fi

DATASET_ID="${1:-}"
shift || true

OUT_DIR="/tmp/reels"
mkdir -p "$OUT_DIR"

OUT_FILE="$OUT_DIR/${DATASET_ID}.json"
TMP_FILE="${OUT_FILE}.tmp"

URL="https://api.apify.com/v2/datasets/${DATASET_ID}/items?clean=true&format=json"

curl -fsS -H "Authorization: Bearer ${APIFY_TOKEN}" "$URL" > "$TMP_FILE"

ITEM_COUNT=$(python3 - "$TMP_FILE" <<'PY'
import json, sys
with open(sys.argv[1], 'r') as f:
    data = json.load(f)
if not isinstance(data, list):
    print(json.dumps(data)[:200], file=sys.stderr)
    sys.exit(1)
print(len(data))
PY
)

mv "$TMP_FILE" "$OUT_FILE"

echo "Fetched ${ITEM_COUNT} items"

python3 scripts/reels/skintea_reels.py triage "$OUT_FILE" "$@"
