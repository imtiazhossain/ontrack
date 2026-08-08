#!/usr/bin/env bash
# Boot the preferred Android emulator (default: Galaxy_S26).
#
# Usage:
#   ./scripts/ensure-android-emulator.sh
#   ./scripts/ensure-android-emulator.sh --window
#   ONTRACK_ANDROID_AVD=IdeaHome_API_35 ./scripts/ensure-android-emulator.sh
#
# Env:
#   ONTRACK_ANDROID_AVD=Galaxy_S26
#   ONTRACK_ANDROID_EMULATOR_WINDOW=1   # show emulator GUI (default: headless)
#   ONTRACK_ANDROID_SERIAL=emulator-5554
#   ONTRACK_ANDROID_ENSURE_APP_SURFACE=1  # force paint check even when headless
#   ONTRACK_ANDROID_SKIP_APP_SURFACE=1    # skip headed blank-SurfaceView heal
#   ONTRACK_ANDROID_BLANK_WHITE_PCT=85    # near-white %% threshold for blank detect
#   ONTRACK_ANDROID_SURFACE_WAIT_SECS=25
#
# Headed (--window): before "Emulator ready", launches/relaunches the app after a
# headless→window restart and fails handoff if the SurfaceView stays blank/white.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/android-emulator.sh
source "$ROOT/scripts/lib/android-emulator.sh"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --window) ONTRACK_ANDROID_EMULATOR_WINDOW=1 ;;
    -h|--help)
      sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
  shift
done

ensure_preferred_android_emulator
SERIAL="${ONTRACK_ANDROID_SERIAL:-$(android_emu_preferred_serial || true)}"
if [[ -n "$SERIAL" ]]; then
  mkdir -p "$ROOT/.cursor"
  printf '%s\n' "$SERIAL" >"$ROOT/.cursor/android-emulator.serial"
  echo "ONTRACK_ANDROID_SERIAL=${SERIAL}"
fi
