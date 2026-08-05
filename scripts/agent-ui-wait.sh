#!/usr/bin/env bash
# Wait until a testID, prefix, or route is ready — one in-app wait (no host poll loop).
#
# Usage:
#   ./scripts/agent-ui-wait.sh ontrack.checklists.detail.back
#   ./scripts/agent-ui-wait.sh --prefix ontrack.profile
#   ./scripts/agent-ui-wait.sh --route /calendar
#   WAIT_SECS=10 ./scripts/agent-ui-wait.sh --prefix ontrack.today.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

MODE="id"
TARGET=""

usage() {
  echo "usage: $0 [<testID>] | --prefix <p> | --route <path> | --id <id>" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix) MODE="prefix"; TARGET="${2:-}"; shift 2 ;;
    --route) MODE="route"; TARGET="${2:-}"; shift 2 ;;
    --id) MODE="id"; TARGET="${2:-}"; shift 2 ;;
    -h|--help) usage ;;
    *)
      if [[ -z "${TARGET}" ]]; then TARGET="$1"; MODE="id"; shift
      else usage; fi
      ;;
  esac
done

if [[ -z "${TARGET}" ]]; then
  usage
fi

agent_ui_apply_wait_budget simple
TIMEOUT_MS="${AGENT_UI_WAIT_TIMEOUT_MS}"
# Host must outlive the in-app wait window.
WAIT_SECS="$(python3 -c "print(max(float('${WAIT_SECS}'), ${TIMEOUT_MS}/1000.0 + 1.0))")"

case "${MODE}" in
  id)
    STATUS_JSON="$(agent_ui_send_op wait --id "${TARGET}" --timeout "${TIMEOUT_MS}")"
    ;;
  prefix)
    STATUS_JSON="$(agent_ui_send_op wait --prefix "${TARGET}" --timeout "${TIMEOUT_MS}")"
    ;;
  route)
    STATUS_JSON="$(agent_ui_send_op wait --route "${TARGET}" --timeout "${TIMEOUT_MS}")"
    ;;
esac

python3 - "${STATUS_JSON}" "${MODE}" "${TARGET}" <<'PY'
import json, sys
d = json.loads(sys.argv[1])
mode = sys.argv[2]
target = sys.argv[3]
ok = bool(d.get("ok"))
detail = d.get("detail") or ""
route = d.get("route") or "?"
if ok:
    print(f"ready: {detail} route={route}")
    raise SystemExit(0)
print(
    f"error: timed out waiting for {mode}={target}: {detail or d}",
    file=sys.stderr,
)
raise SystemExit(1)
PY
