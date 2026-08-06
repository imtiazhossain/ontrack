#!/usr/bin/env bash
# Scroll a registered agent-ui testID into view inside the app ScrollView.
# In-app only — never uses host mouse / Simulator window coordinates.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <testID>" >&2
  exit 1
fi

TEST_ID="$1"
STATUS_JSON="$(agent_ui_send_op scroll "${TEST_ID}")"
echo "scrolled ${TEST_ID}"
echo "${STATUS_JSON}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(f"ok={d.get(\"ok\")} route={d.get(\"route\")} detail={d.get(\"detail\")}")' 2>/dev/null || true
