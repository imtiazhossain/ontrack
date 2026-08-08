#!/usr/bin/env bash
# Fast surface verification: skip --flow/--open when already on --route;
# otherwise auto-goto --route when land was omitted (both platforms).
#
# Usage:
#   ./scripts/agent-ui-verify.sh \
#     --route /travel/trip-agent-ui-demo \
#     --flow travel-demo \
#     --exists travel.planDetail.transportSection \
#     --color travel.planDetail.transportSection '#2474A8' \
#     --screenshot .tmp/proof.png
#
# Bare --route /privacy (no --open) lands via goto when not already there.
# JS key paths (travel.planDetail.transportSection) resolve via ids.ts.
# --color samples accent pixels in the element frame (Pillow).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  cat >&2 <<'EOF'
usage: agent-ui-verify.sh --route <path> [--flow <name>|--open <alias>] \
  [--exists <id>|--missing <id>|--prefix <p>|--contains <id> <text>| \
   --color <id> <hex> [--tolerance N]|--screenshot [path]]...
EOF
  exit 2
}

# Help before host source (source auto-leases a pool slot).
for arg in "$@"; do
  case "${arg}" in
    -h|--help) usage ;;
  esac
done

if [[ $# -lt 1 ]]; then
  usage
fi

# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

agent_ui_ensure_app_up
agent_ui_apply_wait_budget flow
# Bridge exits 1 on failed asserts — still capture JSON for the formatter.
STATUS_JSON="$(
  AGENT_UI_ROOT="${ROOT}" \
  WAIT_SECS="${WAIT_SECS}" \
  AGENT_UI_WAIT_TIMEOUT_MS="${AGENT_UI_WAIT_TIMEOUT_MS}" \
    python3 "${ROOT}/scripts/lib/agent_ui_bridge.py" verify -- "$@" || true
)"
if [[ -z "${STATUS_JSON}" ]]; then
  echo "error: verify produced no status JSON" >&2
  exit 1
fi

VERIFY_EXIT=0
python3 - "${STATUS_JSON}" <<'PY'
import json, sys

d = json.loads(sys.argv[1])
ok = bool(d.get("ok"))
route = d.get("route") or "?"
skipped = d.get("skippedLand")
results = d.get("results") or []
lines = []
if skipped:
    lines.append("  [ok] land: skipped (already on route)")
for r in results:
    nested = r.get("results") if isinstance(r, dict) else None
    if nested:
        for n in nested:
            mark = "ok" if n.get("ok") else "FAIL"
            lines.append(
                f"  [{mark}] {n.get('op')}: {n.get('detail') or n.get('id') or ''}"
            )
    else:
        mark = "ok" if r.get("ok") else "FAIL"
        detail = r.get("detail") or r.get("id") or r.get("path") or ""
        lines.append(f"  [{mark}] {r.get('op')}: {detail}")
header = f"verify {'passed' if ok else 'failed'} route={route}"
print(header + ("\n" + "\n".join(lines) if lines else ""))
raise SystemExit(0 if ok else 1)
PY
VERIFY_EXIT=$?

# Headed Simulator/Galaxy open → sync that viewer to the verified surface.
if [[ "${VERIFY_EXIT}" -eq 0 ]]; then
  agent_ui_headed_viewer_handoff "$@" || true
fi
exit "${VERIFY_EXIT}"
