#!/usr/bin/env bash
# Build a local Android release APK and replace the shared Google Drive copy.
#
# Usage (from repo root):
#   npm run android:release-to-drive
#   ./scripts/android-release-to-drive.sh
#   ./scripts/android-release-to-drive.sh --upload-only   # reuse existing APK
#   ./scripts/android-release-to-drive.sh --no-upload     # build only
#
# Prerequisites:
#   - JDK 17 (Homebrew openjdk@17)
#   - Android SDK at ~/Library/Android/sdk
#   - rclone remote `gdrive` authorized (see ~/.config/rclone/rclone.conf)
#   - android/ present (expo prebuild / prior local native build)
#
# Drive folder (internal sideload APK):
#   https://drive.google.com/drive/folders/162sjQp7GPhie7MCJMdIAbEXPATmIa1Pa
#
# Notes:
#   - OTA (`npm run update:production`) cannot ship native module changes.
#     Use this script when Kotlin/Java under modules/ (or other native code) changed.
#   - Always deletes existing *.apk in the folder before upload so only one remains.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FOLDER_ID="${ONTRACK_DRIVE_APK_FOLDER_ID:-162sjQp7GPhie7MCJMdIAbEXPATmIa1Pa}"
REMOTE="${ONTRACK_DRIVE_RCLONE_REMOTE:-gdrive}"
APK_NAME="onTrack-android-release.apk"
APK_SRC="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
APK_DEST="$ROOT/$APK_NAME"
JAVA_HOME_DEFAULT="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"

DO_BUILD=1
DO_UPLOAD=1
CLEAN_NATIVE=1

for arg in "$@"; do
  case "$arg" in
    --upload-only) DO_BUILD=0 ;;
    --no-upload) DO_UPLOAD=0 ;;
    --no-clean-native) CLEAN_NATIVE=0 ;;
    -h|--help)
      awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"
      exit 0
      ;;
    *)
      echo "unknown arg: $arg (try --help)" >&2
      exit 2
      ;;
  esac
done

export JAVA_HOME="${JAVA_HOME:-$JAVA_HOME_DEFAULT}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="${JAVA_HOME}/bin:${ANDROID_HOME}/platform-tools:${PATH}"

if [[ ! -d "$JAVA_HOME" ]]; then
  echo "error: JAVA_HOME missing at $JAVA_HOME (install openjdk@17)" >&2
  exit 1
fi
if [[ ! -d "$ROOT/android" ]]; then
  echo "error: android/ missing — run a local native prebuild first" >&2
  exit 1
fi

SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"

if [[ "$DO_BUILD" -eq 1 ]]; then
  echo "==> Building release APK (commit $SHA)"
  cd "$ROOT/android"
  GRADLE_ARGS=()
  if [[ "$CLEAN_NATIVE" -eq 1 ]]; then
    # Local Expo modules under modules/ — clean so Kotlin edits are never stale.
    for mod_dir in "$ROOT"/modules/*/; do
      [[ -d "$mod_dir" ]] || continue
      name="$(basename "$mod_dir")"
      [[ -d "$mod_dir/android" ]] || continue
      GRADLE_ARGS+=(":${name}:clean" ":${name}:compileReleaseKotlin")
    done
  fi
  GRADLE_ARGS+=(":app:assembleRelease")
  ./gradlew --no-daemon "${GRADLE_ARGS[@]}"
  if [[ ! -f "$APK_SRC" ]]; then
    echo "error: expected APK missing: $APK_SRC" >&2
    exit 1
  fi
  cp -f "$APK_SRC" "$APK_DEST"
  echo "Built $(du -h "$APK_DEST" | awk '{print $1}') → $APK_DEST"
else
  if [[ ! -f "$APK_DEST" && -f "$APK_SRC" ]]; then
    cp -f "$APK_SRC" "$APK_DEST"
  fi
  if [[ ! -f "$APK_DEST" ]]; then
    echo "error: no APK at $APK_DEST (run without --upload-only first)" >&2
    exit 1
  fi
fi

if [[ "$DO_UPLOAD" -eq 0 ]]; then
  echo "Skip upload (--no-upload). Local: $APK_DEST"
  exit 0
fi

if ! command -v rclone >/dev/null 2>&1; then
  echo "error: rclone not found" >&2
  exit 1
fi
if [[ ! -f "$HOME/.config/rclone/rclone.conf" ]]; then
  echo "error: missing ~/.config/rclone/rclone.conf (authorize remote '$REMOTE')" >&2
  exit 1
fi

echo "==> Replacing APKs in Drive folder $FOLDER_ID"
rclone delete "${REMOTE}:" \
  --drive-root-folder-id "$FOLDER_ID" \
  --drive-use-trash=false \
  --include "*.apk" \
  -v 2>&1 | grep -v NOTICE || true

rclone copy "$APK_DEST" "${REMOTE}:" \
  --drive-root-folder-id "$FOLDER_ID" \
  --progress \
  --stats 15s \
  -v 2>&1 | grep -v NOTICE

echo "==> Folder contents"
rclone lsl "${REMOTE}:" --drive-root-folder-id "$FOLDER_ID" 2>&1 | grep -v NOTICE
LINK="$(rclone link "${REMOTE}:${APK_NAME}" --drive-root-folder-id "$FOLDER_ID" 2>&1 | grep -v NOTICE | tail -1)"
echo
echo "commit=$SHA"
echo "file=$LINK"
echo "folder=https://drive.google.com/drive/folders/${FOLDER_ID}"
