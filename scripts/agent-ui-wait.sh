#!/usr/bin/env bash
# Wait until a testID (or prefix) is registered in the agent-ui dump.
#
# Usage:
#   ./scripts/agent-ui-wait.sh ontrack.checklists.detail.back
#   ./scripts/agent-ui-wait.sh --prefix ontrack.profile
#   ./scripts/agent-ui-wait.sh --route /calendar
#   WAIT_SECS=10 ./scripts/agent-ui-wait.sh --prefix ontrack.today.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WAIT_SECS="${WAIT_SECS:-8}"
MODE=""
TARGET=""

usage() {
  echo "usage: $0 <testID> | --prefix <prefix> | --route <pathname>" >&2
  exit 2
}

if [[ $# -lt 1 ]]; then
  usage
fi

case "$1" in
  --prefix)
    MODE="prefix"
    TARGET="${2:-}"
    shift 2 || true
    ;;
  --route)
    MODE="route"
    TARGET="${2:-}"
    shift 2 || true
    ;;
  -h|--help)
    usage
    ;;
  *)
    MODE="id"
    TARGET="$1"
    shift
    ;;
esac

if [[ -z "$TARGET" ]]; then
  usage
fi

deadline=$((SECONDS + WAIT_SECS))
TMP_DUMP="$(mktemp)"
trap 'rm -f "${TMP_DUMP}"' EXIT
while (( SECONDS < deadline )); do
  if ./scripts/agent-ui-dump.sh >"${TMP_DUMP}" 2>/dev/null; then
    RESULT="$(TMP_DUMP="${TMP_DUMP}" MODE="${MODE}" TARGET="${TARGET}" python3 - <<'PY'
import json, os
from pathlib import Path
d = json.loads(Path(os.environ["TMP_DUMP"]).read_text())
mode = os.environ["MODE"]
target = os.environ["TARGET"]
route = d.get("route") or ""
ids = [e.get("testID","") for e in d.get("elements", [])]
ok = False
if mode == "id":
    ok = target in ids
elif mode == "prefix":
    ok = any(i.startswith(target) for i in ids)
elif mode == "route":
    # Exact or suffix match (Expo may omit group segments).
    ok = route == target or route.endswith(target) or target.rstrip("/") in route
print("ok" if ok else "wait")
print(route)
print(len(ids))
PY
)"
    status="$(printf '%s\n' "$RESULT" | sed -n '1p')"
    route="$(printf '%s\n' "$RESULT" | sed -n '2p')"
    count="$(printf '%s\n' "$RESULT" | sed -n '3p')"
    if [[ "$status" == "ok" ]]; then
      echo "ready mode=${MODE} target=${TARGET} route=${route:-?} elements=${count}"
      exit 0
    fi
  fi
  sleep 0.1
done

echo "error: timed out waiting for ${MODE}=${TARGET}" >&2
exit 1
