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
# If the device/bridge stays quiet this long, assume it went down and restart once.
: "${AGENT_UI_DEVICE_RESPOND_SECS:=10}"
# After an intentional device restart, allow more settle time for boot + JS mount.
: "${AGENT_UI_DEVICE_POST_RESTART_WAIT_SECS:=30}"
: "${AGENT_UI_ANDROID_POST_RESTART_WAIT_SECS:=45}"
# Device pool lease — up to AGENT_UI_POOL_MAX concurrent dedicated agent devices.
: "${AGENT_UI_LOCK_WAIT_SECS:=300}"
: "${AGENT_UI_POOL_MAX:=5}"

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/agent-ui-pool.sh"

# Abort when THIS entry script is piped through head/tail — those buffer until
# exit so Cursor shows “Running…” with no progress for minutes.
# Prefer bare invoke or tee. Escape: AGENT_UI_ALLOW_PIPED_TAIL=1
#
# Only inspect shell lines that mention this entry script. Cursor agent shells
# often pack many commands into one zsh -c blob; a sibling `| tail` must not
# block `agent-ui.sh once` on the next line.
agent_ui_refuse_piped_head_tail() {
  local label="${1:-agent-ui}"
  if [[ "${AGENT_UI_ALLOW_PIPED_TAIL:-0}" == "1" ]]; then
    return 0
  fi
  if [[ -t 1 ]]; then
    return 0
  fi

  local parent_cmd user_cmd entry_base util_h util_t line matched_line=""
  # Use $0 (main script), not BASH_SOURCE[1]: this function is called from
  # host.sh itself, so BASH_SOURCE[1] is agent-ui-host.sh and would no-op.
  entry_base="$(basename "${0:-}")"
  if [[ -z "${entry_base}" || "${entry_base}" == "agent-ui-host.sh" || "${entry_base}" == "bash" || "${entry_base}" == "sh" ]]; then
    return 0
  fi

  parent_cmd="$(ps -o command= -p "${PPID}" 2>/dev/null || true)"
  # Cursor wraps as: zsh -c '…' -- <user command>.
  if [[ "${parent_cmd}" == *' -- '* ]]; then
    user_cmd="${parent_cmd##* -- }"
  else
    user_cmd="${parent_cmd}"
  fi

  util_h="he"; util_h="${util_h}ad"
  util_t="ta"; util_t="${util_t}il"

  # Cursor ps(1) often embeds literal \012 for newlines inside zsh -c blobs.
  user_cmd="${user_cmd//\\012/$'\n'}"
  while IFS= read -r line || [[ -n "${line}" ]]; do
    if [[ "${line}" != *"${entry_base}"* ]]; then
      continue
    fi
    # Only when THIS entry's stdout is piped: `script … | head|tail`.
    # Sibling `jest | tail && script` must not match (runtime false positive).
    # Allow `/usr/bin/head` as well as bare `head`.
    if printf '%s\n' "${line}" | grep -Eq "${entry_base}"'.*\|[[:space:]]*(.*/)?('"${util_h}"'|'"${util_t}"')([[:space:]]|$)'; then
      matched_line="${line:0:180}"
      echo "error: ${label}: stdout is piped through head/tail — progress buffers until exit (looks hung). Drop the pipe (or use tee). Escape: AGENT_UI_ALLOW_PIPED_TAIL=1" >&2
      exit 2
    fi
  done <<< "${user_cmd}"
}

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

agent_ui_lock_dir() {
  if [[ -n "${AGENT_UI_LOCK_DIR:-}" ]]; then
    printf '%s\n' "${AGENT_UI_LOCK_DIR}"
    return 0
  fi
  if [[ -n "${AGENT_UI_SLOT:-}" ]]; then
    agent_ui_pool_slot_lockdir "$AGENT_UI_SLOT"
    return 0
  fi
  printf '%s\n' "$(agent_ui_repo_root)/.cursor/agent-ui.lockdir"
}

# agent_ui_ensure_lease / agent_ui_release_lease → scripts/lib/agent-ui-pool.sh

agent_ui_bridge_py() {
  printf '%s\n' "$(agent_ui_repo_root)/scripts/lib/agent_ui_bridge.py"
}

agent_ui_ios_lib() {
  # shellcheck disable=SC1091
  source "$(agent_ui_repo_root)/scripts/lib/ios-simulator.sh"
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

# Pin adb to the preferred AVD serial. Required when Galaxy_S26 and onTrack_Agent_N
# are both booted — bare `adb` otherwise hits the first emulator.
agent_ui_pin_android_serial() {
  agent_ui_is_android || return 0
  agent_ui_android_lib
  local serial
  serial="$(android_emu_preferred_serial || true)"
  if [[ -z "$serial" ]]; then
    return 1
  fi
  export ONTRACK_ANDROID_SERIAL="$serial"
  export ANDROID_SERIAL="$serial"
  return 0
}

# True when the host device answers a cheap RPC within AGENT_UI_DEVICE_RESPOND_SECS.
# Timed so a wedged CoreSimulator / dead qemu cannot hang the agent forever.
agent_ui_device_host_responds() {
  local secs="${AGENT_UI_DEVICE_RESPOND_SECS:-10}"
  if agent_ui_is_android; then
    agent_ui_android_lib
    agent_ui_pin_android_serial || return 1
    local adb_bin
    adb_bin="$(android_emu_sdk_bin adb)"
    [[ -n "$adb_bin" ]] || return 1
    local -a adb_cmd=("$adb_bin")
    if [[ -n "${ONTRACK_ANDROID_SERIAL:-${ANDROID_SERIAL:-}}" ]]; then
      adb_cmd+=(-s "${ONTRACK_ANDROID_SERIAL:-${ANDROID_SERIAL}}")
    fi
    adb_cmd+=(get-state)
    perl -e 'alarm shift @ARGV; exec @ARGV' "$secs" "${adb_cmd[@]}" >/dev/null 2>&1
    return $?
  fi
  agent_ui_ios_lib
  ios_simctl_timed "$secs" list devices booted >/dev/null 2>&1
}

# Shut down + reboot the preferred sim/emu for this platform (once per call site).
# Escape: AGENT_UI_SKIP_DEVICE_RESTART=1.
agent_ui_restart_device() {
  if [[ "${AGENT_UI_SKIP_DEVICE_RESTART:-0}" == "1" ]]; then
    return 1
  fi
  if agent_ui_is_android; then
    agent_ui_android_lib
    local name serial
    name="$(android_emu_preferred_name)"
    serial="$(android_emu_preferred_serial || true)"
    echo "agent-ui: ${name} not responding — restarting emulator…" >&2
    if [[ -n "$serial" ]]; then
      android_emu_adb emu kill >/dev/null 2>&1 || true
      local kill_deadline=$((SECONDS + 20))
      while (( SECONDS < kill_deadline )); do
        serial="$(android_emu_preferred_serial || true)"
        [[ -z "$serial" ]] && break
        sleep 0.5
      done
    fi
    unset ONTRACK_ANDROID_SERIAL ANDROID_SERIAL
    ensure_preferred_android_emulator || return 1
    agent_ui_pin_android_serial || true
    return 0
  fi
  agent_ui_ios_lib
  local name udid root
  name="$(ios_sim_preferred_name)"
  udid="${ONTRACK_IOS_SIMULATOR_UDID:-}"
  if [[ -z "$udid" || "$udid" == "booted" ]]; then
    udid="$(ios_sim_resolve_udid 2>/dev/null || true)"
  fi
  echo "agent-ui: ${name} not responding — restarting simulator…" >&2
  if [[ -n "$udid" ]]; then
    xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true
  fi
  # Container path can change after reboot — drop stale caches.
  root="$(agent_ui_repo_root)"
  rm -f "${root}/.cursor/agent-ui-data-dir" 2>/dev/null || true
  if [[ -n "$udid" ]]; then
    rm -f "${root}/.cursor/agent-ui-data-dir-${udid}" 2>/dev/null || true
  fi
  unset AGENT_UI_DATA_DIR
  ensure_preferred_ios_simulator || return 1
  return 0
}

agent_ui_simulator_booted() {
  if agent_ui_is_android; then
    agent_ui_android_lib
    agent_ui_pin_android_serial || return 1
    # Require sys.boot_completed — adb "device" alone is mid-boot and flaky.
    android_emu_is_ready
    return $?
  fi
  agent_ui_ios_lib
  local secs="${AGENT_UI_DEVICE_RESPOND_SECS:-10}"
  local listed
  listed="$(ios_simctl_timed "$secs" list devices booted 2>/dev/null || true)"
  [[ -n "$listed" ]] || return 1
  if [[ -n "${ONTRACK_IOS_SIMULATOR_UDID:-}" ]]; then
    printf '%s\n' "$listed" | grep -q "${ONTRACK_IOS_SIMULATOR_UDID}"
    return $?
  fi
  printf '%s\n' "$listed" | grep -q Booted
}

agent_ui_app_installed() {
  if agent_ui_is_android; then
    agent_ui_pin_android_serial || return 1
    android_emu_adb shell pm path "$BUNDLE_ID" 2>/dev/null | grep -q "package:"
    return $?
  fi
  agent_ui_ios_lib
  ios_simctl_timed get_app_container "$(ios_sim_target)" "$BUNDLE_ID" data >/dev/null 2>&1
}

# True when the app process has a PID in the simulator (not merely installed).
agent_ui_app_process_running() {
  if agent_ui_is_android; then
    agent_ui_android_lib
    android_emu_adb shell pidof -s "$BUNDLE_ID" >/dev/null 2>&1
    return $?
  fi
  agent_ui_ios_lib
  ios_simctl_timed spawn "$(ios_sim_target)" launchctl list 2>/dev/null \
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
  agent_ui_ios_lib
  ios_simctl_timed 12 launch "$(ios_sim_target)" "$BUNDLE_ID" >/dev/null 2>&1 || true
}

agent_ui_open_dev_client_url() {
  local url="$1"
  if agent_ui_is_android; then
    agent_ui_android_lib
    android_emu_adb shell am start -a android.intent.action.VIEW -d "$url" >/dev/null 2>&1 || true
    return 0
  fi
  agent_ui_ios_lib
  # Trust custom schemes before openurl so SpringBoard skips "Open in …?".
  if [[ -n "${ONTRACK_IOS_SIMULATOR_UDID:-}" ]]; then
    ios_sim_approve_url_schemes "$ONTRACK_IOS_SIMULATOR_UDID" >/dev/null || true
  else
    ios_sim_approve_url_schemes >/dev/null || true
  fi
  ios_simctl_timed 12 openurl "$(ios_sim_target)" "$url" >/dev/null 2>&1 || true
}

# Tell the running app which pool slot to poll (daemon routes by slot).
agent_ui_pin_slot() {
  local slot="${1:-${AGENT_UI_SLOT:-}}"
  [[ -n "$slot" ]] || return 0
  local url="ontrack://agent/ui?op=route&slot=${slot}"
  agent_ui_open_dev_client_url "$url"
}

# Cheap bridge liveness (route status). Skips nested app-up / heal recursion.
# Requires ok=true + non-empty route (agent-ui-route.sh exits 1 on allow_fail timeouts).
agent_ui_bridge_answers() {
  local root wait_secs=1.5 route
  root="$(agent_ui_repo_root)" || return 1
  if agent_ui_is_android; then
    wait_secs=3
    # HTTP status can come from any android client (e.g. Galaxy while the
    # pool targets onTrack_Agent_N). Require the pinned AVD actually runs the app.
    agent_ui_android_lib
    agent_ui_pin_android_serial || return 1
    agent_ui_app_process_running || return 1
  fi
  route="$(
    AGENT_UI_SKIP_APP_UP=1 AGENT_UI_SKIP_HEAL=1 AGENT_UI_PLATFORM="$(agent_ui_platform)" \
      AGENT_UI_LOCK_HELD="${AGENT_UI_LOCK_HELD:-0}" \
      AGENT_UI_LOCK_ACQUIRED=0 \
      AGENT_UI_SLOT="${AGENT_UI_SLOT:-}" \
      AGENT_UI_POOL_MODE="${AGENT_UI_POOL_MODE:-}" \
      ONTRACK_IOS_SIMULATOR="${ONTRACK_IOS_SIMULATOR:-}" \
      ONTRACK_IOS_SIMULATOR_UDID="${ONTRACK_IOS_SIMULATOR_UDID:-}" \
      ONTRACK_ANDROID_AVD="${ONTRACK_ANDROID_AVD:-}" \
      ONTRACK_ANDROID_SERIAL="${ONTRACK_ANDROID_SERIAL:-}" \
      WAIT_SECS="${wait_secs}" \
      "${root}/scripts/agent-ui-route.sh" 2>/dev/null
  )" || return 1
  [[ -n "${route}" ]]
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
      AGENT_UI_LOCK_HELD="${AGENT_UI_LOCK_HELD:-0}" \
      AGENT_UI_LOCK_ACQUIRED=0 \
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
    AGENT_UI_LOCK_HELD="${AGENT_UI_LOCK_HELD:-0}" \
    AGENT_UI_LOCK_ACQUIRED=0 \
    bash "$ensure" "${ensure_flags[@]}"; then
    return 0
  fi
  return 1
}

# Dismiss blocking iOS SpringBoard sheets (Apple Account, etc.) when present.
# No-op on Android / when AGENT_UI_SKIP_IOS_ALERTS=1. Cached clear ~90s.
agent_ui_ensure_ios_system_alerts_clear() {
  if agent_ui_is_android; then
    return 0
  fi
  if [[ "${AGENT_UI_SKIP_IOS_ALERTS:-0}" == "1" ]]; then
    return 0
  fi
  AGENT_UI_ROOT="$(agent_ui_repo_root)" AGENT_UI_PLATFORM="$(agent_ui_platform)" \
    python3 "$(agent_ui_repo_root)/scripts/lib/ios_system_alert.py" ensure
}

# Write pool slot pin so the JS bridge polls the matching daemon queue before
# the first command (iOS Documents file / Android run-as files/).
agent_ui_write_slot_pin() {
  [[ -n "${AGENT_UI_SLOT:-}" ]] || return 0
  AGENT_UI_ROOT="$(agent_ui_repo_root)" \
  AGENT_UI_PLATFORM="$(agent_ui_platform)" \
  AGENT_UI_SLOT="${AGENT_UI_SLOT}" \
  AGENT_UI_POOL_MODE="${AGENT_UI_POOL_MODE:-}" \
  BUNDLE_ID="${BUNDLE_ID}" \
  ONTRACK_IOS_SIMULATOR_UDID="${ONTRACK_IOS_SIMULATOR_UDID:-}" \
  ONTRACK_ANDROID_SERIAL="${ONTRACK_ANDROID_SERIAL:-}" \
  ANDROID_SERIAL="${ONTRACK_ANDROID_SERIAL:-${ANDROID_SERIAL:-}}" \
    python3 "$(agent_ui_bridge_py)" write-slot-pin >/dev/null 2>&1 || true
}

# Soft reconnect: open Metro URL + pin slot (no force-stop). Safe when the
# process is up but stuck on DevLauncher / pre-JS.
agent_ui_soft_reconnect_dev_client() {
  local host="${PACKAGER_HOST:-127.0.0.1}" encoded url
  case "$host" in
    localhost|lan|LAN) host=127.0.0.1 ;;
  esac
  encoded="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "http://${host}:${METRO_PORT:-8081}")"
  url="exp+ontrack://expo-development-client/?url=${encoded}"
  if agent_ui_is_android; then
    agent_ui_android_lib
    android_emu_ensure_adb_reverse >/dev/null 2>&1 || true
  fi
  agent_ui_open_dev_client_url "$url"
  agent_ui_write_slot_pin
  # Brief beat so Expo can hand off before the slot deep-link.
  sleep 0.8
  agent_ui_pin_slot "${AGENT_UI_SLOT:-}" || true
  return 0
}

# Clone the app onto a pool device when the slot is empty.
agent_ui_pool_ensure_app_installed() {
  [[ -n "${AGENT_UI_SLOT:-}" || "${AGENT_UI_POOL_MODE:-0}" == "1" ]] || return 1
  if agent_ui_app_installed; then
    return 0
  fi
  if agent_ui_is_android; then
    echo "agent-ui: cloning app onto pool Android device…" >&2
    agent_ui_android_lib
    agent_ui_pool_clone_android_app "${ONTRACK_ANDROID_SERIAL:-}" || return 1
  else
    echo "agent-ui: cloning app onto pool iOS device…" >&2
    local udid="${ONTRACK_IOS_SIMULATOR_UDID:-}"
    if [[ -z "$udid" || "$udid" == "booted" ]]; then
      agent_ui_ios_lib
      udid="$(ios_sim_resolve_udid 2>/dev/null || true)"
    fi
    [[ -n "$udid" ]] || return 1
    agent_ui_pool_clone_ios_app "$udid" || return 1
  fi
  agent_ui_app_installed
}

# Wait until the bridge answers (or deadline). Pins slot file each loop.
agent_ui_wait_for_bridge() {
  local deadline_secs="${1:-12}"
  local started=$SECONDS
  local deadline=$((SECONDS + deadline_secs))
  local last_beat=$SECONDS
  local label="iOS bridge"
  if agent_ui_is_android; then
    label="Android bridge"
  fi
  agent_ui_write_slot_pin
  while (( SECONDS < deadline )); do
    if agent_ui_bridge_answers; then
      return 0
    fi
    if (( SECONDS - last_beat >= 5 )); then
      echo "agent-ui: still waiting for ${label}… ($((SECONDS - started))s / ${deadline_secs}s)" >&2
      last_beat=$SECONDS
    fi
    sleep 0.4
  done
  return 1
}

# Bridge answered — pin pool slot, then clear iOS system sheets that cover the app.
agent_ui_finish_app_up() {
  if [[ -n "${AGENT_UI_SLOT:-}" ]]; then
    agent_ui_write_slot_pin
    agent_ui_pin_slot "${AGENT_UI_SLOT}" || true
  fi
  # Headed Android: bridge-ok can still be a blank SurfaceView after window restart.
  if agent_ui_is_android; then
    agent_ui_android_lib
    if android_emu_want_app_surface; then
      if ! android_emu_ensure_app_surface 0; then
        echo "error: Android app surface still blank/white after handoff heal" >&2
        return 1
      fi
    fi
  fi
  # Drop orphaned CoreSimulator screenshot RPCs left by prior timed-out xcrun
  # parents — they wedge install/launch for every other agent on the host.
  if ! agent_ui_is_android; then
    local udid="${ONTRACK_IOS_SIMULATOR_UDID:-}"
    if [[ -n "$udid" && "$udid" != "booted" ]]; then
      pkill -9 -f "simctl io ${udid} screenshot" 2>/dev/null || true
    fi
  fi
  # Alert OCR: headed viewer hard-fails if surfaces stay unavailable (never
  # green-blind). True headless + headless Agent-pool leases soft-continue
  # inside ios_system_alert.py after a bounded capture heal.
  if ! agent_ui_ensure_ios_system_alerts_clear; then
    agent_ui_ios_lib 2>/dev/null || true
    if ios_sim_app_running 2>/dev/null && [[ "${ONTRACK_IOS_SIMULATOR_WINDOW:-0}" == "1" ]]; then
      echo "error: iOS system-alert clear failed while headed Simulator is required" >&2
      return 1
    fi
    echo "agent-ui: iOS system-alert clear failed — continuing (bridge is up)" >&2
  fi
  return 0
}

# Gate verification: app must be up on the device (bridge answering).
# Happy path = one cheap route probe. Soft-launch / heal only when down.
# Skip with AGENT_UI_SKIP_APP_UP=1 (nested probes / ensure-packager recursion).
agent_ui_ensure_app_up() {
  if [[ "${AGENT_UI_SKIP_APP_UP:-0}" == "1" ]]; then
    return 0
  fi

  # Android: emulator must be fully booted before any bridge/test work.
  # Mid-boot adb "device" + allow_fail route timeouts used to look "up" and
  # produce verify failed route=?. Pin serial before any probe so we never talk to Galaxy_S26
  # while ONTRACK_ANDROID_AVD=onTrack_Agent_N.
  if agent_ui_is_android; then
    agent_ui_android_lib
    if ! android_emu_is_ready; then
      echo "agent-ui: Android emulator not ready — ensuring boot…" >&2
      if ! android_emu_ensure_ready; then
        echo "error: Android emulator is not up and ready" >&2
        return 1
      fi
    else
      agent_ui_pin_android_serial || true
      android_emu_ensure_adb_reverse >/dev/null 2>&1 || true
    fi
  fi

  # Definitive liveness: JS bridge answered a route probe (ok + route path).
  if agent_ui_bridge_answers; then
    agent_ui_finish_app_up
    return $?
  fi

  local device_label="simulator"
  local reverse_was_missing=0
  local respond_secs="${AGENT_UI_DEVICE_RESPOND_SECS:-10}"
  local device_restarted=0
  if agent_ui_is_android; then
    device_label="emulator"
    # Cheap fix first: missing adb reverse breaks 127.0.0.1 Metro + daemon.
    agent_ui_pin_android_serial || true
    agent_ui_android_lib
    if android_emu_ensure_adb_reverse >/dev/null 2>&1; then
      if [[ "${ANDROID_EMU_REVERSE_ADDED:-0}" == "1" ]]; then
        reverse_was_missing=1
      fi
      if agent_ui_bridge_answers; then
        agent_ui_finish_app_up
        return $?
      fi
    fi
  fi

  # Prefer soft wait over reconnect/heal when the app is still alive.
  # (Android heal drops onto `/`; iOS sim restart is also expensive.)
  if agent_ui_app_process_running && agent_ui_bridge_recently_ok; then
    if agent_ui_is_android; then
      echo "agent-ui: Android bridge quiet but recently ok — soft wait…" >&2
    else
      echo "agent-ui: iOS bridge quiet but recently ok — soft wait…" >&2
    fi
    if agent_ui_wait_for_bridge "$respond_secs"; then
      agent_ui_finish_app_up
      return $?
    fi
  fi

  # Host RPC dead within the respond window → assume device went down.
  if ! agent_ui_device_host_responds; then
    echo "agent-ui: ${device_label} host not responding within ${respond_secs}s — restarting…" >&2
    if agent_ui_restart_device; then
      device_restarted=1
    fi
  fi

  if ! agent_ui_simulator_booted; then
    echo "agent-ui: ${device_label} not booted — ensuring packager/app…" >&2
    if agent_ui_heal_packager && agent_ui_bridge_answers; then
      agent_ui_finish_app_up
      return $?
    fi
    # Heal often boots the device even when the bridge is still quiet (e.g. app
    # missing on a fresh pool slot). Fall through to clone/launch instead of
    # mis-reporting "not booted".
    if ! agent_ui_simulator_booted; then
      if (( device_restarted == 0 )); then
        echo "agent-ui: ${device_label} still down — restarting once…" >&2
        if agent_ui_restart_device; then
          device_restarted=1
        fi
      fi
      if ! agent_ui_simulator_booted; then
        echo "error: ${device_label} is not booted (and restart/heal failed)" >&2
        return 1
      fi
    fi
  fi

  if ! agent_ui_app_installed; then
    if agent_ui_pool_ensure_app_installed; then
      :
    else
      echo "error: ${BUNDLE_ID} is not installed on the booted ${device_label}" >&2
      return 1
    fi
  fi

  if ! agent_ui_app_process_running; then
    echo "agent-ui: app not running — launching ${BUNDLE_ID}…" >&2
    agent_ui_launch_app
    # Fresh pool slots need the Metro deep-link, not just a launcher start.
    if [[ -n "${AGENT_UI_SLOT:-}" || "${AGENT_UI_POOL_MODE:-0}" == "1" ]]; then
      agent_ui_soft_reconnect_dev_client
    else
      agent_ui_write_slot_pin
    fi
  else
    # Soft reconnect (Metro URL) before assuming the device is dead.
    echo "agent-ui: ${device_label} bridge quiet — soft reconnecting dev client…" >&2
    agent_ui_soft_reconnect_dev_client
  fi

  if [[ "$reverse_was_missing" == "1" ]]; then
    echo "agent-ui: adb reverse was missing — healing packager once…" >&2
    if agent_ui_heal_packager && agent_ui_bridge_answers; then
      agent_ui_finish_app_up
      return $?
    fi
  fi

  # After launch/reconnect, wait for the JS bridge. Android cold bundles often
  # need far longer than AGENT_UI_DEVICE_RESPOND_SECS (default 10) — restarting
  # qemu here was the main Android verify flake (kill mid-bundle → minutes lost).
  # Warm path (process up + recent ok) uses a shorter budget on both platforms.
  local bridge_wait="$respond_secs"
  if agent_ui_is_android; then
    if agent_ui_app_process_running && agent_ui_bridge_recently_ok; then
      bridge_wait="${AGENT_UI_ANDROID_WARM_BRIDGE_WAIT_SECS:-15}"
    else
      bridge_wait="${AGENT_UI_ANDROID_BRIDGE_WAIT_SECS:-60}"
    fi
  elif agent_ui_app_process_running && agent_ui_bridge_recently_ok; then
    bridge_wait="${AGENT_UI_IOS_WARM_BRIDGE_WAIT_SECS:-10}"
  fi
  if agent_ui_wait_for_bridge "$bridge_wait"; then
    agent_ui_finish_app_up
    return $?
  fi

  # App process alive ⇒ device is fine. Soft-reconnect / heal only — never
  # restart qemu / simctl mid-bundle.
  if agent_ui_app_process_running; then
    if agent_ui_is_android; then
      echo "agent-ui: Android app running but bridge quiet — soft reconnect + wait…" >&2
    else
      echo "agent-ui: iOS app running but bridge quiet — soft reconnect + wait…" >&2
    fi
    agent_ui_soft_reconnect_dev_client
    local quiet_wait="$bridge_wait"
    if agent_ui_is_android; then
      quiet_wait="${AGENT_UI_ANDROID_BRIDGE_WAIT_SECS:-60}"
      if agent_ui_bridge_recently_ok; then
        quiet_wait="${AGENT_UI_ANDROID_WARM_BRIDGE_WAIT_SECS:-15}"
      fi
    elif agent_ui_bridge_recently_ok; then
      quiet_wait="${AGENT_UI_IOS_WARM_BRIDGE_WAIT_SECS:-10}"
    else
      quiet_wait="${AGENT_UI_IOS_BRIDGE_WAIT_SECS:-30}"
    fi
    if agent_ui_wait_for_bridge "$quiet_wait"; then
      agent_ui_finish_app_up
      return $?
    fi
    echo "agent-ui: app bridge not answering — healing packager…" >&2
    if agent_ui_heal_packager && agent_ui_bridge_answers; then
      agent_ui_finish_app_up
      return $?
    fi
    echo "error: ${BUNDLE_ID} is not up on the ${device_label} (bridge not answering)" >&2
    return 1
  fi

  if (( device_restarted == 0 )); then
    echo "agent-ui: ${device_label} not responding within ${bridge_wait}s — assuming down, restarting…" >&2
    if agent_ui_restart_device; then
      device_restarted=1
      if ! agent_ui_app_installed; then
        agent_ui_pool_ensure_app_installed || true
      fi
      if ! agent_ui_app_installed; then
        echo "error: ${BUNDLE_ID} is not installed after ${device_label} restart" >&2
        return 1
      fi
      echo "agent-ui: relaunching ${BUNDLE_ID} after ${device_label} restart…" >&2
      agent_ui_launch_app
      agent_ui_soft_reconnect_dev_client
      local post_wait="${AGENT_UI_DEVICE_POST_RESTART_WAIT_SECS:-30}"
      if agent_ui_is_android; then
        post_wait="${AGENT_UI_ANDROID_POST_RESTART_WAIT_SECS:-60}"
      fi
      if agent_ui_wait_for_bridge "$post_wait"; then
        agent_ui_finish_app_up
        return $?
      fi
    fi
  fi

  echo "agent-ui: app bridge not answering — healing packager…" >&2
  if agent_ui_heal_packager && agent_ui_bridge_answers; then
    agent_ui_finish_app_up
    return $?
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
  AGENT_UI_SLOT="${AGENT_UI_SLOT:-}" \
  AGENT_UI_POOL_MODE="${AGENT_UI_POOL_MODE:-}" \
  BUNDLE_ID="${BUNDLE_ID}" \
  DUMP_NAME="${DUMP_NAME}" \
  STATUS_NAME="${STATUS_NAME}" \
  COMMAND_NAME="${COMMAND_NAME}" \
  POLL_SLEEP="${POLL_SLEEP}" \
  AGENT_UI_DATA_DIR="${AGENT_UI_DATA_DIR:-}" \
  ONTRACK_IOS_SIMULATOR_UDID="${ONTRACK_IOS_SIMULATOR_UDID:-}" \
  ONTRACK_ANDROID_SERIAL="${ONTRACK_ANDROID_SERIAL:-}" \
  python3 "$(agent_ui_bridge_py)" send "${flags[@]}"
}

agent_ui_send_op() {
  # agent_ui_send_op dump|tap|scroll|exists|prefix|route|goto|reset|seed|flow|wait|batch|assert|hit|overlay|devmode …
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
    devmode)
      flags+=(--to "${1:-status}")
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
  AGENT_UI_SLOT="${AGENT_UI_SLOT:-}" \
  AGENT_UI_POOL_MODE="${AGENT_UI_POOL_MODE:-}" \
  BUNDLE_ID="${BUNDLE_ID}" \
  DUMP_NAME="${DUMP_NAME}" \
  STATUS_NAME="${STATUS_NAME}" \
  COMMAND_NAME="${COMMAND_NAME}" \
  POLL_SLEEP="${POLL_SLEEP}" \
  AGENT_UI_DATA_DIR="${AGENT_UI_DATA_DIR:-}" \
  ONTRACK_IOS_SIMULATOR_UDID="${ONTRACK_IOS_SIMULATOR_UDID:-}" \
  ONTRACK_ANDROID_SERIAL="${ONTRACK_ANDROID_SERIAL:-}" \
  python3 "$(agent_ui_bridge_py)" send "${flags[@]}"
}

# Parse --route / --flow / --open from a verify/once argv list (ignore asserts).
agent_ui_parse_land_args() {
  AGENT_UI_LAND_ROUTE=""
  AGENT_UI_LAND_FLOW=""
  AGENT_UI_LAND_OPEN=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --route)
        AGENT_UI_LAND_ROUTE="${2:-}"
        shift 2
        ;;
      --flow)
        AGENT_UI_LAND_FLOW="${2:-}"
        shift 2
        ;;
      --open)
        AGENT_UI_LAND_OPEN="${2:-}"
        shift 2
        ;;
      --color|--contains)
        shift 3 || shift $#
        ;;
      --exists|--missing|--prefix|--tolerance|--screenshot|--goto|--seed|--tap|--wait|--wait-route|--wait-id|--wait-prefix|--assert-exists|--assert-missing|--assert-prefix|--assert-contains|--dismiss)
        # Value optional for --screenshot; always consume at least the flag.
        if [[ $# -ge 2 && "${2:-}" != --* ]]; then
          shift 2
        else
          shift
        fi
        ;;
      *)
        shift
        ;;
    esac
  done
}

# When Simulator.app is open: leave the user's preferred headed sim on the
# verified surface with a fresh Metro bundle. Pool verify runs on Agent N —
# without this, the open Pro window stays on stale JS.
# Escape: AGENT_UI_SKIP_HEADED_HANDOFF=1
agent_ui_headed_ios_handoff() {
  local route="${1:-}" flow="${2:-}" open_alias="${3:-}"
  local name udid root
  [[ "${AGENT_UI_SKIP_HEADED_HANDOFF:-0}" == "1" ]] && return 0
  agent_ui_ios_lib
  ios_sim_app_running || return 0

  # Lease pollutes ONTRACK_IOS_SIMULATOR / _UDID with Agent N — never hand off there.
  name="$(ios_sim_viewer_name)"
  udid="$(
    ONTRACK_IOS_SIMULATOR="$name" ONTRACK_IOS_SIMULATOR_UDID= \
      ios_sim_preferred_booted_udid
  )"
  if [[ -z "$udid" ]]; then
    udid="$(
      ONTRACK_IOS_SIMULATOR="$name" ONTRACK_IOS_SIMULATOR_UDID= \
        ios_sim_resolve_udid 2>/dev/null || true
    )"
    [[ -n "$udid" ]] || return 0
    xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  fi

  echo "agent-ui: headed viewer handoff → ${name} (reload JS + land ${route:-surface})" >&2
  defaults write com.apple.iphonesimulator CurrentDeviceUDID "$udid" >/dev/null 2>&1 || true
  ios_sim_park_agent_windows || true
  ios_sim_focus_window_named "$name" || true

  root="$(agent_ui_repo_root)"
  (
    export AGENT_UI_SKIP_LEASE=1
    export AGENT_UI_USE_POOL=0
    export AGENT_UI_LOCK_HELD=1
    export AGENT_UI_LOCK_ACQUIRED=0
    unset AGENT_UI_SLOT AGENT_UI_LOCK_DIR AGENT_UI_POOL_MODE
    unset ONTRACK_PACKAGER_TARGET AGENT_UI_DEVICE
    export AGENT_UI_PLATFORM=ios
    export ONTRACK_IOS_SIMULATOR="$name"
    export ONTRACK_IOS_SIMULATOR_UDID="$udid"
    # Simulator always hits loopback Metro (LAN host is for physical devices).
    export PACKAGER_HOST=127.0.0.1

    # Prefer soft reconnect. Hard terminate+relaunch races Expo Fabric
    # (`ExpoFabricView … app context has been lost` / SIGTRAP) when BlurView
    # glass plates remount mid-teardown — that was crash-looping the headed Pro.
    agent_ui_soft_reconnect_dev_client || true
    if ! agent_ui_wait_for_bridge 12; then
      echo "agent-ui: headed handoff bridge quiet — one terminate+relaunch on ${name}" >&2
      xcrun simctl terminate "$udid" "${BUNDLE_ID}" >/dev/null 2>&1 || true
      sleep 0.5
      xcrun simctl launch "$udid" "${BUNDLE_ID}" >/dev/null 2>&1 || true
      agent_ui_soft_reconnect_dev_client || true
      if ! agent_ui_wait_for_bridge 25; then
        echo "agent-ui: headed handoff bridge quiet on ${name} — left after relaunch" >&2
        exit 0
      fi
    fi

    local land=()
    # Never re-run --flow here (travel-demo etc.) — verify already seeded.
    # Handoff only navigates the open viewer onto the asserted route.
    if [[ -n "$route" ]]; then
      land+=(--goto "$route" --wait-route "$route")
    elif [[ -n "$open_alias" ]]; then
      land+=(--open "$open_alias")
    fi
    _="$flow" # accepted from parse; ignored for land (see above)
    if ((${#land[@]} == 0)); then
      exit 0
    fi
    # Soft-fail: handoff must not fail the verify that already passed.
    AGENT_UI_SKIP_LEASE=1 AGENT_UI_USE_POOL=0 \
      "${root}/scripts/agent-ui.sh" once "${land[@]}" >/dev/null 2>&1 \
      || echo "agent-ui: headed handoff land soft-failed on ${name}" >&2
  )
  ios_sim_focus_window_named "$name" || true
  ios_sim_place_window_named "$name" right 2>/dev/null || true
  return 0
}

# Headed Galaxy keep: leave the GUI AVD on the verified surface after close-out.
agent_ui_headed_android_handoff() {
  local route="${1:-}" flow="${2:-}" open_alias="${3:-}"
  local root handoff_budget keep
  [[ "${AGENT_UI_SKIP_HEADED_HANDOFF:-0}" == "1" ]] && return 0
  agent_ui_android_lib 2>/dev/null || return 0
  # want_keep_headed GCs stale android-headed.keep when Galaxy is not headed.
  android_emu_want_keep_headed || android_emu_want_window || return 0

  keep="$(android_emu_headed_keep_name 2>/dev/null || true)"
  [[ -n "$keep" ]] || keep="${ONTRACK_ANDROID_AVD:-Galaxy_S26}"

  # Do not cold-boot / SurfaceView-heal Galaxy just for handoff — that is the
  # multi-minute hang after iOS already passed (ensure_app_surface ≤25s + land).
  # Check readiness BEFORE adopt so we never print "adopting" then "skipped".
  if ! android_emu_avd_is_ready_named "$keep" 2>/dev/null; then
    echo "agent-ui: headed Android handoff skipped (${keep} not ready — not cold-booting; agents stay warm)" >&2
    return 0
  fi
  if ! android_emu_want_window && ! android_emu_avd_is_headed "$keep" 2>/dev/null; then
    # Ready on adb but not a GUI — nothing for the user to watch.
    return 0
  fi

  android_emu_adopt_android_for_headed_host || true

  echo "agent-ui: headed Android handoff → ${ONTRACK_ANDROID_AVD:-Galaxy_S26} (reload + land ${route:-surface})" >&2
  # Never call android_emu_ensure_app_surface here — blank-heal can burn 25s+.

  root="$(agent_ui_repo_root)"
  handoff_budget="${AGENT_UI_HEADED_ANDROID_HANDOFF_SECS:-12}"
  (
    export AGENT_UI_SKIP_LEASE=1
    export AGENT_UI_USE_POOL=0
    export AGENT_UI_LOCK_HELD=1
    export AGENT_UI_LOCK_ACQUIRED=0
    unset AGENT_UI_SLOT AGENT_UI_LOCK_DIR AGENT_UI_POOL_MODE
    export AGENT_UI_PLATFORM=android
    export ONTRACK_ANDROID_AVD="${ONTRACK_ANDROID_AVD:-Galaxy_S26}"
    agent_ui_pin_android_serial || true
    agent_ui_soft_reconnect_dev_client || true
    agent_ui_wait_for_bridge 5 || true

    local land=()
    # Never re-run --flow on handoff (see iOS handoff).
    if [[ -n "$route" ]]; then
      land+=(--goto "$route" --wait-route "$route")
    elif [[ -n "$open_alias" ]]; then
      land+=(--open "$open_alias")
    fi
    _="$flow"
    if ((${#land[@]} == 0)); then
      exit 0
    fi
    # Hard cap — handoff must not block a verify that already passed.
    if command -v gtimeout >/dev/null 2>&1; then
      gtimeout "${handoff_budget}" \
        env AGENT_UI_SKIP_LEASE=1 AGENT_UI_PLATFORM=android \
        "${root}/scripts/agent-ui.sh" once "${land[@]}" >/dev/null 2>&1 \
        || echo "agent-ui: headed Android handoff land soft-failed" >&2
    elif command -v timeout >/dev/null 2>&1; then
      timeout "${handoff_budget}" \
        env AGENT_UI_SKIP_LEASE=1 AGENT_UI_PLATFORM=android \
        "${root}/scripts/agent-ui.sh" once "${land[@]}" >/dev/null 2>&1 \
        || echo "agent-ui: headed Android handoff land soft-failed" >&2
    else
      AGENT_UI_SKIP_LEASE=1 AGENT_UI_PLATFORM=android \
        "${root}/scripts/agent-ui.sh" once "${land[@]}" >/dev/null 2>&1 \
        || echo "agent-ui: headed Android handoff land soft-failed" >&2
    fi
  )
  android_emu_place_window left "${ONTRACK_ANDROID_AVD:-Galaxy_S26}" 2>/dev/null || true
  return 0
}

# Android left + iOS right on the main display (headed GUIs only).
agent_ui_arrange_headed_device_windows() {
  agent_ui_ios_lib 2>/dev/null || true
  agent_ui_android_lib 2>/dev/null || true
  if ios_sim_app_running 2>/dev/null; then
    ios_sim_place_window_named "$(ios_sim_viewer_name)" right 2>/dev/null || true
  fi
  if android_emu_want_keep_headed 2>/dev/null || android_emu_want_window 2>/dev/null; then
    android_emu_place_window left "$(android_emu_preferred_name 2>/dev/null || echo Galaxy_S26)" 2>/dev/null || true
  elif pgrep -x qemu-system-aarch64 >/dev/null 2>&1 || pgrep -x qemu-system-x86_64 >/dev/null 2>&1; then
    # Headed qemu may be up without sticky keep yet — still snap left if GUI exists.
    android_emu_place_window left "$(android_emu_preferred_name 2>/dev/null || echo Galaxy_S26)" 2>/dev/null || true
  fi
}

# Entry: sync any open headed viewers after a successful verify close-out.
# Usage: agent_ui_headed_viewer_handoff --route … [--flow …] …
agent_ui_headed_viewer_handoff() {
  [[ "${AGENT_UI_SKIP_HEADED_HANDOFF:-0}" == "1" ]] && return 0
  agent_ui_parse_land_args "$@"
  agent_ui_headed_ios_handoff \
    "${AGENT_UI_LAND_ROUTE:-}" \
    "${AGENT_UI_LAND_FLOW:-}" \
    "${AGENT_UI_LAND_OPEN:-}"
  agent_ui_headed_android_handoff \
    "${AGENT_UI_LAND_ROUTE:-}" \
    "${AGENT_UI_LAND_FLOW:-}" \
    "${AGENT_UI_LAND_OPEN:-}"
  agent_ui_arrange_headed_device_windows || true
  return 0
}

# Auto-lease when sourced by agent-ui CLI entrypoints. Nested children inherit
# AGENT_UI_LOCK_HELD; verify-both sources this first so dual close-out stays atomic.
# Refuse head/tail pipes BEFORE leasing — otherwise Cursor shows a silent
# “Running…” spinner while the pool boots (looks hung for minutes).
agent_ui_refuse_piped_head_tail "agent-ui"
if [[ "${AGENT_UI_SKIP_LEASE:-0}" != "1" ]]; then
  agent_ui_ensure_lease || return 1
fi
