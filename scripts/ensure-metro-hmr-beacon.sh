#!/usr/bin/env bash
# Create the gitignored Metro HMR probe file if missing.
# Touched by metro-watcher live probes; must stay under src/ (loaded module graph).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROBE="${METRO_WATCHER_PROBE_FILE:-$ROOT/src/utils/dev/metro-hmr-beacon.ts}"

if [[ -f "$PROBE" ]]; then
  exit 0
fi

mkdir -p "$(dirname "$PROBE")"
cat >"$PROBE" <<'EOF'
// Local Metro watcher probe artifact (gitignored).
// Created by scripts/ensure-metro-hmr-beacon.sh; nonce updates by metro-watcher.sh.
export const METRO_HMR_BEACON = 'metro-hmr-beacon';
EOF
