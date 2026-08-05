#!/usr/bin/env bash
# Toggle the __DEV__ agent-ui overlay (route + framed testIDs on screen).
#
# Usage:
#   ./scripts/agent-ui-overlay.sh on
#   ./scripts/agent-ui-overlay.sh off
#   ./scripts/agent-ui-overlay.sh toggle
#   ./scripts/agent-ui-overlay.sh status
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-toggle}"
exec "${ROOT}/scripts/agent-ui-hit.sh" --overlay "${MODE}"
