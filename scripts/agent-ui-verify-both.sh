#!/usr/bin/env bash
# Verify the same surface on iOS then Android (required dual-platform close-out).
#
# Usage (same flags as agent-ui-verify / once asserts):
#   ./scripts/agent-ui-verify-both.sh --route /travel/trip-agent-ui-demo --flow travel-demo \
#     --exists travel.planDetail.transportSection
#
# Runs iOS first (clears sticky android pin), then Android with AGENT_UI_PLATFORM=android.
# Ensures Android packager/emulator if needed. Exits non-zero if either side fails.
#
# Env:
#   SKIP_IOS=1 / SKIP_ANDROID=1 — escape hatches (do not use for normal close-out)
#   ONTRACK_ANDROID_AVD / AGENT_UI_DEVICE — android device pin
#   AGENT_UI_SKIP_LEASE=1 — bypass device pool / lease (escape hatch only)
#   AGENT_UI_LOCK_WAIT_SECS — how long to wait for a free pool slot (default 300)
#   AGENT_UI_POOL_MAX — max concurrent agent device slots (default 5)
#
# Agents: do NOT pipe this script through `tail`/`head` — progress is on stderr/stdout
# and pipes buffer until exit (looks hung for minutes). Prefer bare invoke or `tee`.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 --route <path> [--flow <name>] [--exists <id>|…]…" >&2
  exit 2
fi

# Detect the classic silent-wait anti-pattern (stdout piped into head/tail).
if [[ ! -t 1 ]] && [[ -n "${AGENT_UI_WARN_PIPED_TAIL:-1}" ]]; then
  # Best-effort: only warn when our parent cmdline looks like … | tail/head.
  parent_cmd="$(ps -o command= -p "${PPID}" 2>/dev/null || true)"
  if [[ "${parent_cmd}" == *"|"*tail* || "${parent_cmd}" == *"|"*head* ]]; then
    echo "verify-both: warning: stdout is piped through tail/head — progress is buffered until exit. Drop the pipe (or use tee only)." >&2
  fi
fi

# Hold the simulator lease for the whole dual run so another thread cannot
# interleave between iOS and Android (children inherit AGENT_UI_LOCK_HELD).
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

ARGS=("$@")
IOS_OK=0
ANDROID_OK=0

run_ios() {
  if [[ "${SKIP_IOS:-0}" == "1" ]]; then
    echo "verify-both: skipping iOS (SKIP_IOS=1)" >&2
    return 0
  fi
  echo "verify-both: iOS (AGENT_UI_PLATFORM unset → ios)" >&2
  # Clear sticky android pin so default host stamp is ios.
  # Keep lease env so the child does not wait on our lockdir.
  env -u AGENT_UI_PLATFORM -u ONTRACK_PACKAGER_TARGET -u AGENT_UI_DEVICE \
    AGENT_UI_PLATFORM=ios \
    AGENT_UI_LOCK_HELD="${AGENT_UI_LOCK_HELD:-1}" \
    AGENT_UI_LOCK_ACQUIRED=0 \
    AGENT_UI_SLOT="${AGENT_UI_SLOT:-}" \
    AGENT_UI_LOCK_DIR="${AGENT_UI_LOCK_DIR:-}" \
    AGENT_UI_POOL_MODE="${AGENT_UI_POOL_MODE:-}" \
    ONTRACK_IOS_SIMULATOR="${ONTRACK_IOS_SIMULATOR:-}" \
    ONTRACK_IOS_SIMULATOR_UDID="${ONTRACK_IOS_SIMULATOR_UDID:-}" \
    ONTRACK_ANDROID_AVD="${ONTRACK_ANDROID_AVD:-}" \
    "${ROOT}/scripts/agent-ui.sh" verify "${ARGS[@]}"
}

run_android() {
  if [[ "${SKIP_ANDROID:-0}" == "1" ]]; then
    echo "verify-both: skipping Android (SKIP_ANDROID=1)" >&2
    return 0
  fi
  echo "verify-both: Android (AGENT_UI_PLATFORM=android)" >&2

  # Boot + wait for sys.boot_completed before any route/verify work.
  # Mid-boot adb "device" previously raced into verify and failed with route=?.
  # shellcheck source=lib/android-emulator.sh
  source "${ROOT}/scripts/lib/android-emulator.sh"
  echo "verify-both: ensuring Android emulator is up and ready…" >&2
  if ! android_emu_ensure_ready; then
    echo "error: verify-both: Android emulator failed to become ready" >&2
    return 1
  fi

  # Ensure packager/app bridge without killing a healthy Metro. Fail hard —
  # do not proceed to verify when ensure fails (|| true hid dead emulators).
  # After reconnect the app wakes on `/` — force land in verify (no skip).
  #
  # Route HTTP alone is not enough: Galaxy can answer while the pool AVD has
  # no app (route=?). Require the pinned serial's process + a real path.
  local android_force_land=0
  local android_route=""
  local android_bridge_ok=0
  agent_ui_pin_android_serial || true
  # Drop leftover non-agent emulators so their JS bridge cannot spoof status.
  android_emu_shutdown_others "${ONTRACK_ANDROID_SERIAL:-}"
  if agent_ui_bridge_answers; then
    android_bridge_ok=1
    android_route="$(
      AGENT_UI_PLATFORM=android AGENT_UI_SKIP_APP_UP=1 AGENT_UI_SKIP_HEAL=1 WAIT_SECS=3 \
        AGENT_UI_LOCK_HELD="${AGENT_UI_LOCK_HELD:-1}" \
        AGENT_UI_LOCK_ACQUIRED=0 \
        AGENT_UI_SLOT="${AGENT_UI_SLOT:-}" \
        AGENT_UI_LOCK_DIR="${AGENT_UI_LOCK_DIR:-}" \
        AGENT_UI_POOL_MODE="${AGENT_UI_POOL_MODE:-}" \
        ONTRACK_ANDROID_AVD="${ONTRACK_ANDROID_AVD:-}" \
        ONTRACK_ANDROID_SERIAL="${ONTRACK_ANDROID_SERIAL:-}" \
        "${ROOT}/scripts/agent-ui-route.sh" 2>/dev/null || true
    )"
  fi
  if [[ "${android_bridge_ok}" != "1" || -z "${android_route}" || "${android_route}" == "?" ]]; then
    echo "verify-both: Android bridge quiet on ${ONTRACK_ANDROID_AVD:-preferred} — ensuring packager/app…" >&2
    if ! AGENT_UI_SLOT="${AGENT_UI_SLOT:-}" \
      AGENT_UI_POOL_MODE="${AGENT_UI_POOL_MODE:-}" \
      ONTRACK_ANDROID_AVD="${ONTRACK_ANDROID_AVD:-}" \
      ONTRACK_ANDROID_SERIAL="${ONTRACK_ANDROID_SERIAL:-}" \
      bash "${ROOT}/scripts/ensure-packager.sh" --start --android; then
      echo "error: verify-both: Android packager/app not ready" >&2
      return 1
    fi
    android_force_land=1
  elif [[ "${android_route}" == "/" ]]; then
    echo "verify-both: Android on / (cold boot) — will force land before asserts" >&2
    android_force_land=1
  fi
  AGENT_UI_PLATFORM=android \
    AGENT_UI_ANDROID_FORCE_LAND="${android_force_land}" \
    AGENT_UI_LOCK_HELD="${AGENT_UI_LOCK_HELD:-1}" \
    AGENT_UI_LOCK_ACQUIRED=0 \
    AGENT_UI_SLOT="${AGENT_UI_SLOT:-}" \
    AGENT_UI_LOCK_DIR="${AGENT_UI_LOCK_DIR:-}" \
    AGENT_UI_POOL_MODE="${AGENT_UI_POOL_MODE:-}" \
    ONTRACK_ANDROID_AVD="${ONTRACK_ANDROID_AVD:-}" \
    ONTRACK_ANDROID_SERIAL="${ONTRACK_ANDROID_SERIAL:-}" \
    "${ROOT}/scripts/agent-ui.sh" verify "${ARGS[@]}"
}

set +e
run_ios
IOS_OK=$?
run_android
ANDROID_OK=$?
set -e

# Seeds/flows enter an agent Dev Mode sandbox — release it after close-out so
# mock data does not stick on the live account (user-owned Dev Mode is kept).
release_agent_devmode() {
  local platform="$1"
  echo "verify-both: releasing agent Dev Mode on ${platform}" >&2
  if [[ "${platform}" == "android" ]]; then
    AGENT_UI_PLATFORM=android \
      AGENT_UI_LOCK_HELD="${AGENT_UI_LOCK_HELD:-1}" \
      AGENT_UI_LOCK_ACQUIRED=0 \
      "${ROOT}/scripts/agent-ui-devmode.sh" release >/dev/null 2>&1 || true
  else
    env -u AGENT_UI_PLATFORM -u ONTRACK_PACKAGER_TARGET -u AGENT_UI_DEVICE \
      AGENT_UI_PLATFORM=ios \
      AGENT_UI_LOCK_HELD="${AGENT_UI_LOCK_HELD:-1}" \
      AGENT_UI_LOCK_ACQUIRED=0 \
      "${ROOT}/scripts/agent-ui-devmode.sh" release >/dev/null 2>&1 || true
  fi
}

if [[ "${SKIP_IOS:-0}" != "1" ]]; then
  release_agent_devmode ios
fi
if [[ "${SKIP_ANDROID:-0}" != "1" ]]; then
  release_agent_devmode android
fi

echo "verify-both: ios_exit=${IOS_OK} android_exit=${ANDROID_OK}" >&2
if (( IOS_OK != 0 || ANDROID_OK != 0 )); then
  exit 1
fi
exit 0
