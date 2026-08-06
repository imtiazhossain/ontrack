#!/usr/bin/env bash
# Shared Android Emulator helpers for onTrack agents / packager scripts.
#
# Default AVD: Galaxy_S26 (API 36 Google APIs, flagship phone profile).
# There is no official Samsung skin in the Android SDK — this AVD is a
# Galaxy S26–class device (1440×3120 @ 600dpi, hw.keyboard=yes) based on
# Pixel 9 Pro XL + custom display metrics.
#
# Override with ONTRACK_ANDROID_AVD=IdeaHome_API_35 (or any `emulator -list-avds` name),
# or ONTRACK_ANDROID_SERIAL=emulator-5554 for an exact adb device.
#
# Headless by default: boots with `-no-window` (adb / installs still work).
# Set ONTRACK_ANDROID_EMULATOR_WINDOW=1 to show the emulator GUI (like
# ONTRACK_IOS_SIMULATOR_WINDOW=1 for Simulator.app).

: "${ONTRACK_ANDROID_AVD:=Galaxy_S26}"
: "${ONTRACK_ANDROID_EMULATOR_WINDOW:=0}"
: "${ANDROID_HOME:=${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"

# Repo root when sourced from scripts/; fall back to cwd.
_ONTRACK_ANDROID_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
: "${ROOT:=$(cd "${_ONTRACK_ANDROID_LIB_DIR}/../.." && pwd)}"

android_emu_sdk_bin() {
  local name="$1"
  if [[ -x "${ANDROID_HOME}/emulator/${name}" ]]; then
    printf '%s' "${ANDROID_HOME}/emulator/${name}"
    return 0
  fi
  if [[ -x "${ANDROID_HOME}/platform-tools/${name}" ]]; then
    printf '%s' "${ANDROID_HOME}/platform-tools/${name}"
    return 0
  fi
  command -v "$name" 2>/dev/null || true
}

android_emu_preferred_name() {
  printf '%s' "${ONTRACK_ANDROID_AVD}"
}

android_emu_want_window() {
  case "${ONTRACK_ANDROID_EMULATOR_WINDOW:-0}" in
    1|true|TRUE|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

android_emu_adb() {
  local adb_bin
  adb_bin="$(android_emu_sdk_bin adb)"
  if [[ -z "$adb_bin" ]]; then
    echo "error: adb not found (install Android SDK platform-tools)" >&2
    return 1
  fi
  if [[ -n "${ONTRACK_ANDROID_SERIAL:-}" ]]; then
    "$adb_bin" -s "${ONTRACK_ANDROID_SERIAL}" "$@"
  else
    "$adb_bin" "$@"
  fi
}

# Print adb serial of a running emulator for the preferred AVD, else empty.
android_emu_preferred_serial() {
  local name want avd adb_bin serial
  name="$(android_emu_preferred_name)"
  want="${ONTRACK_ANDROID_SERIAL:-}"
  adb_bin="$(android_emu_sdk_bin adb)"
  [[ -n "$adb_bin" ]] || return 0

  if [[ -n "$want" ]]; then
    if "$adb_bin" -s "$want" get-state >/dev/null 2>&1; then
      printf '%s' "$want"
    fi
    return 0
  fi

  while IFS= read -r serial; do
    [[ -z "$serial" || "$serial" == "List"* ]] && continue
    avd="$("$adb_bin" -s "$serial" emu avd name 2>/dev/null | tr -d '\r' | head -1 || true)"
    # Some images print "OK" on a second line — take first non-OK token.
    avd="$(printf '%s\n' "$avd" | awk 'NF && $0!="OK"{print; exit}')"
    if [[ "$avd" == "$name" ]]; then
      printf '%s' "$serial"
      return 0
    fi
  done < <("$adb_bin" devices 2>/dev/null | awk '/^emulator-[0-9]+[[:space:]]+device/{print $1}')
}

android_emu_avd_exists() {
  local name emu_bin
  name="$(android_emu_preferred_name)"
  emu_bin="$(android_emu_sdk_bin emulator)"
  [[ -n "$emu_bin" ]] || return 1
  "$emu_bin" -list-avds 2>/dev/null | grep -qx "$name"
}

# Path to the preferred AVD config.ini (empty if missing).
android_emu_avd_config_ini() {
  local name="$1"
  local home="${ANDROID_AVD_HOME:-$HOME/.android/avd}"
  local conf="${home}/${name}.avd/config.ini"
  if [[ -f "$conf" ]]; then
    printf '%s' "$conf"
    return 0
  fi
  return 1
}

# Ensure hw.keyboard=yes so host typing / adb input reaches EditTexts.
# Safe to call before every boot; no-op when already set.
android_emu_ensure_hw_keyboard() {
  local name conf
  name="$(android_emu_preferred_name)"
  conf="$(android_emu_avd_config_ini "$name" || true)"
  if [[ -z "$conf" || ! -f "$conf" ]]; then
    echo "note: AVD config.ini not found for ${name} — skip hw.keyboard patch" >&2
    return 0
  fi
  if grep -qE '^hw\.keyboard[[:space:]]*=[[:space:]]*yes' "$conf"; then
    return 0
  fi
  if grep -qE '^hw\.keyboard[[:space:]]*=' "$conf"; then
    # macOS sed -i requires backup suffix; write via temp for portability.
    python3 - "$conf" <<'PY'
import re, sys
from pathlib import Path
path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
new, n = re.subn(r"(?m)^hw\.keyboard\s*=\s*.*$", "hw.keyboard = yes", text, count=1)
if n:
    path.write_text(new, encoding="utf-8")
    print(f"Patched hw.keyboard=yes in {path}", file=sys.stderr)
else:
    path.write_text(text.rstrip() + "\nhw.keyboard = yes\n", encoding="utf-8")
    print(f"Appended hw.keyboard=yes to {path}", file=sys.stderr)
PY
  else
    printf '\nhw.keyboard = yes\n' >>"$conf"
    echo "Appended hw.keyboard=yes to ${conf}" >&2
  fi
}

# Set clipboard text on the preferred emulator (Custom Tabs / WebViews may still
# need a long-press Paste — Chrome often ignores automated paste).
android_emu_set_clipboard() {
  local text="${1:-}"
  if [[ -z "$text" ]]; then
    echo "usage: android_emu_set_clipboard <text>" >&2
    return 2
  fi
  # cmd clipboard is API 29+; fall back to service call is flaky — prefer cmd.
  android_emu_adb shell cmd clipboard set --text "$text" >/dev/null 2>&1 \
    || android_emu_adb shell "am broadcast -a clipper.set -e text $(printf '%q' "$text")" >/dev/null 2>&1 \
    || {
      echo "error: could not set clipboard (try long-press Paste in the WebView)" >&2
      return 1
    }
}

# Shut down every running emulator except keep_serial (so adb default device is unique).
android_emu_shutdown_others() {
  local keep_serial="${1:-}" adb_bin serial
  adb_bin="$(android_emu_sdk_bin adb)"
  [[ -n "$adb_bin" ]] || return 0
  while IFS= read -r serial; do
    [[ -z "$serial" || "$serial" == "$keep_serial" ]] && continue
    echo "Shutting down other emulator: ${serial}"
    "$adb_bin" -s "$serial" emu kill >/dev/null 2>&1 || true
  done < <("$adb_bin" devices 2>/dev/null | awk '/^emulator-[0-9]+[[:space:]]+device/{print $1}')
}

android_emu_wait_boot() {
  local serial="$1" deadline=$((SECONDS + 120)) adb_bin boot
  adb_bin="$(android_emu_sdk_bin adb)"
  [[ -n "$adb_bin" ]] || return 1
  "$adb_bin" -s "$serial" wait-for-device >/dev/null 2>&1 || true
  while (( SECONDS < deadline )); do
    boot="$("$adb_bin" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
    if [[ "$boot" == "1" ]]; then
      # Soft keyboard still available when a hardware keyboard is attached.
      "$adb_bin" -s "$serial" shell settings put secure show_ime_with_hard_keyboard 1 >/dev/null 2>&1 || true
      return 0
    fi
    sleep 1
  done
  return 1
}

# Boot the preferred AVD (default: Galaxy_S26). Headless unless WINDOW=1.
# Shutdown other emulators so `adb` / installs target one device.
ensure_preferred_android_emulator() {
  local name serial emu_bin adb_bin log args=()
  name="$(android_emu_preferred_name)"
  emu_bin="$(android_emu_sdk_bin emulator)"
  adb_bin="$(android_emu_sdk_bin adb)"

  if [[ -z "$emu_bin" || -z "$adb_bin" ]]; then
    echo "error: Android SDK emulator/adb not found under ANDROID_HOME=${ANDROID_HOME}" >&2
    return 1
  fi
  if ! android_emu_avd_exists; then
    echo "error: no AVD named '${name}' (create it or set ONTRACK_ANDROID_AVD)" >&2
    echo "hint: emulator -list-avds" >&2
    return 1
  fi

  android_emu_ensure_hw_keyboard

  serial="$(android_emu_preferred_serial || true)"
  android_emu_shutdown_others "${serial:-}"

  if [[ -n "$serial" ]]; then
    if android_emu_wait_boot "$serial"; then
      export ANDROID_SERIAL="$serial"
      export ONTRACK_ANDROID_SERIAL="$serial"
      echo "Emulator ready: ${name} (${serial})$(android_emu_want_window && echo '' || echo ' (headless)')"
      return 0
    fi
  fi

  log="${ROOT:-.}/.cursor/android-emulator.log"
  mkdir -p "$(dirname "$log")" 2>/dev/null || true
  local want_window=0
  if android_emu_want_window; then
    want_window=1
    echo "Booting preferred emulator (window): ${name}"
  else
    echo "Booting preferred emulator (headless): ${name}"
  fi

  # Detach into a new session so Cursor aborting an agent shell does not
  # SIGTERM the emulator. Plain `nohup … &` stays in the agent process group
  # and dies with the terminal (same failure mode as Metro before start_new_session).
  EMU_BIN="$emu_bin" EMU_LOG="$log" EMU_AVD="$name" EMU_WINDOW="$want_window" \
    HOME="$HOME" USER="${USER:-}" TMPDIR="${TMPDIR:-/tmp}" ANDROID_HOME="${ANDROID_HOME}" \
    PATH="$PATH" \
    python3 - <<'PY'
import os, subprocess, sys

emu = os.environ["EMU_BIN"]
log_path = os.environ["EMU_LOG"]
avd = os.environ["EMU_AVD"]
window = os.environ.get("EMU_WINDOW", "0") == "1"
args = [emu, "-avd", avd, "-netdelay", "none", "-netspeed", "full"]
if not window:
    args += ["-no-window", "-no-audio", "-no-boot-anim"]
env = {
    "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
    "HOME": os.environ.get("HOME", ""),
    "USER": os.environ.get("USER", ""),
    "TMPDIR": os.environ.get("TMPDIR", "/tmp"),
    "ANDROID_HOME": os.environ.get("ANDROID_HOME", ""),
    "ANDROID_SDK_ROOT": os.environ.get("ANDROID_HOME", ""),
    "LANG": os.environ.get("LANG", "en_US.UTF-8"),
}
with open(log_path, "ab", buffering=0) as logf:
    subprocess.Popen(
        args,
        stdin=subprocess.DEVNULL,
        stdout=logf,
        stderr=subprocess.STDOUT,
        start_new_session=True,
        env=env,
    )
print("Emulator detached (new session); logs →", log_path, file=sys.stderr)
PY

  # Wait until this AVD appears on adb.
  local deadline=$((SECONDS + 90))
  serial=""
  while (( SECONDS < deadline )); do
    serial="$(android_emu_preferred_serial || true)"
    if [[ -n "$serial" ]]; then
      break
    fi
    sleep 1
  done
  if [[ -z "$serial" ]]; then
    echo "error: timed out waiting for AVD ${name} on adb (log: ${log})" >&2
    return 1
  fi

  android_emu_shutdown_others "$serial"
  if ! android_emu_wait_boot "$serial"; then
    echo "error: timed out booting ${name} (${serial})" >&2
    return 1
  fi

  export ANDROID_SERIAL="$serial"
  export ONTRACK_ANDROID_SERIAL="$serial"
  echo "Emulator ready: ${name} (${serial})$(android_emu_want_window && echo '' || echo ' (headless)')"
  return 0
}
