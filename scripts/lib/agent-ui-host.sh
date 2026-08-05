#!/usr/bin/env bash
# Shared host helpers for agent-ui file-command bridge (sourced by agent-ui-*.sh).
# Prefer file commands over simctl openurl when the app is already mounted.

: "${BUNDLE_ID:=com.imtihoss.ontracknow}"
: "${DUMP_NAME:=agent-ui-dump.json}"
: "${STATUS_NAME:=agent-ui-status.json}"
: "${COMMAND_NAME:=agent-ui-command.json}"
: "${WAIT_SECS:=6}"
: "${POLL_SLEEP:=0.04}"
: "${METRO_PORT:=8081}"

agent_ui_repo_root() {
  if [[ -n "${AGENT_UI_ROOT:-}" ]]; then
    printf '%s\n' "${AGENT_UI_ROOT}"
    return 0
  fi
  if [[ -n "${ROOT:-}" && -f "${ROOT}/scripts/ensure-packager.sh" ]]; then
    printf '%s\n' "${ROOT}"
    return 0
  fi
  # scripts/lib → repo root (subshell so sourcing never chdirs the caller)
  printf '%s\n' "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
}

# Start/reconnect Metro when the JS bridge is dead. Safe to call from open/batch.
# Skips when AGENT_UI_SKIP_HEAL=1 (ensure-packager probes must not recurse).
agent_ui_heal_packager() {
  if [[ "${AGENT_UI_SKIP_HEAL:-0}" == "1" ]]; then
    return 1
  fi
  local root
  root="$(agent_ui_repo_root)" || return 1
  local ensure="${root}/scripts/ensure-packager.sh"
  if [[ ! -x "$ensure" && ! -f "$ensure" ]]; then
    return 1
  fi

  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 1 --max-time 2 \
    "http://127.0.0.1:${METRO_PORT}/status" 2>/dev/null || true)"
  if [[ "$code" == "200" ]]; then
    # Metro is up — only reconnect if the app bridge is dead.
    if AGENT_UI_SKIP_HEAL=1 WAIT_SECS=2 "${root}/scripts/agent-ui-dump.sh" >/dev/null 2>&1; then
      return 0
    fi
  fi

  echo "agent-ui: healing packager (Metro status=${code:-down})…" >&2
  if AGENT_UI_SKIP_HEAL=1 bash "$ensure" --start; then
    return 0
  fi
  return 1
}

agent_ui_data_dir() {
  if [[ -n "${AGENT_UI_DATA_DIR:-}" && -d "${AGENT_UI_DATA_DIR}" ]]; then
    printf '%s\n' "${AGENT_UI_DATA_DIR}"
    return 0
  fi
  local dir
  dir="$(xcrun simctl get_app_container booted "$BUNDLE_ID" data 2>/dev/null || true)"
  if [[ -z "${dir}" ]]; then
    echo "error: could not resolve app data container for ${BUNDLE_ID}" >&2
    return 1
  fi
  AGENT_UI_DATA_DIR="${dir}"
  export AGENT_UI_DATA_DIR
  printf '%s\n' "${dir}"
}

agent_ui_paths() {
  local data_dir
  data_dir="$(agent_ui_data_dir)" || return 1
  AGENT_UI_DUMP_PATH="${data_dir}/Documents/${DUMP_NAME}"
  AGENT_UI_STATUS_PATH="${data_dir}/Documents/${STATUS_NAME}"
  AGENT_UI_COMMAND_PATH="${data_dir}/Documents/${COMMAND_NAME}"
  export AGENT_UI_DUMP_PATH AGENT_UI_STATUS_PATH AGENT_UI_COMMAND_PATH
}

# Write a command JSON object and wait until status matches expected_op.
# Prints status JSON on success. Returns 0 when status.ok is true (or --allow-fail).
# Usage: agent_ui_send [--allow-fail] [--expect-dump] '<json object>'
agent_ui_send() {
  local allow_fail=0
  local expect_dump=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --allow-fail) allow_fail=1; shift ;;
      --expect-dump) expect_dump=1; shift ;;
      *) break ;;
    esac
  done
  local payload="${1:-}"
  if [[ -z "${payload}" ]]; then
    echo "error: agent_ui_send requires JSON payload" >&2
    return 2
  fi

  agent_ui_paths || return 1
  rm -f "${AGENT_UI_STATUS_PATH}" "${AGENT_UI_COMMAND_PATH}"
  if (( expect_dump )); then
    rm -f "${AGENT_UI_DUMP_PATH}"
  fi

  local started
  started="$(python3 -c 'import time; print(time.time())')"
  AGENT_UI_COMMAND_PATH="${AGENT_UI_COMMAND_PATH}" PAYLOAD="${payload}" STARTED="${started}" python3 - <<'PY'
import json, os, time
from pathlib import Path
payload = json.loads(os.environ["PAYLOAD"])
if not isinstance(payload, dict):
    raise SystemExit("payload must be a JSON object")
payload["nonce"] = time.time_ns()
Path(os.environ["AGENT_UI_COMMAND_PATH"]).write_text(json.dumps(payload, separators=(",", ":")))
PY

  local expected_op
  expected_op="$(PAYLOAD="${payload}" python3 - <<'PY'
import json, os
print(json.loads(os.environ["PAYLOAD"]).get("op", "dump"))
PY
)"

  local deadline=$((SECONDS + WAIT_SECS))
  while (( SECONDS < deadline )); do
    if [[ -f "${AGENT_UI_STATUS_PATH}" ]]; then
      if (( expect_dump )) && [[ ! -f "${AGENT_UI_DUMP_PATH}" ]]; then
        sleep "${POLL_SLEEP}"
        continue
      fi
      local result
      result="$(
        STARTED_MTIME="${started}" \
        STATUS_PATH="${AGENT_UI_STATUS_PATH}" \
        EXPECTED_OP="${expected_op}" \
        ALLOW_FAIL="${allow_fail}" \
        python3 - <<'PY'
import json, os, sys
from pathlib import Path
status_path = Path(os.environ["STATUS_PATH"])
started = float(os.environ["STARTED_MTIME"])
expected = os.environ["EXPECTED_OP"]
allow_fail = os.environ.get("ALLOW_FAIL") == "1"
try:
    data = json.loads(status_path.read_text())
except Exception:
    print("wait")
    raise SystemExit
if status_path.stat().st_mtime < started - 2:
    print("wait")
    raise SystemExit
if data.get("op") != expected:
    print("wait")
    raise SystemExit
ok = bool(data.get("ok"))
print("ok" if ok or allow_fail else "fail")
print(json.dumps(data, separators=(",", ":")))
PY
      )"
      local status_line detail_line
      status_line="$(printf '%s\n' "${result}" | sed -n '1p')"
      detail_line="$(printf '%s\n' "${result}" | sed -n '2p')"
      if [[ "${status_line}" == "ok" ]]; then
        printf '%s\n' "${detail_line}"
        return 0
      fi
      if [[ "${status_line}" == "fail" ]]; then
        echo "error: agent-ui op ${expected_op} failed: ${detail_line}" >&2
        return 1
      fi
    fi
    sleep "${POLL_SLEEP}"
  done

  echo "error: timed out waiting for agent-ui status op=${expected_op}" >&2
  if [[ -f "${AGENT_UI_STATUS_PATH}" ]]; then
    echo "last status:" >&2
    cat "${AGENT_UI_STATUS_PATH}" >&2 || true
  fi
  return 1
}

agent_ui_send_op() {
  # agent_ui_send_op dump|tap|exists|prefix|route|goto|reset|seed|flow|wait|batch …
  local op="$1"
  shift || true
  case "${op}" in
    dump)
      agent_ui_send --expect-dump '{"op":"dump"}'
      ;;
    tap)
      local id="$1"
      agent_ui_send "$(python3 -c 'import json,sys; print(json.dumps({"op":"tap","id":sys.argv[1]}))' "${id}")"
      ;;
    exists)
      local id="$1"
      agent_ui_send --allow-fail "$(python3 -c 'import json,sys; print(json.dumps({"op":"exists","id":sys.argv[1]}))' "${id}")"
      ;;
    prefix)
      local prefix="$1"
      agent_ui_send --allow-fail "$(python3 -c 'import json,sys; print(json.dumps({"op":"prefix","prefix":sys.argv[1]}))' "${prefix}")"
      ;;
    route)
      agent_ui_send --allow-fail '{"op":"route"}'
      ;;
    goto)
      local to="$1"
      agent_ui_send "$(python3 -c 'import json,sys; print(json.dumps({"op":"goto","to":sys.argv[1]}))' "${to}")"
      ;;
    reset)
      agent_ui_send '{"op":"reset"}'
      ;;
    seed)
      local fixture="${1:-travel-demo}"
      agent_ui_send "$(python3 -c 'import json,sys; print(json.dumps({"op":"seed","to":sys.argv[1]}))' "${fixture}")"
      ;;
    flow)
      local name="$1"
      agent_ui_send "$(python3 -c 'import json,sys; print(json.dumps({"op":"flow","to":sys.argv[1]}))' "${name}")"
      ;;
    wait)
      # wait <prefix|id|route> [--prefix|--id|--route] [--timeout N]
      local mode="prefix"
      local target=""
      local timeout=4000
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --prefix) mode="prefix"; target="${2:-}"; shift 2 ;;
          --id) mode="id"; target="${2:-}"; shift 2 ;;
          --route) mode="route"; target="${2:-}"; shift 2 ;;
          --timeout) timeout="${2:-4000}"; shift 2 ;;
          *)
            if [[ -z "${target}" ]]; then target="$1"; shift
            else echo "error: unknown wait arg $1" >&2; return 2; fi
            ;;
        esac
      done
      agent_ui_send "$(MODE="${mode}" TARGET="${target}" TIMEOUT="${timeout}" python3 - <<'PY'
import json, os
mode = os.environ["MODE"]
target = os.environ["TARGET"]
timeout = int(os.environ["TIMEOUT"])
payload = {"op": "wait", "timeoutMs": timeout}
if mode == "id":
    payload["id"] = target
elif mode == "route":
    payload["to"] = target
else:
    payload["prefix"] = target
print(json.dumps(payload, separators=(",", ":")))
PY
)"
      ;;
    batch)
      local ops_json="$1"
      agent_ui_send "$(OPS_JSON="${ops_json}" python3 - <<'PY'
import json, os
ops = json.loads(os.environ["OPS_JSON"])
print(json.dumps({"op":"batch","ops":ops}, separators=(",", ":")))
PY
)"
      ;;
    *)
      echo "error: unknown op ${op}" >&2
      return 2
      ;;
  esac
}
