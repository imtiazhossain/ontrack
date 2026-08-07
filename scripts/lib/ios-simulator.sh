#!/usr/bin/env bash
# Shared iOS Simulator helpers for onTrack agents / packager scripts.
#
# Default device: "onTrack iPhone 17 Pro" (iPhone 17 Pro hardware, latest iOS runtime).
# Override with ONTRACK_IOS_SIMULATOR="<name>" (any simctl device name),
# or ONTRACK_IOS_SIMULATOR_UDID=<udid> for an exact device.
#
# Headless by default: `simctl boot` runs the device without Simulator.app.
# Agent-ui dump/tap/assert/screenshot (`simctl io`) all work without a window.
# Set ONTRACK_IOS_SIMULATOR_WINDOW=1 to also open Simulator.app for a visual view.
#
# If opening the GUI: never bare `open -a Simulator` before the preferred device
# is the only Booted sim — that restores a multi-device layout (e.g. iPhone 17
# beside iPhone 17 Pro).

: "${ONTRACK_IOS_SIMULATOR:=onTrack iPhone 17 Pro}"
: "${ONTRACK_IOS_SIMULATOR_DEVICE_TYPE:=com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro}"
: "${ONTRACK_IOS_SIMULATOR_WINDOW:=0}"

ios_sim_preferred_name() {
  printf '%s' "${ONTRACK_IOS_SIMULATOR}"
}

ios_sim_want_window() {
  case "${ONTRACK_IOS_SIMULATOR_WINDOW:-0}" in
    1|true|TRUE|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

# Print identifier of the newest available iOS Simulator runtime (e.g. iOS-26-5).
ios_sim_latest_ios_runtime() {
  xcrun simctl list runtimes available -j 2>/dev/null | python3 -c '
import json, re, sys

data = json.load(sys.stdin)
best = None  # (major, minor, patch, identifier)

for runtime in data.get("runtimes", []):
    if runtime.get("isAvailable") is False:
        continue
    ident = runtime.get("identifier") or ""
    if "SimRuntime.iOS-" not in ident:
        continue
    version = str(runtime.get("version") or "")
    nums = [int(x) for x in re.findall(r"\d+", version)]
    while len(nums) < 3:
        nums.append(0)
    key = (nums[0], nums[1], nums[2], ident)
    if best is None or key[:3] > best[:3] or (key[:3] == best[:3] and ident > best[3]):
        best = key

if not best:
    raise SystemExit(1)
print(best[3])
'
}

# Create the preferred device on the latest iOS runtime when missing.
# No-op when ONTRACK_IOS_SIMULATOR_UDID is set (exact device) or the name already exists.
ios_sim_ensure_device_exists() {
  local name want_udid runtime udid device_type
  name="$(ios_sim_preferred_name)"
  want_udid="${ONTRACK_IOS_SIMULATOR_UDID:-}"
  if [[ -n "$want_udid" ]]; then
    return 0
  fi

  if xcrun simctl list devices available -j 2>/dev/null | python3 -c '
import json, sys
name = sys.argv[1]
data = json.load(sys.stdin)
for devices in data.get("devices", {}).values():
    for d in devices:
        if d.get("name") == name and d.get("isAvailable") is not False:
            raise SystemExit(0)
raise SystemExit(1)
' "$name"; then
    return 0
  fi

  if ! runtime="$(ios_sim_latest_ios_runtime)"; then
    echo "error: no available iOS Simulator runtime to create '${name}'" >&2
    return 1
  fi

  device_type="${ONTRACK_IOS_SIMULATOR_DEVICE_TYPE}"
  echo "Creating preferred simulator: ${name} (${device_type} @ ${runtime})"
  if ! udid="$(xcrun simctl create "$name" "$device_type" "$runtime")"; then
    echo "error: failed to create simulator '${name}'" >&2
    return 1
  fi
  echo "Created simulator ${name} (${udid})"
}

# Print UDID of the preferred device if it is already Booted; else empty.
ios_sim_preferred_booted_udid() {
  local name want_udid
  name="$(ios_sim_preferred_name)"
  want_udid="${ONTRACK_IOS_SIMULATOR_UDID:-}"
  xcrun simctl list devices booted -j 2>/dev/null | python3 -c '
import json, sys
name = sys.argv[1]
want = sys.argv[2]
data = json.load(sys.stdin)
for devices in data.get("devices", {}).values():
    for d in devices:
        if d.get("state") != "Booted":
            continue
        if want and d.get("udid") == want:
            print(d["udid"])
            raise SystemExit(0)
        if not want and d.get("name") == name:
            print(d["udid"])
            raise SystemExit(0)
' "$name" "$want_udid" 2>/dev/null || true
}

# Resolve an available UDID for the preferred simulator name.
# Prefers: explicit UDID → already-booted match → newest available runtime.
ios_sim_resolve_udid() {
  local name want_udid
  name="$(ios_sim_preferred_name)"
  want_udid="${ONTRACK_IOS_SIMULATOR_UDID:-}"
  if [[ -n "$want_udid" ]]; then
    printf '%s' "$want_udid"
    return 0
  fi
  ios_sim_ensure_device_exists || return 1
  xcrun simctl list devices available -j 2>/dev/null | python3 -c '
import json, re, sys

name = sys.argv[1]
data = json.load(sys.stdin)
booted = []
available = []

def runtime_key(runtime: str):
    # com.apple.CoreSimulator.SimRuntime.iOS-26-5 → (26, 5, 0)
    m = re.search(r"iOS-(\d+)(?:-(\d+))?(?:-(\d+))?", runtime)
    if not m:
        return (0, 0, 0, runtime)
    nums = [int(x) if x else 0 for x in m.groups()]
    while len(nums) < 3:
        nums.append(0)
    return (nums[0], nums[1], nums[2], runtime)

items = list(data.get("devices", {}).items())
for runtime, devices in items:
    for d in devices:
        if d.get("name") != name:
            continue
        if d.get("isAvailable") is False:
            continue
        entry = (runtime_key(runtime), d["udid"], d.get("state"))
        available.append(entry)
        if d.get("state") == "Booted":
            booted.append(entry)

if booted:
    booted.sort()
    print(booted[-1][1])
    raise SystemExit(0)
if not available:
    raise SystemExit(1)
available.sort()
print(available[-1][1])
' "$name"
}

# Shut down every Booted device except keep_udid (so `simctl … booted` is unique).
ios_sim_shutdown_others() {
  local keep_udid="$1" other
  while IFS= read -r other; do
    [[ -z "$other" || "$other" == "$keep_udid" ]] && continue
    echo "Shutting down other simulator: ${other}"
    xcrun simctl shutdown "$other" >/dev/null 2>&1 || true
  done < <(xcrun simctl list devices booted -j 2>/dev/null | python3 -c '
import json, sys
data = json.load(sys.stdin)
for devices in data.get("devices", {}).values():
    for d in devices:
        if d.get("state") == "Booted":
            print(d["udid"])
' 2>/dev/null || true)
}

# Opt-in: open Simulator.app focused on one UDID (not used for headless verify).
ios_sim_open_focused() {
  local udid="$1"
  defaults write com.apple.iphonesimulator CurrentDeviceUDID "$udid" >/dev/null 2>&1 || true
  # Already running: do not re-open — that restores peer device windows.
  if pgrep -x Simulator >/dev/null 2>&1; then
    return 0
  fi
  open -a Simulator --args -CurrentDeviceUDID "$udid" >/dev/null 2>&1 \
    || open -a Simulator >/dev/null 2>&1 \
    || true
}

# After Simulator.app opens it may briefly re-boot peers from saved windows.
ios_sim_prune_peers_briefly() {
  local keep_udid="$1"
  local settle=$((SECONDS + 3))
  while (( SECONDS < settle )); do
    ios_sim_shutdown_others "$keep_udid"
    sleep 0.35
  done
  ios_sim_shutdown_others "$keep_udid"
}

# Boot the preferred simulator (default: onTrack iPhone 17 Pro) via simctl — headless.
# Does not open Simulator.app unless ONTRACK_IOS_SIMULATOR_WINDOW=1.
# Shutdown other booted devices so `simctl … booted` is unambiguous.
ensure_preferred_ios_simulator() {
  local name udid already opened=0
  name="$(ios_sim_preferred_name)"

  if ! udid="$(ios_sim_resolve_udid)"; then
    echo "error: no available simulator named '${name}' (set ONTRACK_IOS_SIMULATOR or ONTRACK_IOS_SIMULATOR_UDID)" >&2
    return 1
  fi

  ios_sim_shutdown_others "$udid"

  already="$(ios_sim_preferred_booted_udid || true)"
  if [[ -z "$already" ]]; then
    echo "Booting preferred simulator (headless): ${name} (${udid})"
    xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  fi

  if ios_sim_want_window; then
    if ! pgrep -x Simulator >/dev/null 2>&1; then
      opened=1
    fi
    echo "Opening Simulator.app window (ONTRACK_IOS_SIMULATOR_WINDOW=1)"
    ios_sim_open_focused "$udid"
  fi

  local deadline=$((SECONDS + 60))
  while (( SECONDS < deadline )); do
    if xcrun simctl list devices booted 2>/dev/null | grep -q "$udid"; then
      ios_sim_shutdown_others "$udid"
      if [[ "$opened" == "1" ]]; then
        ios_sim_prune_peers_briefly "$udid"
      else
        ios_sim_shutdown_others "$udid"
      fi
      echo "Simulator ready: ${name}$(ios_sim_want_window && echo '' || echo ' (headless)')"
      return 0
    fi
    sleep 0.5
  done
  echo "error: timed out booting ${name} (${udid})" >&2
  return 1
}
