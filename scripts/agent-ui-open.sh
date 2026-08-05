#!/usr/bin/env bash
# Open a named onTrack surface (prefer one in-app batch: goto + wait).
#
# Usage:
#   ./scripts/agent-ui-open.sh today
#   ./scripts/agent-ui-open.sh travel/<planId>/add/flight
#   ./scripts/agent-ui-open.sh health/mood
#   ./scripts/agent-ui-open.sh reset
#
# See docs/agent-routes.md

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <alias|path> [--wait-prefix <prefix>] [--wait-secs N] [--no-wait]" >&2
  exit 2
fi

DEST="$1"
shift
WAIT_PREFIX=""
NO_WAIT=0
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
    --no-wait)
      NO_WAIT=1
      shift
      ;;
    *)
      echo "error: unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

resolve_deep_link() {
  local raw="$1"
  case "$raw" in
    today|home|reset) echo "ontrack:///" ;;
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
    travel/*) echo "ontrack.travel." ;;
    health|health/*) echo "ontrack.health." ;;
    activity|activityForm|activity-form) echo "ontrack.activityForm." ;;
    *) echo "" ;;
  esac
}

URL="$(resolve_deep_link "$DEST")"
if [[ -z "$WAIT_PREFIX" ]]; then
  WAIT_PREFIX="$(default_wait_prefix "$DEST")"
fi

echo "Opening ${DEST}"

# Soft heal if the bridge looks dead (Metro up but app disconnected).
if ! WAIT_SECS=1 agent_ui_send_op route >/dev/null 2>&1; then
  agent_ui_heal_packager || true
fi

if (( NO_WAIT )) || [[ -z "$WAIT_PREFIX" ]]; then
  if STATUS_JSON="$(WAIT_SECS=3 agent_ui_send_op goto "${DEST}" 2>/dev/null)"; then
    echo "${STATUS_JSON}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("detail") or "goto ok")' 2>/dev/null || echo "goto ok"
    exit 0
  fi
  echo "file goto unavailable; openurl ${URL}"
  xcrun simctl openurl booted "$URL"
  exit 0
fi

TIMEOUT_MS=$((WAIT_SECS * 1000))
OPS_JSON="$(DEST="${DEST}" WAIT_PREFIX="${WAIT_PREFIX}" TIMEOUT_MS="${TIMEOUT_MS}" python3 - <<'PY'
import json, os
print(json.dumps([
  {"op": "goto", "to": os.environ["DEST"]},
  {"op": "wait", "prefix": os.environ["WAIT_PREFIX"], "timeoutMs": int(os.environ["TIMEOUT_MS"]), "ms": 80},
], separators=(",", ":")))
PY
)"

if STATUS_JSON="$(agent_ui_send_op batch "${OPS_JSON}" 2>/dev/null)"; then
  echo "${STATUS_JSON}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("detail") or "ok"); print("ready route=%s prefix=%s" % (d.get("route") or "?", "'"${WAIT_PREFIX}"'"))'
  exit 0
fi

echo "batch open failed; healing + openurl ${URL}" >&2
agent_ui_heal_packager || true
xcrun simctl openurl booted "$URL"
deadline=$((SECONDS + WAIT_SECS))
while (( SECONDS < deadline )); do
  if STATUS_JSON="$(agent_ui_send_op prefix "${WAIT_PREFIX}" 2>/dev/null)"; then
    ok="$(echo "${STATUS_JSON}" | python3 -c 'import json,sys; print("1" if json.load(sys.stdin).get("ok") else "0")')"
    if [[ "${ok}" == "1" ]]; then
      echo "ready (openurl fallback) prefix=${WAIT_PREFIX}"
      exit 0
    fi
  fi
  sleep 0.08
done

echo "error: timed out waiting for prefix ${WAIT_PREFIX} after opening ${DEST}" >&2
exit 1
