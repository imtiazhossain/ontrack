#!/usr/bin/env bash
# Dump registered agent-ui testIDs from the booted iOS Simulator app.
set -euo pipefail

BUNDLE_ID="${BUNDLE_ID:-com.imtihoss.ontracknow}"
DUMP_NAME="${DUMP_NAME:-agent-ui-dump.json}"
STATUS_NAME="${STATUS_NAME:-agent-ui-status.json}"
WAIT_SECS="${WAIT_SECS:-8}"

DATA_DIR="$(xcrun simctl get_app_container booted "$BUNDLE_ID" data 2>/dev/null || true)"
if [[ -z "${DATA_DIR}" ]]; then
  echo "error: could not resolve app data container for ${BUNDLE_ID}" >&2
  exit 1
fi

DUMP_PATH="${DATA_DIR}/Documents/${DUMP_NAME}"
STATUS_PATH="${DATA_DIR}/Documents/${STATUS_NAME}"

# Invalidate prior results so we don't return a stale dump.
rm -f "${DUMP_PATH}" "${STATUS_PATH}"

STARTED_AT="$(python3 -c 'import time; print(time.time())')"
xcrun simctl openurl booted "ontrack:///agent/ui?op=dump"

deadline=$((SECONDS + WAIT_SECS))
while (( SECONDS < deadline )); do
  if [[ -f "${STATUS_PATH}" && -f "${DUMP_PATH}" ]]; then
    RESULT="$(STARTED_AT="${STARTED_AT}" STATUS_PATH="${STATUS_PATH}" python3 - <<'PY'
import json, os, time
from pathlib import Path
status_path = Path(os.environ["STATUS_PATH"])
started = float(os.environ["STARTED_AT"])
try:
    data = json.loads(status_path.read_text())
except Exception:
    print("wait")
    raise SystemExit
gen = data.get("generatedAt")
# Accept ISO timestamps that are after we issued the request (2s skew).
ok_time = True
if isinstance(gen, str) and gen.endswith("Z"):
    # rough parse: compare file mtime which is always fresh on write
    ok_time = status_path.stat().st_mtime >= started - 2
if data.get("op") == "dump" and data.get("ok") is True and ok_time:
    print("ok")
else:
    print("wait")
PY
)"
    if [[ "${RESULT}" == "ok" ]]; then
      cat "${DUMP_PATH}"
      exit 0
    fi
  fi
  sleep 0.25
done

echo "error: timed out waiting for ${DUMP_PATH}" >&2
if [[ -f "${STATUS_PATH}" ]]; then
  echo "last status:" >&2
  cat "${STATUS_PATH}" >&2 || true
fi
exit 1
