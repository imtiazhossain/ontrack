#!/usr/bin/env bash
# Dump registered agent-ui testIDs from the booted iOS Simulator app.
#
# Usage:
#   ./scripts/agent-ui-dump.sh
#   ./scripts/agent-ui-dump.sh --prefix ontrack.today
#   PREFIX=ontrack.travel ./scripts/agent-ui-dump.sh
set -euo pipefail

BUNDLE_ID="${BUNDLE_ID:-com.imtihoss.ontracknow}"
DUMP_NAME="${DUMP_NAME:-agent-ui-dump.json}"
STATUS_NAME="${STATUS_NAME:-agent-ui-status.json}"
COMMAND_NAME="${COMMAND_NAME:-agent-ui-command.json}"
WAIT_SECS="${WAIT_SECS:-6}"
POLL_SLEEP="${POLL_SLEEP:-0.05}"
PREFIX="${PREFIX:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prefix)
      PREFIX="${2:-}"
      shift 2
      ;;
    -h|--help)
      echo "usage: $0 [--prefix ontrack.feature]"
      exit 0
      ;;
    *)
      echo "error: unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

DATA_DIR="$(xcrun simctl get_app_container booted "$BUNDLE_ID" data 2>/dev/null || true)"
if [[ -z "${DATA_DIR}" ]]; then
  echo "error: could not resolve app data container for ${BUNDLE_ID}" >&2
  exit 1
fi

DUMP_PATH="${DATA_DIR}/Documents/${DUMP_NAME}"
STATUS_PATH="${DATA_DIR}/Documents/${STATUS_NAME}"
COMMAND_PATH="${DATA_DIR}/Documents/${COMMAND_NAME}"

# Invalidate prior results so we don't return a stale dump.
rm -f "${DUMP_PATH}" "${STATUS_PATH}" "${COMMAND_PATH}"

STARTED_MTIME="$(python3 -c 'import time; print(time.time())')"
COMMAND_PATH="${COMMAND_PATH}" python3 - <<'PY'
import json, os, time
from pathlib import Path
Path(os.environ["COMMAND_PATH"]).write_text(json.dumps({"op": "dump", "nonce": time.time_ns()}))
PY

deadline=$((SECONDS + WAIT_SECS))
while (( SECONDS < deadline )); do
  if [[ -f "${STATUS_PATH}" && -f "${DUMP_PATH}" ]]; then
    RESULT="$(STARTED_MTIME="${STARTED_MTIME}" STATUS_PATH="${STATUS_PATH}" python3 - <<'PY'
import json, os
from pathlib import Path
status_path = Path(os.environ["STATUS_PATH"])
started = float(os.environ["STARTED_MTIME"])
try:
    data = json.loads(status_path.read_text())
except Exception:
    print("wait")
    raise SystemExit
# File mtime must be at/after request (2s clock skew).
if status_path.stat().st_mtime < started - 2:
    print("wait")
    raise SystemExit
if data.get("op") == "dump" and data.get("ok") is True:
    print("ok")
else:
    print("wait")
PY
)"
    if [[ "${RESULT}" == "ok" ]]; then
      if [[ -n "${PREFIX}" ]]; then
        DUMP_PATH="${DUMP_PATH}" PREFIX="${PREFIX}" python3 - <<'PY'
import json, os
from pathlib import Path
dump_path = Path(os.environ["DUMP_PATH"])
prefix = os.environ["PREFIX"]
data = json.loads(dump_path.read_text())
elements = [e for e in data.get("elements", []) if str(e.get("testID","")).startswith(prefix)]
out = {
    "generatedAt": data.get("generatedAt"),
    "route": data.get("route"),
    "count": len(elements),
    "prefix": prefix,
    "elements": elements,
}
print(json.dumps(out, indent=2))
PY
      else
        cat "${DUMP_PATH}"
      fi
      exit 0
    fi
  fi
  sleep "${POLL_SLEEP}"
done

echo "error: timed out waiting for ${DUMP_PATH}" >&2
if [[ -f "${STATUS_PATH}" ]]; then
  echo "last status:" >&2
  cat "${STATUS_PATH}" >&2 || true
fi
exit 1
