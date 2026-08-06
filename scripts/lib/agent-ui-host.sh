#!/usr/bin/env bash
# Shared host helpers for agent-ui file-command bridge (sourced by agent-ui-*.sh).
# Prefer file commands over simctl openurl when the app is already mounted.
# Hot path: scripts/lib/agent_ui_bridge.py (one process per op; disk-cached data dir).

: "${BUNDLE_ID:=com.imtihoss.ontracknow}"
: "${DUMP_NAME:=agent-ui-dump.json}"
: "${STATUS_NAME:=agent-ui-status.json}"
: "${COMMAND_NAME:=agent-ui-command.json}"
: "${POLL_SLEEP:=0.016}"
: "${METRO_PORT:=8081}"
# Host pin for dual-device runs (ios | android). Default ios.
: "${AGENT_UI_PLATFORM:=ios}"
# Wait ceilings (fail-fast when warm). Explicit WAIT_SECS always wins.
: "${AGENT_UI_WARM_WAIT_SECS:=2.5}"
: "${AGENT_UI_WARM_FLOW_WAIT_SECS:=5}"
: "${AGENT_UI_COLD_WAIT_SECS:=6}"
: "${AGENT_UI_COLD_FLOW_WAIT_SECS:=10}"
# Android seed/flow + colder JS need more headroom than iOS.
: "${AGENT_UI_ANDROID_WARM_WAIT_SECS:=5}"
: "${AGENT_UI_ANDROID_WARM_FLOW_WAIT_SECS:=12}"
: "${AGENT_UI_ANDROID_COLD_WAIT_SECS:=12}"
: "${AGENT_UI_ANDROID_COLD_FLOW_WAIT_SECS:=20}"
: "${AGENT_UI_WAIT_TIMEOUT_MS:=2000}"
: "${AGENT_UI_ANDROID_WAIT_TIMEOUT_MS:=4000}"

agent_ui_platform() {
  case "${AGENT_UI_PLATFORM:-ios}" in
    android|ANDROID) printf '%s\n' "android" ;;
    *) printf '%s\n' "ios" ;;
  esac
}

agent_ui_is_android() {
  [[ "$(agent_ui_platform)" == "android" ]]
}

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

agent_ui_bridge_py() {
  printf '%s\n' "$(agent_ui_repo_root)/scripts/lib/agent_ui_bridge.py"
}

# True when the daemon is up and a successful op landed recently (~30s).
agent_ui_bridge_is_warm() {
  AGENT_UI_ROOT="$(agent_ui_repo_root)" \
    python3 "$(agent_ui_bridge_py)" warm >/dev/null 2>&1
}

agent_ui_ensure_daemon() {
  AGENT_UI_ROOT="$(agent_ui_repo_root)" \
    python3 "$(agent_ui_bridge_py)" ensure-daemon >/dev/null 2>&1
}

# Apply fail-fast WAIT_SECS for simple|flow budgets.
# Respects an already-set WAIT_SECS (e.g. WAIT_SECS=30 ./scripts/agent-ui-flow.sh …).
# Usage: agent_ui_apply_wait_budget simple|flow
agent_ui_apply_wait_budget() {
  local kind="${1:-simple}"
  if [[ -n "${WAIT_SECS:-}" ]]; then
    export WAIT_SECS
    return 0
  fi
  if agent_ui_is_android; then
    if agent_ui_bridge_is_warm; then
      if [[ "${kind}" == "flow" ]]; then
        WAIT_SECS="${AGENT_UI_ANDROID_WARM_FLOW_WAIT_SECS}"
      else
        WAIT_SECS="${AGENT_UI_ANDROID_WARM_WAIT_SECS}"
      fi
    else
      if [[ "${kind}" == "flow" ]]; then
        WAIT_SECS="${AGENT_UI_ANDROID_COLD_FLOW_WAIT_SECS}"
      else
        WAIT_SECS="${AGENT_UI_ANDROID_COLD_WAIT_SECS}"
      fi
    fi
    # Bump in-app wait ceiling unless the caller already overrode it.
    if [[ "${AGENT_UI_WAIT_TIMEOUT_MS}" == "2000" ]]; then
      AGENT_UI_WAIT_TIMEOUT_MS="${AGENT_UI_ANDROID_WAIT_TIMEOUT_MS}"
    fi
    export AGENT_UI_WAIT_TIMEOUT_MS
  elif agent_ui_bridge_is_warm; then
    if [[ "${kind}" == "flow" ]]; then
      WAIT_SECS="${AGENT_UI_WARM_FLOW_WAIT_SECS}"
    else
      WAIT_SECS="${AGENT_UI_WARM_WAIT_SECS}"
    fi
  else
    if [[ "${kind}" == "flow" ]]; then
      WAIT_SECS="${AGENT_UI_COLD_FLOW_WAIT_SECS}"
    else
      WAIT_SECS="${AGENT_UI_COLD_WAIT_SECS}"
    fi
  fi
  export WAIT_SECS
}

agent_ui_android_lib() {
  # shellcheck source=android-emulator.sh
  source "$(agent_ui_repo_root)/scripts/lib/android-emulator.sh"
}

agent_ui_simulator_booted() {
  if agent_ui_is_android; then
    agent_ui_android_lib
    local serial
    serial="$(android_emu_preferred_serial || true)"
    [[ -n "$serial" ]] || return 1
    android_emu_adb get-state >/dev/null 2>&1
    return $?
  fi
  xcrun simctl list devices booted 2>/dev/null | grep -q Booted
}

agent_ui_app_installed() {
  if agent_ui_is_android; then
    agent_ui_android_lib
    android_emu_adb shell pm path "$BUNDLE_ID" 2>/dev/null | grep -q "package:"
    return $?
  fi
  xcrun simctl get_app_container booted "$BUNDLE_ID" data >/dev/null 2>&1
}

# True when the app process has a PID in the simulator (not merely installed).
agent_ui_app_process_running() {
  if agent_ui_is_android; then
    agent_ui_android_lib
    android_emu_adb shell pidof -s "$BUNDLE_ID" >/dev/null 2>&1
    return $?
  fi
  xcrun simctl spawn booted launchctl list 2>/dev/null \
    | grep -E "^[0-9]+[[:space:]]+.*UIKitApplication:${BUNDLE_ID}" >/dev/null
}

agent_ui_launch_app() {
  if agent_ui_is_android; then
    agent_ui_android_lib
    android_emu_adb shell monkey -p "$BUNDLE_ID" -c android.intent.category.LAUNCHER 1 \
      >/dev/null 2>&1 || \
      android_emu_adb shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER \
        -n "${BUNDLE_ID}/.MainActivity" >/dev/null 2>&1 || true
    return 0
  fi
  xcrun simctl launch booted "$BUNDLE_ID" >/dev/null 2>&1 || true
}

agent_ui_open_dev_client_url() {
  local url="$1"
  if agent_ui_is_android; then
    agent_ui_android_lib
    android_emu_adb shell am start -a android.intent.action.VIEW -d "$url" >/dev/null 2>&1 || true
    return 0
  fi
  xcrun simctl openurl booted "$url" >/dev/null 2>&1 || true
}

# Cheap bridge liveness (route status). Skips nested app-up / heal recursion.
agent_ui_bridge_answers() {
  local root wait_secs=1.5
  root="$(agent_ui_repo_root)" || return 1
  if agent_ui_is_android; then
    wait_secs=3
  fi
  AGENT_UI_SKIP_APP_UP=1 AGENT_UI_SKIP_HEAL=1 AGENT_UI_PLATFORM="$(agent_ui_platform)" \
    WAIT_SECS="${wait_secs}" \
    "${root}/scripts/agent-ui-route.sh" >/dev/null 2>&1
}

# True when a successful agent-ui op landed recently (avoids heal churn).
agent_ui_bridge_recently_ok() {
  local root path age
  root="$(agent_ui_repo_root)" || return 1
  path="${root}/.cursor/agent-ui-last-ok"
  [[ -f "$path" ]] || return 1
  age="$(python3 -c "import time,pathlib; p=pathlib.Path(r'''${path}''');
print(time.time()-float(p.read_text().strip() or 0))" 2>/dev/null || echo 999)"
  python3 -c "import sys; sys.exit(0 if float(sys.argv[1]) < 45 else 1)" "$age" 2>/dev/null
}

# Start/reconnect Metro only after a real bridge timeout — never on the happy path.
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
    # Metro is up — cheap route probe (not a full dump).
    if AGENT_UI_SKIP_APP_UP=1 AGENT_UI_SKIP_HEAL=1 WAIT_SECS=1.5 \
      "${root}/scripts/agent-ui-route.sh" >/dev/null 2>&1; then
      return 0
    fi
  fi

  echo "agent-ui: healing packager (Metro status=${code:-down})…" >&2
  local -a ensure_flags=(--start)
  if agent_ui_is_android; then
    ensure_flags+=(--android)
  fi
  if AGENT_UI_SKIP_HEAL=1 AGENT_UI_SKIP_APP_UP=1 AGENT_UI_PLATFORM="$(agent_ui_platform)" \
    bash "$ensure" "${ensure_flags[@]}"; then
    return 0
  fi
  return 1
}

# Gate verification: app must be up on the device (bridge answering).
# Happy path = one cheap route probe. Soft-launch / heal only when down.
# Skip with AGENT_UI_SKIP_APP_UP=1 (nested probes / ensure-packager recursion).
agent_ui_ensure_app_up() {
  if [[ "${AGENT_UI_SKIP_APP_UP:-0}" == "1" ]]; then
    return 0
  fi

  # Definitive liveness: JS bridge answered a route probe.
  if agent_ui_bridge_answers; then
    return 0
  fi

  local device_label="simulator"
  if agent_ui_is_android; then
    device_label="emulator"
  fi

  # Android: prefer soft wait over reconnect — heal drops the app onto `/`.
  if agent_ui_is_android && agent_ui_app_process_running && agent_ui_bridge_recently_ok; then
    local soft=$((SECONDS + 6))
    echo "agent-ui: Android bridge quiet but recently ok — soft wait…" >&2
    while (( SECONDS < soft )); do
      if agent_ui_bridge_answers; then
        return 0
      fi
      sleep 0.5
    done
  fi

  if ! agent_ui_simulator_booted; then
    echo "agent-ui: ${device_label} not booted — ensuring packager/app…" >&2
    if agent_ui_heal_packager && agent_ui_bridge_answers; then
      return 0
    fi
    echo "error: ${device_label} is not booted (and heal failed)" >&2
    return 1
  fi

  if ! agent_ui_app_installed; then
    echo "error: ${BUNDLE_ID} is not installed on the booted ${device_label}" >&2
    return 1
  fi

  if ! agent_ui_app_process_running; then
    echo "agent-ui: app not running — launching ${BUNDLE_ID}…" >&2
    agent_ui_launch_app
  else
    echo "agent-ui: app process up but bridge quiet — waiting…" >&2
  fi

  # Cold launch / reconnect needs a few seconds before the JS bridge mounts.
  local deadline=$((SECONDS + 10))
  if agent_ui_is_android; then
    deadline=$((SECONDS + 14))
  fi
  while (( SECONDS < deadline )); do
    if agent_ui_bridge_answers; then
      return 0
    fi
    sleep 0.4
  done

  # Last resort heal — skip on Android when process is up (reconnect resets route).
  if agent_ui_is_android && agent_ui_app_process_running; then
    echo "agent-ui: Android process up but bridge quiet — skipping force-reconnect heal" >&2
    echo "error: ${BUNDLE_ID} bridge not answering on ${device_label} (try android:ensure:start)" >&2
    return 1
  fi

  echo "agent-ui: app bridge not answering — healing packager…" >&2
  if agent_ui_heal_packager && agent_ui_bridge_answers; then
    return 0
  fi

  echo "error: ${BUNDLE_ID} is not up on the ${device_label} (bridge not answering)" >&2
  return 1
}

agent_ui_data_dir() {
  if agent_ui_is_android; then
    # Host-side dump cache (no adb Documents pull).
    local root
    root="$(agent_ui_repo_root)"
    mkdir -p "${root}/.cursor"
    printf '%s\n' "${root}/.cursor"
    return 0
  fi
  if [[ -n "${AGENT_UI_DATA_DIR:-}" && -d "${AGENT_UI_DATA_DIR}" ]]; then
    printf '%s\n' "${AGENT_UI_DATA_DIR}"
    return 0
  fi
  local dir
  dir="$(AGENT_UI_ROOT="$(agent_ui_repo_root)" \
    BUNDLE_ID="${BUNDLE_ID}" \
    python3 "$(agent_ui_bridge_py)" data-dir)" || return 1
  AGENT_UI_DATA_DIR="${dir}"
  export AGENT_UI_DATA_DIR
  printf '%s\n' "${dir}"
}

agent_ui_paths() {
  if agent_ui_is_android; then
    local root
    root="$(agent_ui_repo_root)"
    mkdir -p "${root}/.cursor"
    AGENT_UI_DUMP_PATH="${root}/.cursor/agent-ui-android-dump.json"
    AGENT_UI_STATUS_PATH="${root}/.cursor/agent-ui-android-status.json"
    AGENT_UI_COMMAND_PATH="${root}/.cursor/agent-ui-android-command.json"
    export AGENT_UI_DUMP_PATH AGENT_UI_STATUS_PATH AGENT_UI_COMMAND_PATH
    return 0
  fi
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

  : "${WAIT_SECS:=${AGENT_UI_COLD_WAIT_SECS}}"
  local -a flags=(
    --op raw
    --payload-json "${payload}"
    --wait-secs "${WAIT_SECS}"
  )
  if (( allow_fail )); then
    flags+=(--allow-fail)
  fi
  if (( expect_dump )); then
    flags+=(--expect-dump)
  fi

  AGENT_UI_ROOT="$(agent_ui_repo_root)" \
  AGENT_UI_PLATFORM="$(agent_ui_platform)" \
  BUNDLE_ID="${BUNDLE_ID}" \
  DUMP_NAME="${DUMP_NAME}" \
  STATUS_NAME="${STATUS_NAME}" \
  COMMAND_NAME="${COMMAND_NAME}" \
  POLL_SLEEP="${POLL_SLEEP}" \
  AGENT_UI_DATA_DIR="${AGENT_UI_DATA_DIR:-}" \
  ONTRACK_ANDROID_SERIAL="${ONTRACK_ANDROID_SERIAL:-}" \
  python3 "$(agent_ui_bridge_py)" send "${flags[@]}"
}

agent_ui_send_op() {
  # agent_ui_send_op dump|tap|scroll|exists|prefix|route|goto|reset|seed|flow|wait|batch|assert|hit|overlay …
  local op="$1"
  shift || true
  : "${WAIT_SECS:=${AGENT_UI_COLD_WAIT_SECS}}"
  local -a flags=(--op "${op}" --wait-secs "${WAIT_SECS}")

  case "${op}" in
    dump)
      flags+=(--expect-dump)
      ;;
    tap|scroll|exists)
      flags+=(--id "${1:-}")
      if [[ "${op}" == "exists" ]]; then
        flags+=(--allow-fail)
      fi
      ;;
    prefix)
      flags+=(--prefix "${1:-}" --allow-fail)
      ;;
    route)
      flags+=(--allow-fail)
      ;;
    goto)
      flags+=(--to "${1:-}")
      ;;
    reset) ;;
    seed)
      flags+=(--to "${1:-travel-demo}")
      ;;
    flow)
      flags+=(--to "${1:-}")
      ;;
    overlay)
      flags+=(--to "${1:-toggle}")
      ;;
    hit)
      # agent_ui_send_op hit <x> <y>
      flags+=(--x "${1:-}" --y "${2:-}" --allow-fail)
      ;;
    assert)
      # Remaining args are bridge --id/--to/--prefix/--contains/--missing flags.
      while [[ $# -gt 0 ]]; do
        flags+=("$1")
        shift
      done
      flags+=(--allow-fail)
      ;;
    wait)
      local mode="prefix"
      local target=""
      local timeout="${AGENT_UI_WAIT_TIMEOUT_MS}"
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --prefix) mode="prefix"; target="${2:-}"; shift 2 ;;
          --id) mode="id"; target="${2:-}"; shift 2 ;;
          --route) mode="route"; target="${2:-}"; shift 2 ;;
          --timeout) timeout="${2:-${AGENT_UI_WAIT_TIMEOUT_MS}}"; shift 2 ;;
          *)
            if [[ -z "${target}" ]]; then target="$1"; shift
            else echo "error: unknown wait arg $1" >&2; return 2; fi
            ;;
        esac
      done
      flags+=(--timeout-ms "${timeout}")
      case "${mode}" in
        id) flags+=(--id "${target}") ;;
        route) flags+=(--to "${target}") ;;
        *) flags+=(--prefix "${target}") ;;
      esac
      ;;
    batch)
      flags+=(--ops-json "${1:-}")
      ;;
    *)
      echo "error: unknown op ${op}" >&2
      return 2
      ;;
  esac

  AGENT_UI_ROOT="$(agent_ui_repo_root)" \
  AGENT_UI_PLATFORM="$(agent_ui_platform)" \
  BUNDLE_ID="${BUNDLE_ID}" \
  DUMP_NAME="${DUMP_NAME}" \
  STATUS_NAME="${STATUS_NAME}" \
  COMMAND_NAME="${COMMAND_NAME}" \
  POLL_SLEEP="${POLL_SLEEP}" \
  AGENT_UI_DATA_DIR="${AGENT_UI_DATA_DIR:-}" \
  ONTRACK_ANDROID_SERIAL="${ONTRACK_ANDROID_SERIAL:-}" \
  python3 "$(agent_ui_bridge_py)" send "${flags[@]}"
}
