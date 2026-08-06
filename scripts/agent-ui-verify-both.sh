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

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 --route <path> [--flow <name>] [--exists <id>|…]…" >&2
  exit 2
fi

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
  env -u AGENT_UI_PLATFORM -u ONTRACK_PACKAGER_TARGET -u AGENT_UI_DEVICE \
    AGENT_UI_PLATFORM=ios \
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
    "${ROOT}/scripts/agent-ui-route.sh" >/dev/null 2>&1; then
    bash "${ROOT}/scripts/ensure-packager.sh" --start --android || true
  fi
  AGENT_UI_PLATFORM=android \
    "${ROOT}/scripts/agent-ui.sh" verify "${ARGS[@]}"
}

set +e
run_ios
IOS_OK=$?
run_android
ANDROID_OK=$?
set -e

echo "verify-both: ios_exit=${IOS_OK} android_exit=${ANDROID_OK}" >&2
if (( IOS_OK != 0 || ANDROID_OK != 0 )); then
  exit 1
fi
exit 0
