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

android_emu_pool_mode() {
  case "${AGENT_UI_POOL_MODE:-0}" in
    1|true|TRUE|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

# Create onTrack_Agent_N AVDs (Galaxy_S26-class) when missing.
android_emu_ensure_agent_avd() {
  local name template="${ONTRACK_ANDROID_AVD_TEMPLATE:-Galaxy_S26}"
  name="$(android_emu_preferred_name)"
  if android_emu_avd_exists; then
    android_emu_ensure_hw_keyboard
    return 0
  fi
  if [[ ! "$name" =~ ^onTrack_Agent_[0-9]+$ ]]; then
    echo "error: no AVD named '${name}' (create it or set ONTRACK_ANDROID_AVD)" >&2
    return 1
  fi

  local sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
  local avdmanager=""
  if [[ -x "${sdk_root}/cmdline-tools/latest/bin/avdmanager" ]]; then
    avdmanager="${sdk_root}/cmdline-tools/latest/bin/avdmanager"
  else
    avdmanager="$(command -v avdmanager 2>/dev/null || true)"
  fi
  if [[ -z "$avdmanager" ]]; then
    # Fallback: clone template AVD config (fresh userdata).
    local home="${ANDROID_AVD_HOME:-$HOME/.android/avd}"
    local src_ini="${home}/${template}.ini"
    local src_avd="${home}/${template}.avd"
    if [[ ! -f "$src_ini" || ! -d "$src_avd" ]]; then
      echo "error: cannot create '${name}' — missing template AVD '${template}' and avdmanager" >&2
      return 1
    fi
    echo "Creating agent AVD ${name} (clone config from ${template})…"
    mkdir -p "${home}/${name}.avd"
    # Copy config only — not userdata (large / stale).
    if [[ -f "${src_avd}/config.ini" ]]; then
      cp "${src_avd}/config.ini" "${home}/${name}.avd/config.ini"
    else
      echo "error: template ${template} has no config.ini" >&2
      return 1
    fi
    # Optional hardware skin bits.
    [[ -f "${src_avd}/hardware-qemu.ini" ]] && cp "${src_avd}/hardware-qemu.ini" "${home}/${name}.avd/" || true
    python3 - "$home" "$name" "$template" <<'PY'
import pathlib, sys
home, name, template = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
ini = home / f"{name}.ini"
ini.write_text(
    f"avd.ini.encoding=UTF-8\n"
    f"path={home / (name + '.avd')}\n"
    f"path.rel=avd/{name}.avd\n"
    f"target=android-36\n",
    encoding="utf-8",
)
conf = home / f"{name}.avd" / "config.ini"
text = conf.read_text(encoding="utf-8")
for old, new in (
    (f"AvdId={template}", f"AvdId={name}"),
    (f"avd.name={template}", f"avd.name={name}"),
    ("avd.id=<build>", f"avd.id={name}"),
    ("avd.name=<build>", f"avd.name={name}"),
):
    text = text.replace(old, new)
conf.write_text(text, encoding="utf-8")
print(f"Cloned AVD config {template} → {name}", file=sys.stderr)
PY
    android_emu_ensure_hw_keyboard
    return 0
  fi

  local pkg="system-images;android-36;google_apis;arm64-v8a"
  echo "Creating agent AVD ${name} (pixel_9_pro_xl / ${pkg})…"
  # non-interactive: no custom hardware profile prompt
  printf 'no\n' | "$avdmanager" create avd -n "$name" -k "$pkg" -d pixel_9_pro_xl --force >/dev/null 2>&1 || {
    echo "error: avdmanager failed to create '${name}'" >&2
    return 1
  }
  # Match Galaxy_S26 display metrics when template config is available.
  local home="${ANDROID_AVD_HOME:-$HOME/.android/avd}"
  local conf="${home}/${name}.avd/config.ini"
  local tmpl="${home}/${template}.avd/config.ini"
  if [[ -f "$conf" && -f "$tmpl" ]]; then
    python3 - "$conf" "$tmpl" <<'PY'
import re, sys
from pathlib import Path
conf, tmpl = Path(sys.argv[1]), Path(sys.argv[2])
text = conf.read_text(encoding="utf-8")
src = tmpl.read_text(encoding="utf-8")
keys = (
    "hw.lcd.width", "hw.lcd.height", "hw.lcd.density",
    "hw.keyboard", "hw.keyboard.charmap", "hw.keyboard.lid",
    "hw.ramSize",
)
for key in keys:
    m = re.search(rf"(?m)^{re.escape(key)}\s*=\s*(.*)$", src)
    if not m:
        continue
    val = m.group(1).strip()
    if re.search(rf"(?m)^{re.escape(key)}\s*=", text):
        text = re.sub(rf"(?m)^{re.escape(key)}\s*=\s*.*$", f"{key}={val}", text, count=1)
    else:
        text = text.rstrip() + f"\n{key}={val}\n"
conf.write_text(text, encoding="utf-8")
PY
  fi
  android_emu_ensure_hw_keyboard
  return 0
}

# True when the preferred AVD is running with `-no-window` / headless qemu.
android_emu_is_headless() {
  local name
  name="$(android_emu_preferred_name)"
  # Match either the headless qemu binary or an emulator cmdline with -no-window.
  if pgrep -lf "qemu-system-.*-headless.*${name}|${name}.*-no-window|-no-window.*${name}" >/dev/null 2>&1; then
    return 0
  fi
  # Fallback: any qemu for this AVD whose argv includes -no-window.
  if pgrep -lf "qemu-system.*-avd[[:space:]]+${name}" 2>/dev/null | grep -q -- '-no-window'; then
    return 0
  fi
  return 1
}

# Soft keyboard visible even with hw.keyboard=yes (needed for keyboard layout hunts).
android_emu_ensure_soft_ime() {
  local serial="${1:-${ONTRACK_ANDROID_SERIAL:-}}"
  local adb_bin
  adb_bin="$(android_emu_sdk_bin adb)"
  [[ -n "$adb_bin" && -n "$serial" ]] || return 0
  "$adb_bin" -s "$serial" shell settings put secure show_ime_with_hard_keyboard 1 >/dev/null 2>&1 || true
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

# Shut down a specific AVD by name (pool agent cleanup). Leaves other AVDs alone.
android_emu_shutdown_named() {
  local name="${1:-}" serial adb_bin
  [[ -n "$name" ]] || return 0
  adb_bin="$(android_emu_sdk_bin adb)"
  [[ -n "$adb_bin" ]] || return 0
  serial="$(
    ONTRACK_ANDROID_AVD="$name" ONTRACK_ANDROID_SERIAL= android_emu_preferred_serial || true
  )"
  if [[ -z "$serial" ]]; then
    return 0
  fi
  echo "Shutting down agent emulator: ${name} (${serial})" >&2
  "$adb_bin" -s "$serial" emu kill >/dev/null 2>&1 || true
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
# No-op in agent pool mode — other slots / headed AVDs must stay up.
android_emu_shutdown_others() {
  local keep_serial="${1:-}" adb_bin serial
  if android_emu_pool_mode; then
    return 0
  fi
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

# Forward emulator loopback → host so advertise-127 Metro / agent-ui work.
# Emulator 127.0.0.1 is the guest, not the Mac — without reverse, DevLauncher
# fails with a host URL error and the agent-ui bridge times out.
# Idempotent. Sets ANDROID_EMU_REVERSE_ADDED=1 when a new mapping was created.
android_emu_ensure_adb_reverse() {
  local metro_port="${METRO_PORT:-8081}"
  local daemon_port="${AGENT_UI_HTTP_PORT:-8191}"
  local list port added=0

  ANDROID_EMU_REVERSE_ADDED=0

  if ! android_emu_adb get-state >/dev/null 2>&1; then
    echo "note: adb device not ready — skip reverse" >&2
    return 1
  fi

  list="$(android_emu_adb reverse --list 2>/dev/null || true)"
  for port in "$metro_port" "$daemon_port"; do
    if printf '%s\n' "$list" | grep -qE "tcp:${port}[[:space:]]+tcp:${port}"; then
      continue
    fi
    if android_emu_adb reverse "tcp:${port}" "tcp:${port}" >/dev/null 2>&1; then
      echo "adb reverse tcp:${port} → host:${port}"
      added=1
    else
      echo "error: adb reverse tcp:${port} failed" >&2
      return 1
    fi
  done

  if [[ "$added" == "1" ]]; then
    ANDROID_EMU_REVERSE_ADDED=1
  else
    echo "adb reverse ok (Metro ${metro_port}, agent-ui ${daemon_port})"
  fi
  return 0
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
    if android_emu_pool_mode || [[ "$name" =~ ^onTrack_Agent_[0-9]+$ ]]; then
      android_emu_ensure_agent_avd || return 1
    else
      echo "error: no AVD named '${name}' (create it or set ONTRACK_ANDROID_AVD)" >&2
      echo "hint: emulator -list-avds" >&2
      return 1
    fi
  fi

  android_emu_ensure_hw_keyboard

  serial="$(android_emu_preferred_serial || true)"
  android_emu_shutdown_others "${serial:-}"

  local want_window=0
  if android_emu_want_window; then
    want_window=1
  fi

  # `--window` must restart a headless instance — reusing it leaves no GUI.
  if [[ -n "$serial" ]] && (( want_window )) && android_emu_is_headless; then
    echo "Restarting ${name} with window (was headless)…"
    "$adb_bin" -s "$serial" emu kill >/dev/null 2>&1 || true
    local kill_deadline=$((SECONDS + 30))
    while (( SECONDS < kill_deadline )); do
      serial="$(android_emu_preferred_serial || true)"
      [[ -z "$serial" ]] && break
      sleep 1
    done
    serial=""
  fi

  if [[ -n "$serial" ]]; then
    if android_emu_wait_boot "$serial"; then
      export ANDROID_SERIAL="$serial"
      export ONTRACK_ANDROID_SERIAL="$serial"
      android_emu_ensure_adb_reverse || true
      if (( want_window )); then
        android_emu_ensure_soft_ime "$serial"
      fi
      echo "Emulator ready: ${name} (${serial})$(android_emu_want_window && echo '' || echo ' (headless)')"
      return 0
    fi
  fi

  log="${ROOT:-.}/.cursor/android-emulator.log"
  mkdir -p "$(dirname "$log")" 2>/dev/null || true
  if (( want_window )); then
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
  android_emu_ensure_adb_reverse || true
  if (( want_window )); then
    android_emu_ensure_soft_ime "$serial"
  fi
  echo "Emulator ready: ${name} (${serial})$(android_emu_want_window && echo '' || echo ' (headless)')"
  return 0
}
