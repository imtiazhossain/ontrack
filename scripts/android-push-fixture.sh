#!/usr/bin/env bash
# Push an image (or any file) onto the preferred Android emulator and scan it
# into MediaStore so the system photo picker can see it.
#
# Usage:
#   ./scripts/android-push-fixture.sh path/to/image.png
#   ./scripts/android-push-fixture.sh path/to/image.png Download/travel
#
# Env:
#   ONTRACK_ANDROID_AVD / ONTRACK_ANDROID_SERIAL — device pin (see android-emulator.sh)
#
# Destination defaults to /sdcard/Download/<basename>.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/android-emulator.sh
source "$ROOT/scripts/lib/android-emulator.sh"

SRC="${1:-}"
SUBDIR="${2:-Download}"

if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "usage: $0 <local-file> [Download|Pictures/subdir]" >&2
  exit 2
fi

if ! ensure_preferred_android_emulator; then
  exit 1
fi

base="$(basename "$SRC")"
# Normalize subdir (no leading slash).
subdir="${SUBDIR#/}"
dest="/sdcard/${subdir}/${base}"

android_emu_adb shell mkdir -p "/sdcard/${subdir}" >/dev/null
android_emu_adb push "$SRC" "$dest" >/dev/null
# MediaStore scan so Photos / system picker lists the file promptly.
android_emu_adb shell am broadcast \
  -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
  -d "file://${dest}" >/dev/null 2>&1 || true
# Newer APIs prefer media provider scan via content URI — best-effort.
android_emu_adb shell "
  content call --uri content://media/external/file --method scan_file --arg path=${dest}
" >/dev/null 2>&1 || true

echo "Pushed fixture → ${dest}"
echo "ONTRACK_ANDROID_SERIAL=${ONTRACK_ANDROID_SERIAL:-}"
echo "hint: open the in-app photo picker and choose ${base}"
