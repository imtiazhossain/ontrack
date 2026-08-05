#!/usr/bin/env bash
# Structural asserts (Playwright-style) — no screenshot required.
#
# Usage:
#   ./scripts/agent-ui-assert.sh --exists ontrack.travel.newTrip.open
#   ./scripts/agent-ui-assert.sh --exists travel.planDetail.transportSection
#   ./scripts/agent-ui-assert.sh --route /travel/trip-agent-ui-demo
#   ./scripts/agent-ui-assert.sh --prefix travel.planDetail.
#   ./scripts/agent-ui-assert.sh --contains travel.newTrip.open "New"
#   ./scripts/agent-ui-assert.sh --missing ontrack.travel.ghost
#   ./scripts/agent-ui-assert.sh --color travel.planDetail.transportSection '#2474A8'
#   ./scripts/agent-ui-assert.sh --exists id --route /travel --prefix ontrack.travel.
#
# JS key paths resolve via ids.ts. --color samples accent pixels (host-side).
# Exit 0 when all checks pass. Prefer this over screenshots for route/id claims.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

usage() {
  echo "usage: $0 [--exists <id>|--missing <id>|--route <path>|--prefix <p>|--contains <id> <text>|--color <id> <hex>]..." >&2
  exit 2
}

if [[ $# -lt 1 ]]; then
  usage
fi

agent_ui_ensure_app_up

# Normalize --route → --assert-route (bare --route is a probe in batch-args).
NORMALIZED=()
HOST_OPS=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --route)
      NORMALIZED+=(--assert-route "${2:-}")
      shift 2
      ;;
    --color|--assert-color|--screenshot)
      HOST_OPS=1
      NORMALIZED+=("$1")
      shift
      ;;
    *)
      NORMALIZED+=("$1")
      shift
      ;;
  esac
done

# Host-side color/screenshot needs the once path (not in-app batch alone).
if (( HOST_OPS )); then
  agent_ui_apply_wait_budget simple
  # Bridge exits 1 on failed asserts — still capture JSON for the formatter.
  STATUS_JSON="$(
    AGENT_UI_ROOT="${ROOT}" \
    WAIT_SECS="${WAIT_SECS}" \
    AGENT_UI_WAIT_TIMEOUT_MS="${AGENT_UI_WAIT_TIMEOUT_MS}" \
      python3 "${ROOT}/scripts/lib/agent_ui_bridge.py" once -- "${NORMALIZED[@]}" || true
  )"
else
  OPS_JSON="$(AGENT_UI_ROOT="${ROOT}" AGENT_UI_WAIT_TIMEOUT_MS="${AGENT_UI_WAIT_TIMEOUT_MS}" \
    python3 "${ROOT}/scripts/lib/agent_ui_bridge.py" batch-args -- "${NORMALIZED[@]}")"

  python3 -c 'import json,sys; d=json.loads(sys.argv[1]); assert isinstance(d, list) and d' "${OPS_JSON}"

  agent_ui_apply_wait_budget simple
  COUNT="$(python3 -c 'import json,sys; print(len(json.loads(sys.argv[1])))' "${OPS_JSON}")"
  if [[ "${COUNT}" == "1" ]]; then
    PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps(json.loads(sys.argv[1])[0], separators=(",",":")))' "${OPS_JSON}")"
    STATUS_JSON="$(agent_ui_send --allow-fail "${PAYLOAD}")"
  else
    STATUS_JSON="$(agent_ui_send --allow-fail "$(python3 -c 'import json,sys; print(json.dumps({"op":"batch","ops":json.loads(sys.argv[1])}, separators=(",",":")))' "${OPS_JSON}")")"
  fi
fi

python3 - "${STATUS_JSON}" <<'PY'
import json, sys

d = json.loads(sys.argv[1])
ok = bool(d.get("ok"))
detail = d.get("detail") or ""
route = d.get("route") or "?"
results = d.get("results") or []
lines = []
if results:
    for r in results:
        # Nested assert checks appear as results of a single assert op.
        nested = r.get("results") if isinstance(r, dict) else None
        if nested:
            for n in nested:
                mark = "ok" if n.get("ok") else "FAIL"
                lines.append(
                    f"  [{mark}] {n.get('op')}: {n.get('detail') or n.get('id') or ''}"
                )
        else:
            mark = "ok" if r.get("ok") else "FAIL"
            lines.append(
                f"  [{mark}] {r.get('op')}: {r.get('detail') or r.get('id') or ''}"
            )
if lines:
    print(f"assert {'passed' if ok else 'failed'} route={route}\n" + "\n".join(lines))
else:
    print(f"assert {'passed' if ok else 'failed'}: {detail} route={route}")
raise SystemExit(0 if ok else 1)
PY
