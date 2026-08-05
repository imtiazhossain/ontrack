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
# Optional explicit wait — leave WAIT_SECS unset so budget applies.
EXPLICIT_WAIT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --wait-prefix)
      WAIT_PREFIX="${2:-}"
      shift 2
      ;;
    --wait-secs)
      EXPLICIT_WAIT="${2:-6}"
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
    checklists/*|todos/*|to-do/*) echo "ontrack.checklists." ;;
    profile) echo "ontrack.profile." ;;
    travel) echo "ontrack.travel." ;;
    travel/*) echo "ontrack.travel." ;;
    health|health/*) echo "ontrack.health." ;;
    activity|activityForm|activity-form) echo "ontrack.activityForm." ;;
    vehicles|vehicles/*) echo "ontrack.vehicles." ;;
    social|social/*) echo "ontrack.social." ;;
    games|games/*) echo "ontrack.games." ;;
    # workouts / plants / vision-board: sparse feature ids — open uses route wait via flows
    *) echo "" ;;
  esac
}

URL="$(resolve_deep_link "$DEST")"
if [[ -z "$WAIT_PREFIX" ]]; then
  WAIT_PREFIX="$(default_wait_prefix "$DEST")"
fi

echo "Opening ${DEST}"

if [[ -n "${EXPLICIT_WAIT}" ]]; then
  WAIT_SECS="${EXPLICIT_WAIT}"
else
  agent_ui_apply_wait_budget simple
fi

if (( NO_WAIT )); then
  if STATUS_JSON="$(WAIT_SECS="${WAIT_SECS}" agent_ui_send_op goto "${DEST}" 2>/dev/null)"; then
    echo "${STATUS_JSON}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("detail") or "goto ok")' 2>/dev/null || echo "goto ok"
    exit 0
  fi
  echo "file goto unavailable; openurl ${URL}"
  xcrun simctl openurl booted "$URL"
  exit 0
fi

TIMEOUT_MS="${AGENT_UI_WAIT_TIMEOUT_MS}"
# Prefer feature-prefix settle; fall back to route wait for sparse surfaces.
OPS_JSON="$(DEST="${DEST}" WAIT_PREFIX="${WAIT_PREFIX}" TIMEOUT_MS="${TIMEOUT_MS}" python3 - <<'PY'
import json, os
dest = os.environ["DEST"]
prefix = os.environ["WAIT_PREFIX"]
timeout = int(os.environ["TIMEOUT_MS"])
ops = [{"op": "goto", "to": dest}]
if prefix:
    ops.append({"op": "wait", "prefix": prefix, "timeoutMs": timeout})
else:
    ops.append({"op": "wait", "to": dest, "timeoutMs": timeout})
print(json.dumps(ops, separators=(",", ":")))
PY
)"

if STATUS_JSON="$(agent_ui_send_op batch "${OPS_JSON}" 2>/dev/null)"; then
  if [[ -n "${WAIT_PREFIX}" ]]; then
    SETTLE="prefix=${WAIT_PREFIX}"
  else
    SETTLE="route=${DEST}"
  fi
  echo "${STATUS_JSON}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("detail") or "ok"); print("ready route=%s %s" % (d.get("route") or "?", "'"${SETTLE}"'"))'
  exit 0
fi

# Heal only after a real bridge/batch failure — never on the happy path.
echo "batch open failed; healing + openurl ${URL}" >&2
agent_ui_heal_packager || true
xcrun simctl openurl booted "$URL"
deadline=$((SECONDS + ${WAIT_SECS%.*}))
while (( SECONDS < deadline )); do
  if [[ -n "${WAIT_PREFIX}" ]]; then
    if STATUS_JSON="$(agent_ui_send_op prefix "${WAIT_PREFIX}" 2>/dev/null)"; then
      ok="$(echo "${STATUS_JSON}" | python3 -c 'import json,sys; print("1" if json.load(sys.stdin).get("ok") else "0")')"
      if [[ "${ok}" == "1" ]]; then
        echo "ready (openurl fallback) prefix=${WAIT_PREFIX}"
        exit 0
      fi
    fi
  else
    if STATUS_JSON="$(WAIT_SECS=1 agent_ui_send_op wait --route "${DEST}" --timeout 500 2>/dev/null)"; then
      ok="$(echo "${STATUS_JSON}" | python3 -c 'import json,sys; print("1" if json.load(sys.stdin).get("ok") else "0")')"
      if [[ "${ok}" == "1" ]]; then
        echo "ready (openurl fallback) route=${DEST}"
        exit 0
      fi
    fi
  fi
  sleep "${POLL_SLEEP}"
done

echo "error: timed out waiting after opening ${DEST}" >&2
exit 1
