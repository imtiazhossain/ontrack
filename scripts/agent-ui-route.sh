#!/usr/bin/env bash
# Cheap current-route probe (status only — no dump file).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

STATUS_JSON="$(agent_ui_send_op route)"
echo "${STATUS_JSON}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("route") or "")'
