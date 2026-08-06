#!/usr/bin/env bash
# Resolve a testID / AgentUiIds key path / visible label → source files.
#
# Usage:
#   ./scripts/agent-ui-source.sh travel.planDetail.transportSection
#   ./scripts/agent-ui-source.sh ontrack.travel.planDetail.section.transport
#   ./scripts/agent-ui-source.sh --label "Transport"
#   ./scripts/agent-ui-source.sh --json travel.list.currency.trip-agent-ui-demo
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

JSON=0
LABEL=""
RAW=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON=1
      shift
      ;;
    --label)
      LABEL="${2:-}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,12p' "$0" | tr -d '#'
      exit 0
      ;;
    *)
      RAW="${1:-}"
      shift
      ;;
  esac
done

# Ensure index exists (cheap no-op when present; regenerates when missing).
if [[ ! -f "${ROOT}/docs/agent-ui-sources.json" ]]; then
  python3 "${ROOT}/scripts/lib/agent_ui_sources.py" >/dev/null
fi

if [[ -n "${LABEL}" ]]; then
  if [[ "${JSON}" -eq 1 ]]; then
    exec python3 "${ROOT}/scripts/lib/agent_ui_sources.py" --label "${LABEL}" --json
  fi
  exec python3 "${ROOT}/scripts/lib/agent_ui_sources.py" --label "${LABEL}"
fi

if [[ -z "${RAW}" ]]; then
  echo "usage: $0 [--json] <testID|keyPath> | --label TEXT" >&2
  exit 2
fi

if [[ "${JSON}" -eq 1 ]]; then
  exec python3 "${ROOT}/scripts/lib/agent_ui_sources.py" --lookup "${RAW}" --json
fi
exec python3 "${ROOT}/scripts/lib/agent_ui_sources.py" --lookup "${RAW}"
