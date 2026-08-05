#!/usr/bin/env bash
# Tap a registered agent-ui testID in the booted iOS Simulator app (no coordinates).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <testID>" >&2
  exit 1
fi

TEST_ID="$1"
STATUS_JSON="$(agent_ui_send_op tap "${TEST_ID}")"
echo "tapped ${TEST_ID}"
# Optional machine-readable line for batching hosts.
echo "${STATUS_JSON}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(f"route={d.get(\"route\")}")' 2>/dev/null || true
