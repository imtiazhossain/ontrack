#!/usr/bin/env bash
# Generate or query the testID → source file index.
#
# Usage:
#   ./scripts/agent-ui-sources.sh                 # regenerate docs/agent-ui-sources.json
#   ./scripts/agent-ui-sources.sh --check         # fail if stale
#   ./scripts/agent-ui-sources.sh --lookup travel.planDetail.transportSection
#   ./scripts/agent-ui-sources.sh --label Transport
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec python3 "${ROOT}/scripts/lib/agent_ui_sources.py" "$@"
