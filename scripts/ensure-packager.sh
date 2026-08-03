#!/usr/bin/env bash
# Keep Metro + the iOS Simulator dev client connected without needless relaunches.
#
# Default (simulator-friendly):
#   - Prefer packager host 127.0.0.1 (survives Wi-Fi / DHCP IP churn)
#   - Align EXPO_PUBLIC_API_BASE_URL in .env.local when it looks like a local Metro URL
#   - Probe via agent-ui dump; reconnect the dev client ONLY if the probe fails
#   - Never kill Metro; optionally start it if down (--start)
#
# Usage:
#   ./scripts/ensure-packager.sh
#   ./scripts/ensure-packager.sh --start          # start Metro if /status is down
#   ./scripts/ensure-packager.sh --lan            # use en0 LAN IP (physical device)
#   ./scripts/ensure-packager.sh --force-reconnect
#   ./scripts/ensure-packager.sh --check-only
#   ./scripts/ensure-packager.sh --no-env         # skip .env.local sync
#
# Env overrides:
#   PACKAGER_HOST=127.0.0.1|lan|<ip>
#   BUNDLE_ID=com.imtihoss.ontracknow
#   METRO_PORT=8081
#   WAIT_SECS=8

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUNDLE_ID="${BUNDLE_ID:-com.imtihoss.ontracknow}"
METRO_PORT="${METRO_PORT:-8081}"
WAIT_SECS="${WAIT_SECS:-8}"
NODE24_BIN="${NODE24_BIN:-$HOME/.nvm/versions/node/v24.12.0/bin}"

DO_START=0
DO_FORCE=0
CHECK_ONLY=0
SYNC_ENV=1
HOST_MODE="${PACKAGER_HOST:-localhost}"

usage() {
  sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --start) DO_START=1 ;;
    --force-reconnect) DO_FORCE=1 ;;
    --check-only) CHECK_ONLY=1 ;;
    --no-env) SYNC_ENV=0 ;;
    --lan) HOST_MODE="lan" ;;
    --localhost) HOST_MODE="localhost" ;;
    -h|--help) usage ;;
    *)
      echo "error: unknown arg: $1" >&2
      usage
      ;;
  esac
  shift
done

http_ok() {
  local url="$1"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 1 --max-time 2 "$url" || true)"
  [[ "$code" == "200" ]]
}

resolve_lan_ip() {
  ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
}

resolve_host() {
  case "$HOST_MODE" in
    localhost|127.0.0.1|local)
      echo "127.0.0.1"
      ;;
    lan|LAN)
      local ip
      ip="$(resolve_lan_ip)"
      if [[ -z "$ip" ]]; then
        echo "error: could not resolve LAN IP (en0/en1)" >&2
        exit 1
      fi
      echo "$ip"
      ;;
    *)
      echo "$HOST_MODE"
      ;;
  esac
}

ensure_node24_path() {
  if [[ -d "$NODE24_BIN" ]]; then
    export PATH="$NODE24_BIN:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
  fi
}

metro_status_url() {
  echo "http://$1:${METRO_PORT}/status"
}

start_metro_if_needed() {
  local host="$1"
  if http_ok "$(metro_status_url 127.0.0.1)" || http_ok "$(metro_status_url "$host")"; then
    return 0
  fi
  if [[ "$DO_START" != "1" ]]; then
    echo "error: Metro is down on :${METRO_PORT}. Re-run with --start, or: REACT_NATIVE_PACKAGER_HOSTNAME=${host} npm start" >&2
    exit 1
  fi

  ensure_node24_path
  if ! command -v node >/dev/null || [[ "$(node -p "process.versions.node.split('.')[0]")" -ge 25 ]]; then
    echo "error: need Node 24 on PATH to start Metro (see .nvmrc)" >&2
    exit 1
  fi

  echo "Starting Metro on ${host}:${METRO_PORT} (Node $(node -v))…"
  # Detach so this script can continue probing.
  (
    cd "$ROOT"
    export REACT_NATIVE_PACKAGER_HOSTNAME="$host"
    nohup npm start >"$ROOT/.cursor/metro-ensure.log" 2>&1 &
  )
  local deadline=$((SECONDS + 45))
  while (( SECONDS < deadline )); do
    if http_ok "$(metro_status_url 127.0.0.1)" || http_ok "$(metro_status_url "$host")"; then
      echo "Metro is up."
      return 0
    fi
    sleep 0.5
  done
  echo "error: Metro did not become ready; see .cursor/metro-ensure.log" >&2
  exit 1
}

sync_env_local() {
  local host="$1"
  local env_file="$ROOT/.env.local"
  local desired="http://${host}:${METRO_PORT}"

  if [[ "$SYNC_ENV" != "1" ]]; then
    return 0
  fi
  if [[ ! -f "$env_file" ]]; then
    echo "note: no .env.local — skip API base sync"
    return 0
  fi

  python3 - "$env_file" "$desired" <<'PY'
import re, sys
from pathlib import Path

path = Path(sys.argv[1])
desired = sys.argv[2]
text = path.read_text()
# Only rewrite when the current value looks like a local Metro origin.
pattern = re.compile(
    r'^(EXPO_PUBLIC_API_BASE_URL=)(https?://(?:localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?)(\s*)$',
    re.M,
)
match = pattern.search(text)
if not match:
    print("note: EXPO_PUBLIC_API_BASE_URL is missing or not a local Metro URL — left unchanged")
    raise SystemExit(0)
current = match.group(2)
if current == desired:
    print(f"EXPO_PUBLIC_API_BASE_URL already {desired}")
    raise SystemExit(0)
new_text, n = pattern.subn(rf"\g<1>{desired}\g<3>", text, count=1)
if n:
    path.write_text(new_text)
    print(f"Updated EXPO_PUBLIC_API_BASE_URL {current} → {desired}")
else:
    print("note: could not update EXPO_PUBLIC_API_BASE_URL")
PY
}

simulator_booted() {
  xcrun simctl list devices booted 2>/dev/null | grep -q Booted
}

app_installed() {
  xcrun simctl get_app_container booted "$BUNDLE_ID" data >/dev/null 2>&1
}

probe_connected() {
  # Agent-ui dump only succeeds when JS runtime is alive and listening for deep links.
  WAIT_SECS=3 ./scripts/agent-ui-dump.sh >/dev/null 2>&1
}

reconnect_dev_client() {
  local host="$1"
  local encoded
  encoded="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "http://${host}:${METRO_PORT}")"
  local url="exp+ontrack://expo-development-client/?url=${encoded}"

  open -a Simulator >/dev/null 2>&1 || true
  if ! simulator_booted; then
    echo "error: no booted iOS Simulator" >&2
    exit 1
  fi
  if ! app_installed; then
    echo "error: ${BUNDLE_ID} is not installed on the booted simulator" >&2
    exit 1
  fi

  # Soft foreground; avoid terminate/relaunch unless launch is required.
  xcrun simctl launch booted "$BUNDLE_ID" >/dev/null 2>&1 || true
  echo "Reconnecting dev client → http://${host}:${METRO_PORT}"
  xcrun simctl openurl booted "$url"

  local deadline=$((SECONDS + WAIT_SECS + 10))
  while (( SECONDS < deadline )); do
    if probe_connected; then
      echo "Dev client connected (agent-ui dump ok)."
      return 0
    fi
    sleep 0.75
  done
  echo "error: reconnect timed out — check Metro / Simulator launcher" >&2
  exit 1
}

HOST="$(resolve_host)"
echo "Packager host: ${HOST}:${METRO_PORT}"

start_metro_if_needed "$HOST"

LOCAL_OK=0
HOST_OK=0
http_ok "$(metro_status_url 127.0.0.1)" && LOCAL_OK=1
http_ok "$(metro_status_url "$HOST")" && HOST_OK=1
if [[ "$LOCAL_OK" != "1" && "$HOST_OK" != "1" ]]; then
  echo "error: Metro /status is not 200" >&2
  exit 1
fi
echo "Metro /status: localhost=$LOCAL_OK host=$HOST_OK"

sync_env_local "$HOST"

if [[ "$CHECK_ONLY" == "1" ]]; then
  if simulator_booted && app_installed && probe_connected; then
    echo "App probe: connected"
    exit 0
  fi
  echo "App probe: not connected (check-only; not reconnecting)"
  exit 1
fi

if [[ "$DO_FORCE" == "1" ]]; then
  reconnect_dev_client "$HOST"
  exit 0
fi

if ! simulator_booted; then
  echo "note: no booted simulator — Metro is healthy; open Simulator to connect"
  exit 0
fi

if ! app_installed; then
  echo "note: app not installed on booted simulator — Metro is healthy"
  exit 0
fi

if probe_connected; then
  echo "App already connected to packager (no reconnect)."
  exit 0
fi

echo "App not responding to agent-ui dump — reconnecting…"
reconnect_dev_client "$HOST"
