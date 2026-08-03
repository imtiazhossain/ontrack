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
WAIT_SECS="${WAIT_SECS:-8}"

DATA_DIR="$(xcrun simctl get_app_container booted "$BUNDLE_ID" data 2>/dev/null || true)"
if [[ -z "${DATA_DIR}" ]]; then
  echo "error: could not resolve app data container for ${BUNDLE_ID}" >&2
  exit 1
fi

STATUS_PATH="${DATA_DIR}/Documents/${STATUS_NAME}"
rm -f "${STATUS_PATH}"

# URL-encode the id (keeps dots/underscores; encodes spaces & reserved chars).
ENCODED_ID="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe='._-'))" "${TEST_ID}")"

xcrun simctl openurl booted "ontrack:///agent/ui?op=tap&id=${ENCODED_ID}"

deadline=$((SECONDS + WAIT_SECS))
while (( SECONDS < deadline )); do
  if [[ -f "${STATUS_PATH}" ]]; then
    RESULT="$(STATUS_PATH="${STATUS_PATH}" TEST_ID="${TEST_ID}" python3 - <<'PY'
import json, os
from pathlib import Path
data = json.loads(Path(os.environ["STATUS_PATH"]).read_text())
test_id = os.environ["TEST_ID"]
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
  sleep 0.25
done

echo "error: timed out waiting for tap status for ${TEST_ID}" >&2
if [[ -f "${STATUS_PATH}" ]]; then
  echo "last status:" >&2
  cat "${STATUS_PATH}" >&2 || true
fi
exit 1
