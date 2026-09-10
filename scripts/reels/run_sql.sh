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

if [[ ! -f "$OUT_FILE" ]]; then
  URL="https://api.apify.com/v2/datasets/${DATASET_ID}/items?clean=true&format=json"
  curl -fsS -H "Authorization: Bearer ${APIFY_TOKEN}" "$URL" > "$TMP_FILE"

  python3 - <<'PY' "$TMP_FILE"
import json, sys
with open(sys.argv[1], 'r') as f:
    data = json.load(f)
if not isinstance(data, list):
    print(json.dumps(data)[:200], file=sys.stderr)
    sys.exit(1)
PY

  mv "$TMP_FILE" "$OUT_FILE"
fi

python3 scripts/reels/skintea_reels.py sql "$OUT_FILE" "$@"
