#!/usr/bin/env bash
# Seed a stable __DEV__ fixture (does not wipe other trips).
#
# Usage:
#   ./scripts/agent-ui-seed.sh
#   ./scripts/agent-ui-seed.sh travel-demo
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

FIXTURE="${1:-travel-demo}"
agent_ui_ensure_app_up
STATUS_JSON="$(agent_ui_send_op seed "${FIXTURE}")"
echo "${STATUS_JSON}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("detail") or json.dumps(d))'
