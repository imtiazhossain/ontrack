#!/usr/bin/env bash
# Shared iOS Simulator helpers for onTrack agents / packager scripts.
#
# Default device: iPhone 17 Pro
# Override with ONTRACK_IOS_SIMULATOR="iPhone 16 Pro" (or any simctl device name),
# or ONTRACK_IOS_SIMULATOR_UDID=<udid> for an exact device.

: "${ONTRACK_IOS_SIMULATOR:=iPhone 17 Pro}"

ios_sim_preferred_name() {
  printf '%s' "${ONTRACK_IOS_SIMULATOR}"
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
  xcrun simctl list devices available -j 2>/dev/null | python3 -c '
import json, sys
name = sys.argv[1]
data = json.load(sys.stdin)
booted = []
available = []
# Runtimes are keyed like "com.apple.CoreSimulator.SimRuntime.iOS-26-2"
# Iterate in reverse insertion order so newer runtimes win when tied.
items = list(data.get("devices", {}).items())
for runtime, devices in items:
    for d in devices:
        if d.get("name") != name:
            continue
        if d.get("isAvailable") is False:
            continue
        entry = (runtime, d["udid"], d.get("state"))
        available.append(entry)
        if d.get("state") == "Booted":
            booted.append(entry)
if booted:
    print(booted[-1][1])
    raise SystemExit(0)
if not available:
    raise SystemExit(1)
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

# Boot the preferred simulator (default: iPhone 17 Pro). Shutdown other booted
# devices so `simctl … booted` is unambiguous. No-op when already on preferred.
ensure_preferred_ios_simulator() {
  local name udid already
  name="$(ios_sim_preferred_name)"
  already="$(ios_sim_preferred_booted_udid || true)"
  open -a Simulator >/dev/null 2>&1 || true

  if [[ -n "$already" ]]; then
    ios_sim_shutdown_others "$already"
    return 0
  fi

  if ! udid="$(ios_sim_resolve_udid)"; then
    echo "error: no available simulator named '${name}' (set ONTRACK_IOS_SIMULATOR or ONTRACK_IOS_SIMULATOR_UDID)" >&2
    return 1
  fi

  echo "Booting preferred simulator: ${name} (${udid})"
  ios_sim_shutdown_others "$udid"
  xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  open -a Simulator >/dev/null 2>&1 || true

  local deadline=$((SECONDS + 60))
  while (( SECONDS < deadline )); do
    if xcrun simctl list devices booted 2>/dev/null | grep -q "$udid"; then
      # Simulator.app sometimes auto-boots another device when opening — prune again.
      ios_sim_shutdown_others "$udid"
      echo "Simulator ready: ${name}"
      return 0
    fi
    sleep 0.5
  done
  echo "error: timed out booting ${name} (${udid})" >&2
  return 1
}
