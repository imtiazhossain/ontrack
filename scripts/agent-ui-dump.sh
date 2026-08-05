#!/usr/bin/env bash
# Dump registered agent-ui testIDs from the booted iOS Simulator app.
#
# Usage:
#   ./scripts/agent-ui-dump.sh
#   ./scripts/agent-ui-dump.sh --prefix ontrack.today
#   PREFIX=ontrack.travel ./scripts/agent-ui-dump.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

PREFIX="${PREFIX:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix)
      PREFIX="${2:-}"
      shift 2
      ;;
    -h|--help)
      echo "usage: $0 [--prefix ontrack.feature]"
      exit 0
      ;;
    *)
      echo "error: unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

STATUS_JSON="$(agent_ui_send_op dump)"
agent_ui_paths

if [[ -n "${PREFIX}" ]]; then
  DUMP_PATH="${AGENT_UI_DUMP_PATH}" PREFIX="${PREFIX}" python3 - <<'PY'
import json, os
from pathlib import Path
dump_path = Path(os.environ["DUMP_PATH"])
prefix = os.environ["PREFIX"]
data = json.loads(dump_path.read_text())
elements = [e for e in data.get("elements", []) if str(e.get("testID","")).startswith(prefix)]
out = {
    "generatedAt": data.get("generatedAt"),
    "route": data.get("route"),
    "count": len(elements),
    "prefix": prefix,
    "elements": elements,
}
print(json.dumps(out, indent=2))
PY
else
  # Pretty-print for humans; bridge stores compact JSON.
  python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1])), indent=2))' "${AGENT_UI_DUMP_PATH}"
fi

# Touch STATUS_JSON so shellcheck/unused-assignment stays quiet when dump succeeds.
: "${STATUS_JSON}"
