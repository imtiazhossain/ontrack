#!/usr/bin/env bash
# Set clipboard text on the preferred Android emulator.
# Usage: ./scripts/android-clipboard.sh "text to paste"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/android-emulator.sh
source "$ROOT/scripts/lib/android-emulator.sh"
TEXT="${1:-}"
if [[ -z "$TEXT" ]]; then
  echo "usage: $0 <text>" >&2
  exit 2
fi
ensure_preferred_android_emulator >/dev/null
android_emu_set_clipboard "$TEXT"
echo "Clipboard set on ${ONTRACK_ANDROID_SERIAL:-device} (${#TEXT} chars)"
echo "note: Custom Tabs / Chrome may still require long-press → Paste"
