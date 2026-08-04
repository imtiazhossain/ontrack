#!/usr/bin/env bash
# Tap a registered agent-ui testID in the booted iOS Simulator app (no coordinates).
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <testID>" >&2
  exit 1
fi

TEST_ID="$1"
BUNDLE_ID="${BUNDLE_ID:-com.imtihoss.ontracknow}"
STATUS_NAME="${STATUS_NAME:-agent-ui-status.json}"
COMMAND_NAME="${COMMAND_NAME:-agent-ui-command.json}"
WAIT_SECS="${WAIT_SECS:-6}"
POLL_SLEEP="${POLL_SLEEP:-0.05}"

DATA_DIR="$(xcrun simctl get_app_container booted "$BUNDLE_ID" data 2>/dev/null || true)"
if [[ -z "${DATA_DIR}" ]]; then
  echo "error: could not resolve app data container for ${BUNDLE_ID}" >&2
  exit 1
fi

STATUS_PATH="${DATA_DIR}/Documents/${STATUS_NAME}"
COMMAND_PATH="${DATA_DIR}/Documents/${COMMAND_NAME}"
rm -f "${STATUS_PATH}" "${COMMAND_PATH}"

STARTED_MTIME="$(python3 -c 'import time; print(time.time())')"
COMMAND_PATH="${COMMAND_PATH}" TEST_ID="${TEST_ID}" python3 - <<'PY'
import json, os, time
from pathlib import Path
Path(os.environ["COMMAND_PATH"]).write_text(json.dumps({"op": "tap", "id": os.environ["TEST_ID"], "nonce": time.time_ns()}))
PY

deadline=$((SECONDS + WAIT_SECS))
while (( SECONDS < deadline )); do
  if [[ -f "${STATUS_PATH}" ]]; then
    RESULT="$(STARTED_MTIME="${STARTED_MTIME}" STATUS_PATH="${STATUS_PATH}" TEST_ID="${TEST_ID}" python3 - <<'PY'
import json, os
from pathlib import Path
status_path = Path(os.environ["STATUS_PATH"])
started = float(os.environ["STARTED_MTIME"])
test_id = os.environ["TEST_ID"]
try:
    data = json.loads(status_path.read_text())
except Exception:
    print("wait")
    raise SystemExit
if status_path.stat().st_mtime < started - 2:
    print("wait")
    raise SystemExit
if data.get("op") == "tap" and data.get("id") == test_id:
    print("ok" if data.get("ok") else "fail")
    print(data.get("detail", ""))
else:
    print("wait")
PY
)"
    status_line="$(printf '%s\n' "${RESULT}" | head -n1)"
    detail_line="$(printf '%s\n' "${RESULT}" | sed -n '2p')"
    if [[ "${status_line}" == "ok" ]]; then
      echo "tapped ${TEST_ID}"
      exit 0
    fi
    if [[ "${status_line}" == "fail" ]]; then
      echo "error: tap failed for ${TEST_ID}: ${detail_line}" >&2
      exit 1
    fi
  fi
  sleep "${POLL_SLEEP}"
done

echo "error: timed out waiting for tap status for ${TEST_ID}" >&2
if [[ -f "${STATUS_PATH}" ]]; then
  echo "last status:" >&2
  cat "${STATUS_PATH}" >&2 || true
fi
exit 1
