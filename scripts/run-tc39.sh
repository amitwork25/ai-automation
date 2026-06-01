#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build:run-payload

PAYLOAD="$ROOT/inputs/bbps-ccbp/run-payload.json"

echo "Running pipeline directly from: $PAYLOAD"
tsx scripts/run-payload-direct.ts "$PAYLOAD"
