#!/usr/bin/env bash
# Toggle the Dev Mode sandbox (live snapshot + paused cloud push).
#
# Dev Mode stays off by default. Seeds/flows turn it on as source=agent;
# turn it back off when mock data is no longer needed:
#
#   ./scripts/agent-ui-devmode.sh on       # enter agent sandbox
#   ./scripts/agent-ui-devmode.sh off      # exit (restore live + purge demos)
#   ./scripts/agent-ui-devmode.sh release  # exit only if source=agent (keep user toggle)
#   ./scripts/agent-ui-devmode.sh status
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

MODE="${1:-status}"
case "${MODE}" in
  on|off|release|status|get|1|0|true|false|yes|no) ;;
  *)
    echo "usage: $0 on|off|release|status" >&2
    exit 2
    ;;
esac

agent_ui_ensure_app_up
STATUS_JSON="$(agent_ui_send_op devmode "${MODE}")"
echo "${STATUS_JSON}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("detail") or json.dumps(d))'
