#!/usr/bin/env bash
# Detect / dismiss blocking iOS Simulator system sheets (Apple Account, etc.).
#
#   ./scripts/agent-ui-ios-alerts.sh ensure   # default — clear if present
#   ./scripts/agent-ui-ios-alerts.sh dismiss  # force attempt
#   ./scripts/agent-ui-ios-alerts.sh probe    # print OCR JSON; exit 1 if blocking
#
# Env: AGENT_UI_SKIP_IOS_ALERTS=1 to bypass.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export AGENT_UI_ROOT="$ROOT"
export AGENT_UI_PLATFORM="${AGENT_UI_PLATFORM:-ios}"
exec python3 "$ROOT/scripts/lib/ios_system_alert.py" "${1:-ensure}" "${@:2}"
