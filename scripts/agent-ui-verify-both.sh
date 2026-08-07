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

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 --route <path> [--flow <name>] [--exists <id>|…]…" >&2
  exit 2
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
  # Ensure emu + packager without killing a healthy Metro.
  if ! AGENT_UI_PLATFORM=android AGENT_UI_SKIP_HEAL=1 WAIT_SECS=3 \
    AGENT_UI_LOCK_HELD="${AGENT_UI_LOCK_HELD:-1}" \
    AGENT_UI_LOCK_ACQUIRED=0 \
    AGENT_UI_SLOT="${AGENT_UI_SLOT:-}" \
    AGENT_UI_LOCK_DIR="${AGENT_UI_LOCK_DIR:-}" \
    AGENT_UI_POOL_MODE="${AGENT_UI_POOL_MODE:-}" \
    ONTRACK_ANDROID_AVD="${ONTRACK_ANDROID_AVD:-}" \
    ONTRACK_ANDROID_SERIAL="${ONTRACK_ANDROID_SERIAL:-}" \
    "${ROOT}/scripts/agent-ui-route.sh" >/dev/null 2>&1; then
    AGENT_UI_SLOT="${AGENT_UI_SLOT:-}" \
      AGENT_UI_POOL_MODE="${AGENT_UI_POOL_MODE:-}" \
      ONTRACK_ANDROID_AVD="${ONTRACK_ANDROID_AVD:-}" \
      bash "${ROOT}/scripts/ensure-packager.sh" --start --android || true
  fi
  AGENT_UI_PLATFORM=android \
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
