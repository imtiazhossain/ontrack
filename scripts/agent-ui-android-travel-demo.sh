#!/usr/bin/env bash
# Android-pinned travel demo once-chain (seed + land + structural assert).
#
# Usage:
#   ./scripts/agent-ui-android-travel-demo.sh
#   ./scripts/agent-ui-android-travel-demo.sh --fixture path/to/confirmation.png
#
# Pins AGENT_UI_PLATFORM=android, ensures Metro + Galaxy_S26, optionally pushes
# a photo-picker fixture, then runs travel-demo verify.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --fixture)
      FIXTURE="${2:-}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

export AGENT_UI_PLATFORM=android
export ONTRACK_PACKAGER_TARGET=android

bash "${ROOT}/scripts/ensure-packager.sh" --start --android

if [[ -n "$FIXTURE" ]]; then
  bash "${ROOT}/scripts/android-push-fixture.sh" "$FIXTURE"
fi

# Prefer verify (skips land when already on route). Flow seed can be heavy on Android.
exec "${ROOT}/scripts/agent-ui.sh" verify \
  --route /travel/trip-agent-ui-demo \
  --flow travel-demo \
  --exists travel.planDetail.transportSection
