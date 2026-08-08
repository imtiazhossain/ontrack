#!/usr/bin/env bash
# Cheap current-route probe (status only — no dump file).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

STATUS_JSON="$(agent_ui_send_op route)"
# Route op uses allow_fail — timed-out probes return ok=false with no route.
# Exit non-zero so callers (bridge_answers / verify-both) do not treat a dead
# emulator or silent app as "up" (that yields verify failed route=?).
echo "${STATUS_JSON}" | python3 -c '
import json, sys
d = json.load(sys.stdin)
route = d.get("route") if isinstance(d.get("route"), str) else ""
print(route)
sys.exit(0 if d.get("ok") and route else 1)
'
