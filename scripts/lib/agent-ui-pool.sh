#!/usr/bin/env bash
# Dedicated agent device pool (up to AGENT_UI_POOL_MAX concurrent slots).
#
# Each slot owns:
#   iOS:     "onTrack Agent N"  (simctl device, headless by default)
#   Android: onTrack_Agent_N    (AVD cloned from Galaxy_S26 profile)
#
# Claim a free cold slot (create devices as needed). Already-booted agent
# sims/AVDs are treated as in-use — pick a different slot. If all slots are
# busy, wait until one finishes (AGENT_UI_LOCK_WAIT_SECS). Nested children
# inherit AGENT_UI_SLOT + AGENT_UI_LOCK_HELD.
#
# Opt out: AGENT_UI_SKIP_LEASE=1 or AGENT_UI_USE_POOL=0 (legacy single device /
# explicit ONTRACK_* pins without pool naming).

: "${AGENT_UI_POOL_MAX:=5}"
: "${AGENT_UI_LOCK_WAIT_SECS:=300}"
: "${AGENT_UI_USE_POOL:=1}"
: "${BUNDLE_ID:=com.imtihoss.ontracknow}"

# Resolve repo root without requiring agent-ui-host.sh (ensure-packager sources
# this file alone when cloning onto a fresh pool slot).
agent_ui_pool_repo_root() {
  if declare -F agent_ui_repo_root >/dev/null 2>&1; then
    agent_ui_repo_root
    return 0
  fi
  if [[ -n "${AGENT_UI_ROOT:-}" && -f "${AGENT_UI_ROOT}/scripts/ensure-packager.sh" ]]; then
    printf '%s\n' "${AGENT_UI_ROOT}"
    return 0
  fi
  if [[ -n "${ROOT:-}" && -f "${ROOT}/scripts/ensure-packager.sh" ]]; then
    printf '%s\n' "${ROOT}"
    return 0
  fi
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  printf '%s\n' "$here"
}

agent_ui_pool_max() {
  local n="${AGENT_UI_POOL_MAX:-5}"
  if [[ "$n" =~ ^[1-9][0-9]*$ ]] && (( n <= 32 )); then
    printf '%s' "$n"
  else
    printf '5'
  fi
}

agent_ui_pool_root() {
  if [[ -n "${AGENT_UI_POOL_DIR:-}" ]]; then
    printf '%s\n' "${AGENT_UI_POOL_DIR}"
    return 0
  fi
  printf '%s\n' "$(agent_ui_pool_repo_root)/.cursor/agent-ui-slots"
}

agent_ui_pool_ios_name() {
  printf 'onTrack Agent %s' "$1"
}

agent_ui_pool_android_name() {
  printf 'onTrack_Agent_%s' "$1"
}

agent_ui_pool_want() {
  case "${AGENT_UI_USE_POOL:-1}" in
    0|false|FALSE|no|NO) return 1 ;;
    *) return 0 ;;
  esac
}

# Resolve / create the iOS sim for a slot; export ONTRACK_IOS_SIMULATOR(+_UDID).
agent_ui_pool_bind_ios() {
  local slot="$1" name udid root
  name="$(agent_ui_pool_ios_name "$slot")"
  export ONTRACK_IOS_SIMULATOR="$name"
  root="$(agent_ui_pool_repo_root)"
  # shellcheck disable=SC1091
  source "${root}/scripts/lib/ios-simulator.sh"
  ios_sim_ensure_device_exists || return 1
  if ! udid="$(ios_sim_resolve_udid)"; then
    echo "error: could not resolve agent pool iOS device '${name}'" >&2
    return 1
  fi
  export ONTRACK_IOS_SIMULATOR_UDID="$udid"
  export AGENT_UI_POOL_MODE=1
  # Pre-approve before the slot boots so openurl never shows "Open in …?".
  ios_sim_approve_url_schemes "$udid" >/dev/null || true
}

# Point Android env at the slot AVD (create lazily on ensure_preferred).
agent_ui_pool_bind_android() {
  local slot="$1" name root serial
  name="$(agent_ui_pool_android_name "$slot")"
  export ONTRACK_ANDROID_AVD="$name"
  # Drop a stale serial from a prior AVD (e.g. Galaxy_S26) so preferred_serial
  # re-resolves against onTrack_Agent_N.
  unset ONTRACK_ANDROID_SERIAL ANDROID_SERIAL
  export AGENT_UI_POOL_MODE=1
  root="$(agent_ui_pool_repo_root)"
  # shellcheck disable=SC1091
  source "${root}/scripts/lib/android-emulator.sh"
  android_emu_ensure_agent_avd || return 1
  serial="$(android_emu_preferred_serial || true)"
  if [[ -n "$serial" ]]; then
    export ONTRACK_ANDROID_SERIAL="$serial"
    export ANDROID_SERIAL="$serial"
  fi
}

# Install the app onto a pool Android serial from any emulator that already has it.
agent_ui_pool_clone_android_app() {
  local target_serial="${1:-${ONTRACK_ANDROID_SERIAL:-}}" adb_bin src_serial apk remote root
  root="$(agent_ui_pool_repo_root)"
  # shellcheck disable=SC1091
  source "${root}/scripts/lib/android-emulator.sh"
  adb_bin="$(android_emu_sdk_bin adb)"
  [[ -n "$adb_bin" && -n "$target_serial" ]] || return 1
  if "$adb_bin" -s "$target_serial" shell pm path "$BUNDLE_ID" 2>/dev/null | grep -q "package:"; then
    return 0
  fi
  src_serial="$(
    "$adb_bin" devices 2>/dev/null | awk '/^emulator-[0-9]+[[:space:]]+device/{print $1}' | while read -r serial; do
      [[ "$serial" == "$target_serial" ]] && continue
      if "$adb_bin" -s "$serial" shell pm path "$BUNDLE_ID" 2>/dev/null | grep -q "package:"; then
        printf '%s' "$serial"
        break
      fi
    done
  )"
  if [[ -z "${src_serial:-}" ]]; then
    echo "error: ${BUNDLE_ID} is not installed on any emulator to clone onto agent slot" >&2
    return 1
  fi
  remote="$("$adb_bin" -s "$src_serial" shell pm path "$BUNDLE_ID" 2>/dev/null | tr -d '\r' | head -1 | sed 's/^package://')"
  [[ -n "$remote" ]] || return 1
  apk="$(mktemp -t ontrack-agent-apk).apk"
  if ! "$adb_bin" -s "$src_serial" pull "$remote" "$apk" >/dev/null 2>&1; then
    rm -f "$apk"
    return 1
  fi
  echo "agent-ui: cloning ${BUNDLE_ID} → ${ONTRACK_ANDROID_AVD:-pool} from ${src_serial}" >&2
  "$adb_bin" -s "$target_serial" install -r "$apk" >/dev/null 2>&1
  local rc=$?
  rm -f "$apk"
  return "$rc"
}

# Copy the installed app onto a target iOS UDID from any sim that already has it.
agent_ui_pool_clone_ios_app() {
  local target_udid="$1" source_udid app_path root
  root="$(agent_ui_pool_repo_root)"
  # shellcheck disable=SC1091
  source "${root}/scripts/lib/ios-simulator.sh"
  if ios_simctl_timed get_app_container "$target_udid" "$BUNDLE_ID" data >/dev/null 2>&1; then
    return 0
  fi
  source_udid="$(
    xcrun simctl list devices available -j 2>/dev/null | python3 -c '
import json, sys, subprocess, os
bundle = os.environ.get("BUNDLE_ID", "com.imtihoss.ontracknow")
target = sys.argv[1]
data = json.load(sys.stdin)
for devices in data.get("devices", {}).values():
    for d in devices:
        udid = d.get("udid") or ""
        if not udid or udid == target:
            continue
        try:
            proc = subprocess.run(
                ["xcrun", "simctl", "get_app_container", udid, bundle, "app"],
                capture_output=True, text=True, timeout=10,
            )
        except Exception:
            continue
        path = (proc.stdout or "").strip()
        if proc.returncode == 0 and path:
            print(udid)
            raise SystemExit(0)
raise SystemExit(1)
' "$target_udid"
  )" || true
  if [[ -z "${source_udid:-}" ]]; then
    echo "error: ${BUNDLE_ID} is not installed on any simulator to clone onto agent slot" >&2
    return 1
  fi
  app_path="$(ios_simctl_timed get_app_container "$source_udid" "$BUNDLE_ID" app 2>/dev/null | tr -d '\r')"
  if [[ -z "$app_path" || ! -d "$app_path" ]]; then
    echo "error: could not resolve .app from source simulator ${source_udid}" >&2
    return 1
  fi
  echo "agent-ui: cloning ${BUNDLE_ID} → $(agent_ui_pool_ios_name "${AGENT_UI_SLOT:-?}") from ${source_udid}" >&2
  xcrun simctl install "$target_udid" "$app_path" >/dev/null 2>&1 || {
    echo "error: simctl install failed for ${target_udid}" >&2
    return 1
  }
}

# Apply pool device env for the claimed slot (both platforms named; boot lazily).
# Set AGENT_UI_POOL_BIND_DEVICES=0 to claim the slot lock only (unit tests).
agent_ui_pool_apply_devices() {
  local slot="$1"
  case "${AGENT_UI_POOL_BIND_DEVICES:-1}" in
    0|false|FALSE|no|NO)
      export ONTRACK_IOS_SIMULATOR="$(agent_ui_pool_ios_name "$slot")"
      export ONTRACK_ANDROID_AVD="$(agent_ui_pool_android_name "$slot")"
      export AGENT_UI_POOL_MODE=1
      echo "agent-ui: slot ${slot} claimed (device bind skipped)" >&2
      return 0
      ;;
  esac
  agent_ui_pool_bind_ios "$slot" || return 1
  agent_ui_pool_bind_android "$slot" || return 1
  # Keep agent windows off-screen if the user has Simulator.app open / reopens it.
  # shellcheck disable=SC1091
  source "$(agent_ui_pool_repo_root)/scripts/lib/ios-simulator.sh"
  ios_sim_enforce_agent_headless_gui || true
  echo "agent-ui: slot ${slot} → iOS '${ONTRACK_IOS_SIMULATOR}' (${ONTRACK_IOS_SIMULATOR_UDID}) / Android AVD '${ONTRACK_ANDROID_AVD}'" >&2
}

agent_ui_pool_slot_lockdir() {
  printf '%s/%s.lockdir' "$(agent_ui_pool_root)" "$1"
}

# True when this slot's iOS agent sim is Booted and/or its Android AVD is on adb.
# Already-up pool devices are treated as in-use (even without a lockdir) so a
# new agent claims a different cold slot instead of hijacking a running one.
# BIND_DEVICES=0 (unit tests) → always "not up".
agent_ui_pool_slot_devices_up() {
  local slot="$1" ios_name android_name root serial
  case "${AGENT_UI_POOL_BIND_DEVICES:-1}" in
    0|false|FALSE|no|NO) return 1 ;;
  esac
  [[ -n "$slot" && "$slot" =~ ^[1-9][0-9]*$ ]] || return 1

  ios_name="$(agent_ui_pool_ios_name "$slot")"
  if xcrun simctl list devices booted -j 2>/dev/null | python3 -c '
import json, sys
name = sys.argv[1]
try:
    data = json.load(sys.stdin)
except Exception:
    raise SystemExit(1)
for devices in data.get("devices", {}).values():
    for d in devices:
        if d.get("name") == name and d.get("state") == "Booted":
            raise SystemExit(0)
raise SystemExit(1)
' "$ios_name" >/dev/null 2>&1; then
    return 0
  fi

  android_name="$(agent_ui_pool_android_name "$slot")"
  root="$(agent_ui_pool_repo_root)"
  # shellcheck disable=SC1091
  source "${root}/scripts/lib/android-emulator.sh"
  serial="$(
    ONTRACK_ANDROID_AVD="$android_name" ONTRACK_ANDROID_SERIAL= android_emu_preferred_serial || true
  )"
  [[ -n "${serial:-}" ]]
}

# Try to exclusive-claim slot's lockdir. When allow_busy_devices=0 (default),
# release immediately if the slot's sim/AVD is already running.
# Returns 0 and sets AGENT_UI_POOL_CLAIM_SLOT / AGENT_UI_POOL_CLAIM_LOCKDIR.
agent_ui_pool_try_claim_slot() {
  local want="$1"
  local allow_busy="${2:-0}"
  local lockdir owner
  lockdir="$(agent_ui_pool_slot_lockdir "$want")"

  if mkdir "${lockdir}" 2>/dev/null; then
    :
  elif [[ "$(cat "${lockdir}/pid" 2>/dev/null || true)" == "$$" ]]; then
    # Already ours (nested / re-entry) — devices may be Booted; keep the claim.
    AGENT_UI_POOL_CLAIM_SLOT="$want"
    AGENT_UI_POOL_CLAIM_LOCKDIR="$lockdir"
    return 0
  else
    owner="$(cat "${lockdir}/pid" 2>/dev/null || true)"
    if [[ -n "${owner}" ]] && ! kill -0 "${owner}" 2>/dev/null; then
      echo "agent-ui: clearing stale pool slot ${want} (pid ${owner} gone)" >&2
      rm -rf "${lockdir}"
      mkdir "${lockdir}" 2>/dev/null || return 1
    else
      return 1
    fi
  fi

  if [[ "$allow_busy" != "1" ]] && agent_ui_pool_slot_devices_up "$want"; then
    echo "agent-ui: slot ${want} devices already up — skipping (likely in use)" >&2
    rm -rf "${lockdir}" 2>/dev/null || true
    return 1
  fi

  AGENT_UI_POOL_CLAIM_SLOT="$want"
  AGENT_UI_POOL_CLAIM_LOCKDIR="$lockdir"
  return 0
}

# Shut down this slot's iOS sim + Android AVD when the lease ends.
# Escape: AGENT_UI_KEEP_DEVICES=1 (debug). Skipped when BIND_DEVICES=0 (unit tests).
agent_ui_pool_shutdown_slot() {
  local slot="${1:-${AGENT_UI_SLOT:-}}" ios_name android_name
  case "${AGENT_UI_KEEP_DEVICES:-0}" in
    1|true|TRUE|yes|YES) return 0 ;;
  esac
  case "${AGENT_UI_POOL_BIND_DEVICES:-1}" in
    0|false|FALSE|no|NO) return 0 ;;
  esac
  [[ -n "$slot" && "$slot" =~ ^[1-9][0-9]*$ ]] || return 0

  ios_name="$(agent_ui_pool_ios_name "$slot")"
  android_name="$(agent_ui_pool_android_name "$slot")"
  echo "agent-ui: releasing slot ${slot} — shutting down '${ios_name}' / '${android_name}'" >&2

  # shellcheck disable=SC1091
  source "$(agent_ui_pool_repo_root)/scripts/lib/ios-simulator.sh"
  ios_sim_shutdown_agent_named "$ios_name" || true

  # shellcheck disable=SC1091
  source "$(agent_ui_pool_repo_root)/scripts/lib/android-emulator.sh"
  android_emu_shutdown_named "$android_name" || true
}

agent_ui_release_lease() {
  if [[ "${AGENT_UI_LOCK_ACQUIRED:-0}" != "1" ]]; then
    return 0
  fi
  local lockdir owner slot
  lockdir="${AGENT_UI_LOCK_DIR:-}"
  slot="${AGENT_UI_SLOT:-}"
  if [[ -z "$lockdir" ]]; then
    AGENT_UI_LOCK_ACQUIRED=0
    AGENT_UI_LOCK_HELD=0
    export AGENT_UI_LOCK_ACQUIRED AGENT_UI_LOCK_HELD
    return 0
  fi
  owner="$(cat "${lockdir}/pid" 2>/dev/null || true)"
  if [[ "${owner}" == "$$" ]]; then
    # Done with the slot — always close the agent devices (not the user's headed sims).
    agent_ui_pool_shutdown_slot "$slot" || true
    rm -rf "${lockdir}" 2>/dev/null || true
  fi
  AGENT_UI_LOCK_ACQUIRED=0
  AGENT_UI_LOCK_HELD=0
  export AGENT_UI_LOCK_ACQUIRED AGENT_UI_LOCK_HELD
}

# Claim a free pool slot (or wait). Sets AGENT_UI_SLOT + device env + lease flags.
# Escape: AGENT_UI_SKIP_LEASE=1. Disable pool: AGENT_UI_USE_POOL=0 (single legacy lock).
agent_ui_ensure_lease() {
  if [[ "${AGENT_UI_SKIP_LEASE:-0}" == "1" ]]; then
    return 0
  fi

  # Nested child inherits the parent's slot + lease.
  if [[ "${AGENT_UI_LOCK_HELD:-0}" == "1" && -n "${AGENT_UI_SLOT:-}" ]]; then
    local lockdir owner
    lockdir="${AGENT_UI_LOCK_DIR:-$(agent_ui_pool_slot_lockdir "$AGENT_UI_SLOT")}"
    owner="$(cat "${lockdir}/pid" 2>/dev/null || true)"
    if [[ "${AGENT_UI_LOCK_ACQUIRED:-0}" == "1" || "${owner}" == "$$" ]]; then
      AGENT_UI_LOCK_ACQUIRED=1
      AGENT_UI_LOCK_HELD=1
      export AGENT_UI_LOCK_ACQUIRED AGENT_UI_LOCK_HELD AGENT_UI_LOCK_DIR="$lockdir"
      trap 'agent_ui_release_lease' EXIT
    fi
    # Re-export device pins for children that cleared env.
    if agent_ui_pool_want && [[ -n "${AGENT_UI_SLOT:-}" ]]; then
      agent_ui_pool_apply_devices "$AGENT_UI_SLOT" || true
    fi
    return 0
  fi

  if ! agent_ui_pool_want; then
    agent_ui_ensure_legacy_lease
    return $?
  fi

  local max wait_secs deadline last_msg slot lockdir owner claimed=0 orphan=""
  max="$(agent_ui_pool_max)"
  mkdir -p "$(agent_ui_pool_root)"
  wait_secs="${AGENT_UI_LOCK_WAIT_SECS:-300}"
  deadline=$((SECONDS + wait_secs))
  last_msg=-999
  unset AGENT_UI_POOL_CLAIM_SLOT AGENT_UI_POOL_CLAIM_LOCKDIR

  # Preferred slot pin (parent / explicit) — still skip if devices already up.
  if [[ -n "${AGENT_UI_SLOT:-}" && "${AGENT_UI_SLOT}" =~ ^[1-9][0-9]*$ ]] && (( AGENT_UI_SLOT <= max )); then
    if agent_ui_pool_try_claim_slot "$AGENT_UI_SLOT" 0; then
      claimed=1
      slot="$AGENT_UI_POOL_CLAIM_SLOT"
      lockdir="$AGENT_UI_POOL_CLAIM_LOCKDIR"
    fi
  fi

  while (( claimed == 0 && SECONDS < deadline )); do
    orphan=""
    # Prefer cold free slots (lock free + devices not running).
    for ((slot = 1; slot <= max; slot++)); do
      if agent_ui_pool_try_claim_slot "$slot" 0; then
        claimed=1
        slot="$AGENT_UI_POOL_CLAIM_SLOT"
        lockdir="$AGENT_UI_POOL_CLAIM_LOCKDIR"
        break
      fi
      # Remember first lock-free orphan (devices up, no live holder) for fallback.
      if [[ -z "$orphan" ]]; then
        lockdir="$(agent_ui_pool_slot_lockdir "$slot")"
        owner="$(cat "${lockdir}/pid" 2>/dev/null || true)"
        if [[ ! -d "$lockdir" ]] || { [[ -n "${owner}" ]] && ! kill -0 "${owner}" 2>/dev/null; }; then
          if agent_ui_pool_slot_devices_up "$slot"; then
            orphan="$slot"
          fi
        fi
      fi
    done
    # No cold slot: reclaim an orphaned already-up device rather than stall.
    if (( claimed == 0 )) && [[ -n "$orphan" ]]; then
      if agent_ui_pool_try_claim_slot "$orphan" 1; then
        echo "agent-ui: reclaiming slot ${orphan} (devices already up; no cold free slot)" >&2
        claimed=1
        slot="$AGENT_UI_POOL_CLAIM_SLOT"
        lockdir="$AGENT_UI_POOL_CLAIM_LOCKDIR"
      fi
    fi
    if (( claimed == 1 )); then
      break
    fi
    if (( SECONDS - last_msg >= 5 )); then
      echo "agent-ui: waiting for agent device slot (0/${max} free; waited $((SECONDS - (deadline - wait_secs)))s)" >&2
      last_msg=$SECONDS
    fi
    sleep 0.4
  done

  if (( claimed == 0 )); then
    echo "error: all ${max} agent device slots are busy (pool: $(agent_ui_pool_root); waited ${wait_secs}s). Wait for another agent to finish, or AGENT_UI_SKIP_LEASE=1 as escape hatch." >&2
    return 1
  fi

  printf '%s\n' "$$" >"${lockdir}/pid"
  {
    printf 'pid=%s\n' "$$"
    printf 'ppid=%s\n' "${PPID}"
    printf 'slot=%s\n' "$slot"
    printf 'platform=%s\n' "$(agent_ui_platform)"
    printf 'started=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'cmd=%s\n' "${0:-agent-ui}"
  } >"${lockdir}/meta" 2>/dev/null || true

  AGENT_UI_SLOT="$slot"
  AGENT_UI_LOCK_DIR="$lockdir"
  AGENT_UI_LOCK_HELD=1
  AGENT_UI_LOCK_ACQUIRED=1
  export AGENT_UI_SLOT AGENT_UI_LOCK_DIR AGENT_UI_LOCK_HELD AGENT_UI_LOCK_ACQUIRED
  trap 'agent_ui_release_lease' EXIT

  if ! agent_ui_pool_apply_devices "$slot"; then
    agent_ui_release_lease
    return 1
  fi

  echo "agent-ui: acquired device slot ${slot}/${max}" >&2
  return 0
}

# Legacy single exclusive lock (AGENT_UI_USE_POOL=0).
agent_ui_ensure_legacy_lease() {
  local lockdir owner wait_secs deadline last_msg meta_platform meta_started
  lockdir="${AGENT_UI_LOCK_DIR:-$(agent_ui_pool_repo_root)/.cursor/agent-ui.lockdir}"

  if [[ "${AGENT_UI_LOCK_HELD:-0}" == "1" ]]; then
    owner="$(cat "${lockdir}/pid" 2>/dev/null || true)"
    if [[ "${AGENT_UI_LOCK_ACQUIRED:-0}" == "1" || "${owner}" == "$$" ]]; then
      AGENT_UI_LOCK_ACQUIRED=1
      AGENT_UI_LOCK_HELD=1
      export AGENT_UI_LOCK_ACQUIRED AGENT_UI_LOCK_HELD AGENT_UI_LOCK_DIR="$lockdir"
      trap 'agent_ui_release_lease' EXIT
    fi
    return 0
  fi

  mkdir -p "$(dirname "${lockdir}")"
  wait_secs="${AGENT_UI_LOCK_WAIT_SECS:-300}"
  deadline=$((SECONDS + wait_secs))
  last_msg=-999

  while (( SECONDS < deadline )); do
    if mkdir "${lockdir}" 2>/dev/null; then
      printf '%s\n' "$$" >"${lockdir}/pid"
      {
        printf 'pid=%s\n' "$$"
        printf 'ppid=%s\n' "${PPID}"
        printf 'platform=%s\n' "$(agent_ui_platform)"
        printf 'started=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        printf 'cmd=%s\n' "${0:-agent-ui}"
      } >"${lockdir}/meta" 2>/dev/null || true
      AGENT_UI_LOCK_DIR="$lockdir"
      AGENT_UI_LOCK_HELD=1
      AGENT_UI_LOCK_ACQUIRED=1
      export AGENT_UI_LOCK_DIR AGENT_UI_LOCK_HELD AGENT_UI_LOCK_ACQUIRED
      trap 'agent_ui_release_lease' EXIT
      echo "agent-ui: acquired simulator lease (legacy single lock)" >&2
      return 0
    fi

    owner="$(cat "${lockdir}/pid" 2>/dev/null || true)"
    if [[ -n "${owner}" ]] && ! kill -0 "${owner}" 2>/dev/null; then
      echo "agent-ui: clearing stale simulator lease (pid ${owner} gone)" >&2
      rm -rf "${lockdir}"
      continue
    fi
    if [[ "${owner}" == "$$" ]]; then
      AGENT_UI_LOCK_DIR="$lockdir"
      AGENT_UI_LOCK_HELD=1
      AGENT_UI_LOCK_ACQUIRED=1
      export AGENT_UI_LOCK_DIR AGENT_UI_LOCK_HELD AGENT_UI_LOCK_ACQUIRED
      trap 'agent_ui_release_lease' EXIT
      return 0
    fi
    if (( SECONDS - last_msg >= 5 )); then
      meta_platform="$(grep '^platform=' "${lockdir}/meta" 2>/dev/null | cut -d= -f2- || true)"
      meta_started="$(grep '^started=' "${lockdir}/meta" 2>/dev/null | cut -d= -f2- || true)"
      echo "agent-ui: waiting for simulator lease (held by pid ${owner:-?} platform=${meta_platform:-?} since ${meta_started:-?})" >&2
      last_msg=$SECONDS
    fi
    sleep 0.4
  done

  echo "error: another agent holds the simulator lease (lock: ${lockdir}; waited ${wait_secs}s). Serialize UI verify across threads, or AGENT_UI_SKIP_LEASE=1 as escape hatch." >&2
  return 1
}
