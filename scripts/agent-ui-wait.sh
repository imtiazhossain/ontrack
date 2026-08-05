#!/usr/bin/env bash
# Wait until a testID, prefix, or route is ready — cheap status probes (no dump).
#
# Usage:
#   ./scripts/agent-ui-wait.sh ontrack.checklists.detail.back
#   ./scripts/agent-ui-wait.sh --prefix ontrack.profile
#   ./scripts/agent-ui-wait.sh --route /calendar
#   WAIT_SECS=10 ./scripts/agent-ui-wait.sh --prefix ontrack.today.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

WAIT_SECS="${WAIT_SECS:-8}"
MODE=""
TARGET=""

usage() {
  echo "usage: $0 <testID> | --prefix <prefix> | --route <pathname>" >&2
  exit 2
}

if [[ $# -lt 1 ]]; then
  usage
fi

case "$1" in
  --prefix)
    MODE="prefix"
    TARGET="${2:-}"
    shift 2 || true
    ;;
  --route)
    MODE="route"
    TARGET="${2:-}"
    shift 2 || true
    ;;
  -h|--help)
    usage
    ;;
  *)
    MODE="id"
    TARGET="$1"
    shift
    ;;
esac

if [[ -z "$TARGET" ]]; then
  usage
fi

route_matches() {
  local current="$1"
  local target="$2"
  [[ -z "$current" ]] && return 1
  [[ "$current" == "$target" ]] && return 0
  [[ "$current" == *"$target"* ]] && return 0
  local stripped="${target%/}"
  [[ "$current" == *"$stripped"* ]] && return 0
  return 1
}

deadline=$((SECONDS + WAIT_SECS))
while (( SECONDS < deadline )); do
  case "$MODE" in
    id)
      if STATUS_JSON="$(agent_ui_send_op exists "${TARGET}" 2>/dev/null)"; then
        PARSE="$(STATUS_JSON="${STATUS_JSON}" python3 - <<'PY'
import json, os
d = json.loads(os.environ["STATUS_JSON"])
print("ok" if d.get("ok") else "wait")
print(d.get("route") or "")
PY
)"
        status="$(printf '%s\n' "$PARSE" | sed -n '1p')"
        route="$(printf '%s\n' "$PARSE" | sed -n '2p')"
        if [[ "$status" == "ok" ]]; then
          echo "ready mode=id target=${TARGET} route=${route:-?}"
          exit 0
        fi
      fi
      ;;
    prefix)
      if STATUS_JSON="$(agent_ui_send_op prefix "${TARGET}" 2>/dev/null)"; then
        PARSE="$(STATUS_JSON="${STATUS_JSON}" python3 - <<'PY'
import json, os
d = json.loads(os.environ["STATUS_JSON"])
print("ok" if d.get("ok") else "wait")
print(d.get("route") or "")
print(d.get("count") or 0)
PY
)"
        status="$(printf '%s\n' "$PARSE" | sed -n '1p')"
        route="$(printf '%s\n' "$PARSE" | sed -n '2p')"
        count="$(printf '%s\n' "$PARSE" | sed -n '3p')"
        if [[ "$status" == "ok" ]]; then
          echo "ready mode=prefix target=${TARGET} route=${route:-?} matches=${count}"
          exit 0
        fi
      fi
      ;;
    route)
      if STATUS_JSON="$(agent_ui_send_op route 2>/dev/null)"; then
        current="$(echo "${STATUS_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("route") or "")')"
        if route_matches "$current" "$TARGET"; then
          echo "ready mode=route target=${TARGET} route=${current}"
          exit 0
        fi
      fi
      ;;
  esac
  sleep 0.08
done

echo "error: timed out waiting for ${MODE}=${TARGET}" >&2
exit 1
