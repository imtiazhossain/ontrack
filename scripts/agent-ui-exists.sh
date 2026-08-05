#!/usr/bin/env bash
# Cheap existence check (status only — no dump file).
# Exit 0 when the id is registered; 1 when missing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <testID>" >&2
  exit 2
fi

TEST_ID="$1"
STATUS_JSON="$(agent_ui_send_op exists "${TEST_ID}")"
OK="$(echo "${STATUS_JSON}" | python3 -c 'import json,sys; print("1" if json.load(sys.stdin).get("ok") else "0")')"
ROUTE="$(echo "${STATUS_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("route") or "")')"
if [[ "${OK}" == "1" ]]; then
  echo "exists ${TEST_ID} route=${ROUTE:-?}"
  exit 0
fi
echo "missing ${TEST_ID} route=${ROUTE:-?}" >&2
exit 1
