#!/usr/bin/env bash
# Open a named onTrack surface in the booted iOS Simulator (deep link, no coordinates).
#
# Usage:
#   ./scripts/agent-ui-open.sh today
#   ./scripts/agent-ui-open.sh calendar
#   ./scripts/agent-ui-open.sh checklists
#   ./scripts/agent-ui-open.sh travel
#   ./scripts/agent-ui-open.sh travel/<planId>
#   ./scripts/agent-ui-open.sh reset          # same as today
#   ./scripts/agent-ui-open.sh /profile       # raw path
#
# After opening, optionally waits for dump.route / a testID prefix.
# See docs/agent-routes.md

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <alias|path> [--wait-prefix <prefix>] [--wait-secs N]" >&2
  exit 2
fi

DEST="$1"
shift
WAIT_PREFIX=""
WAIT_SECS="${WAIT_SECS:-6}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --wait-prefix)
      WAIT_PREFIX="${2:-}"
      shift 2
      ;;
    --wait-secs)
      WAIT_SECS="${2:-6}"
      shift 2
      ;;
    *)
      echo "error: unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

# Mirror src/utils/agent-ui/route.ts aliases.
resolve_deep_link() {
  local raw="$1"
  case "$raw" in
    today|home|reset) echo "ontrack:///" ;;
    calendar) echo "ontrack:///calendar" ;;
    checklists|todos|to-do) echo "ontrack:///to-do" ;;
    social) echo "ontrack:///social" ;;
    insights) echo "ontrack:///insights" ;;
    profile) echo "ontrack:///profile" ;;
    workouts) echo "ontrack:///workouts" ;;
    plants) echo "ontrack:///plants" ;;
    travel) echo "ontrack:///travel" ;;
    visionBoard|vision-board) echo "ontrack:///vision-board" ;;
    games) echo "ontrack:///games" ;;
    vehicles) echo "ontrack:///vehicles" ;;
    health) echo "ontrack:///health" ;;
    agents) echo "ontrack:///agents" ;;
    nutrition) echo "ontrack:///nutrition-profile" ;;
    activityForm) echo "ontrack:///activity-form" ;;
    /*) echo "ontrack:///${raw#/}" ;;
    *) echo "ontrack:///${raw#/}" ;;
  esac
}

default_wait_prefix() {
  case "$1" in
    today|home|reset) echo "ontrack.today." ;;
    calendar) echo "ontrack.calendar." ;;
    checklists|todos|to-do) echo "ontrack.checklists." ;;
    profile) echo "ontrack.profile." ;;
    travel) echo "ontrack.travel." ;;
    health) echo "ontrack.health." ;;
    *) echo "" ;;
  esac
}

URL="$(resolve_deep_link "$DEST")"
if [[ -z "$WAIT_PREFIX" ]]; then
  WAIT_PREFIX="$(default_wait_prefix "$DEST")"
fi

echo "Opening ${URL}"
xcrun simctl openurl booted "$URL"

if [[ -z "$WAIT_PREFIX" ]]; then
  # Still give navigation a moment, then print route from dump if available.
  sleep 0.6
  ./scripts/agent-ui-dump.sh 2>/dev/null | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  print('route:', d.get('route'))
except Exception:
  pass
" || true
  exit 0
fi

deadline=$((SECONDS + WAIT_SECS))
TMP_DUMP="$(mktemp)"
trap 'rm -f "${TMP_DUMP}"' EXIT
while (( SECONDS < deadline )); do
  if ./scripts/agent-ui-dump.sh >"${TMP_DUMP}" 2>/dev/null; then
    MATCH="$(TMP_DUMP="${TMP_DUMP}" WAIT_PREFIX="${WAIT_PREFIX}" python3 - <<'PY'
import json, os
from pathlib import Path
d = json.loads(Path(os.environ["TMP_DUMP"]).read_text())
prefix = os.environ["WAIT_PREFIX"]
route = d.get("route")
ids = [e.get("testID","") for e in d.get("elements", [])]
hit = any(i.startswith(prefix) for i in ids)
print("ok" if hit else "wait")
print(route or "")
print(sum(1 for i in ids if i.startswith(prefix)))
PY
)"
    status="$(printf '%s\n' "$MATCH" | sed -n '1p')"
    route="$(printf '%s\n' "$MATCH" | sed -n '2p')"
    count="$(printf '%s\n' "$MATCH" | sed -n '3p')"
    if [[ "$status" == "ok" ]]; then
      echo "ready route=${route:-?} prefix=${WAIT_PREFIX} matches=${count}"
      exit 0
    fi
  fi
  sleep 0.15
done

echo "error: timed out waiting for prefix ${WAIT_PREFIX} after opening ${URL}" >&2
exit 1
