#!/usr/bin/env bash
# In-app goto via file command (faster than openurl when the app is mounted).
# Falls back to simctl openurl if the navigator is not ready.
#
# Usage:
#   ./scripts/agent-ui-goto.sh calendar
#   ./scripts/agent-ui-goto.sh travel/<planId>/add/flight
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <alias|path>" >&2
  exit 2
fi

DEST="$1"

if STATUS_JSON="$(agent_ui_send_op goto "${DEST}" 2>/dev/null)"; then
  echo "${STATUS_JSON}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("detail") or "ok")'
  exit 0
fi

# Fallback: deep link (can launch / wake the app).
resolve_deep_link() {
  local raw="$1"
  case "$raw" in
    today|home|reset) echo "ontrack:///" ;;
    /*) echo "ontrack:///${raw#/}" ;;
    *) echo "ontrack:///${raw#/}" ;;
  esac
}

URL="$(resolve_deep_link "$DEST")"
echo "goto file-command failed; opening ${URL}"
xcrun simctl openurl booted "$URL"

# Poll route instead of a fixed sleep.
deadline=$((SECONDS + 2))
while (( SECONDS < deadline )); do
  if STATUS_JSON="$(WAIT_SECS=1 agent_ui_send_op route 2>/dev/null)"; then
    if echo "${STATUS_JSON}" | python3 -c 'import json,sys; raise SystemExit(0 if json.load(sys.stdin).get("route") else 1)'; then
      echo "${STATUS_JSON}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("detail") or d.get("route") or "ok")'
      exit 0
    fi
  fi
  sleep "${POLL_SLEEP}"
done
echo "opened ${URL}"
