#!/usr/bin/env bash
# Run a named agent-ui flow (one in-app round trip).
#
# Usage:
#   ./scripts/agent-ui-flow.sh travel-demo
#   ./scripts/agent-ui-flow.sh travel-demo-add-flight
#   ./scripts/agent-ui-flow.sh open-new-trip
#   ./scripts/agent-ui-flow.sh --list
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

KNOWN_FLOWS=(
  travel-list
  travel-demo
  travel-demo-list
  travel-demo-hub
  travel-demo-add-flight
  travel-demo-add-flight-connecting
  travel-demo-add-flight-roundtrip
  travel-demo-edit-flight
  open-new-trip
  open-new-checklist
  open-home-location
  calendar
  today
  checklists
  health
  health-mood
  health-settings
  activity-form
  profile
  vehicles
  vehicles-new
  social
  workouts
  plants
  plants-new
  vision-board
  vision-board-categories
  games
)

if [[ $# -lt 1 || "$1" == "-h" || "$1" == "--help" ]]; then
  echo "usage: $0 <flow> | --list" >&2
  echo "flows: ${KNOWN_FLOWS[*]}" >&2
  exit 2
fi

if [[ "$1" == "--list" ]]; then
  printf '%s\n' "${KNOWN_FLOWS[@]}"
  exit 0
fi

FLOW="$1"
agent_ui_ensure_app_up
agent_ui_apply_wait_budget flow
STATUS_JSON="$(agent_ui_send_op flow "${FLOW}")"
echo "${STATUS_JSON}" | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2))'
