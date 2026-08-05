#!/usr/bin/env bash
# Run multiple agent-ui ops in one in-app batch (waits settle in-app).
#
# Flag form:
#   ./scripts/agent-ui-batch.sh --goto travel --wait-prefix ontrack.travel. --tap ontrack.travel.newTrip.open
#   ./scripts/agent-ui-batch.sh --seed travel-demo --goto travel/trip-agent-ui-demo --wait-prefix ontrack.travel.planDetail.
#   ./scripts/agent-ui-batch.sh --flow travel-demo-add-flight
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

OPS_JSON=""
IN_APP_OPS=()

usage() {
  echo "usage: $0 '<json ops array>' | [--goto <to>|--reset|--seed <fixture>|--flow <name>|--tap <id>|--exists <id>|--wait-prefix <p>|--wait-id <id>|--wait-route <path>|--wait-ms N|--route|--dump]..." >&2
  exit 2
}

append_in_app() {
  IN_APP_OPS+=("$1")
}

if [[ $# -eq 0 ]]; then
  if [[ -t 0 ]]; then
    usage
  fi
  OPS_JSON="$(cat)"
elif [[ $# -eq 1 && "$1" != --* ]]; then
  OPS_JSON="$1"
else
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --goto)
        append_in_app "$(python3 -c 'import json,sys; print(json.dumps({"op":"goto","to":sys.argv[1]}))' "${2:-}")"
        shift 2
        ;;
      --reset)
        append_in_app '{"op":"reset"}'
        shift
        ;;
      --seed)
        append_in_app "$(python3 -c 'import json,sys; print(json.dumps({"op":"seed","to":sys.argv[1]}))' "${2:-travel-demo}")"
        shift 2
        ;;
      --flow)
        # Nested flow expands in-app; wrap as single step.
        append_in_app "$(python3 -c 'import json,sys; print(json.dumps({"op":"flow","to":sys.argv[1]}))' "${2:-}")"
        shift 2
        ;;
      --tap)
        append_in_app "$(python3 -c 'import json,sys; print(json.dumps({"op":"tap","id":sys.argv[1]}))' "${2:-}")"
        shift 2
        ;;
      --exists)
        append_in_app "$(python3 -c 'import json,sys; print(json.dumps({"op":"exists","id":sys.argv[1]}))' "${2:-}")"
        shift 2
        ;;
      --wait-prefix|--prefix)
        append_in_app "$(python3 -c 'import json,sys; print(json.dumps({"op":"wait","prefix":sys.argv[1],"timeoutMs":4000,"ms":80}))' "${2:-}")"
        shift 2
        ;;
      --wait-id)
        append_in_app "$(python3 -c 'import json,sys; print(json.dumps({"op":"wait","id":sys.argv[1],"timeoutMs":4000,"ms":80}))' "${2:-}")"
        shift 2
        ;;
      --wait-route)
        append_in_app "$(python3 -c 'import json,sys; print(json.dumps({"op":"wait","to":sys.argv[1],"timeoutMs":4000,"ms":80}))' "${2:-}")"
        shift 2
        ;;
      --wait-ms)
        append_in_app "$(python3 -c 'import json,sys; print(json.dumps({"op":"wait","ms":int(sys.argv[1])}))' "${2:-80}")"
        shift 2
        ;;
      --route)
        append_in_app '{"op":"route"}'
        shift
        ;;
      --dump)
        append_in_app '{"op":"dump"}'
        shift
        ;;
      -h|--help)
        usage
        ;;
      *)
        echo "error: unknown arg: $1" >&2
        usage
        ;;
    esac
  done
  if ((${#IN_APP_OPS[@]})); then
    OPS_JSON="$(printf '%s\n' "${IN_APP_OPS[@]}" | python3 -c 'import json,sys; print(json.dumps([json.loads(l) for l in sys.stdin if l.strip()]))')"
  else
    OPS_JSON='[]'
  fi
fi

if [[ -z "${OPS_JSON}" ]]; then
  usage
fi

python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert isinstance(d, list) and d, "ops must be a non-empty JSON array"' "${OPS_JSON}"

# Flows/batches with in-app waits need a longer host timeout.
WAIT_SECS="${WAIT_SECS:-12}"
STATUS_JSON="$(agent_ui_send_op batch "${OPS_JSON}")"
echo "${STATUS_JSON}" | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2))'
