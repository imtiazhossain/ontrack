#!/usr/bin/env bash
# Run multiple agent-ui ops in one in-app batch (waits settle in-app).
#
# Flag form:
#   ./scripts/agent-ui-batch.sh --goto travel --wait-prefix ontrack.travel. --tap ontrack.travel.newTrip.open
#   ./scripts/agent-ui-batch.sh --seed travel-demo --goto travel/trip-agent-ui-demo --wait-prefix ontrack.travel.planDetail.
#   ./scripts/agent-ui-batch.sh --flow travel-demo-add-flight
#   ./scripts/agent-ui-batch.sh --flow travel-demo --assert-exists ontrack.travel.planDetail.weather
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

OPS_JSON=""

usage() {
  echo "usage: $0 '<json ops array>' | [--goto <to>|--reset|--seed <fixture>|--flow <name>|--tap <id>|--exists <id>|--assert-exists <id>|--assert-missing <id>|--assert-route <path>|--assert-prefix <p>|--assert-contains <id> <text>|--wait-prefix <p>|--wait-id <id>|--wait-route <path>|--wait-ms N|--route|--dump]..." >&2
  exit 2
}

if [[ $# -eq 0 ]]; then
  if [[ -t 0 ]]; then
    usage
  fi
  OPS_JSON="$(cat)"
elif [[ $# -eq 1 && "$1" != --* ]]; then
  OPS_JSON="$1"
else
  OPS_JSON="$(AGENT_UI_ROOT="${ROOT}" AGENT_UI_WAIT_TIMEOUT_MS="${AGENT_UI_WAIT_TIMEOUT_MS}" \
    python3 "${ROOT}/scripts/lib/agent_ui_bridge.py" batch-args -- "$@")"
fi

if [[ -z "${OPS_JSON}" ]]; then
  usage
fi

python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert isinstance(d, list) and d, "ops must be a non-empty JSON array"' "${OPS_JSON}"

agent_ui_ensure_app_up
agent_ui_apply_wait_budget flow
STATUS_JSON="$(agent_ui_send_op batch "${OPS_JSON}")"
echo "${STATUS_JSON}" | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2))'
