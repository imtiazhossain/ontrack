#!/usr/bin/env bash
# Hit-test registered agent-ui frames at a logical (or screenshot-pixel) point.
# Coordinates are for lookup only — tap the returned testID afterward.
#
# Usage:
#   ./scripts/agent-ui-hit.sh 200 480
#   ./scripts/agent-ui-hit.sh --pixel 600 1440          # screenshot pixels → points via dump.screen.scale
#   ./scripts/agent-ui-hit.sh --dump-only 200 480       # reuse existing dump (no bridge op)
#   ./scripts/agent-ui-hit.sh --json 200 480
#   ./scripts/agent-ui-hit.sh --overlay on              # paint ids on screen for screenshots
#   ./scripts/agent-ui-hit.sh --overlay off
#   ./scripts/agent-ui-hit.sh --overlay toggle
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/agent-ui-host.sh
source "${ROOT}/scripts/lib/agent-ui-host.sh"

PIXEL=0
DUMP_ONLY=0
JSON=0
OVERLAY=""
X=""
Y=""

usage() {
  sed -n '2,16p' "$0" | tr -d '#'
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pixel)
      PIXEL=1
      shift
      ;;
    --dump-only)
      DUMP_ONLY=1
      shift
      ;;
    --json)
      JSON=1
      shift
      ;;
    --overlay)
      OVERLAY="${2:-toggle}"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      if [[ -z "${X}" ]]; then
        X="$1"
      elif [[ -z "${Y}" ]]; then
        Y="$1"
      else
        echo "error: unexpected arg: $1" >&2
        usage
      fi
      shift
      ;;
  esac
done

if [[ -n "${OVERLAY}" ]]; then
  agent_ui_ensure_app_up
  agent_ui_apply_wait_budget simple
  STATUS_JSON="$(agent_ui_send_op overlay "${OVERLAY}")"
  if [[ "${JSON}" -eq 1 ]]; then
    printf '%s\n' "${STATUS_JSON}"
  else
    python3 -c 'import json,sys; d=json.loads(sys.argv[1]); print(d.get("detail") or d)' "${STATUS_JSON}"
  fi
  exit 0
fi

if [[ -z "${X}" || -z "${Y}" ]]; then
  usage
fi

agent_ui_ensure_app_up
agent_ui_apply_wait_budget simple

if [[ "${DUMP_ONLY}" -eq 0 ]]; then
  # Fresh dump so frames match the current layout.
  agent_ui_send_op dump >/dev/null
fi

agent_ui_paths

X="${X}" Y="${Y}" PIXEL="${PIXEL}" JSON="${JSON}" ROOT="${ROOT}" \
DUMP_PATH="${AGENT_UI_DUMP_PATH}" \
python3 - <<'PY'
import json, os, sys
from pathlib import Path

root = Path(os.environ["ROOT"])
sys.path.insert(0, str(root / "scripts/lib"))
from agent_ui_sources import lookup_id  # type: ignore

dump_path = Path(os.environ["DUMP_PATH"])
if not dump_path.is_file():
    print("error: missing dump — run without --dump-only first", file=sys.stderr)
    raise SystemExit(1)

data = json.loads(dump_path.read_text())
screen = data.get("screen") or {}
scale = float(screen.get("scale") or 1) or 1.0
x = float(os.environ["X"])
y = float(os.environ["Y"])
if os.environ.get("PIXEL") == "1":
    x /= scale
    y /= scale

def area(frame):
    return max(0.0, float(frame.get("width") or 0)) * max(0.0, float(frame.get("height") or 0))

def contains(frame, px, py):
    fx = float(frame.get("x") or 0)
    fy = float(frame.get("y") or 0)
    fw = float(frame.get("width") or 0)
    fh = float(frame.get("height") or 0)
    return fx <= px <= fx + fw and fy <= py <= fy + fh

hits = []
for el in data.get("elements") or []:
    frame = el.get("frame")
    if not isinstance(frame, dict):
        continue
    if contains(frame, x, y):
        hits.append(el)

hits.sort(key=lambda e: (area(e["frame"]), -len(str(e.get("testID") or ""))))

top = hits[0] if hits else None
source = lookup_id(root, top["testID"]) if top else None

out = {
    "ok": bool(top),
    "x": x,
    "y": y,
    "route": data.get("route"),
    "screen": screen,
    "element": top,
    "stack": [
        {"testID": e.get("testID"), "label": e.get("label"), "tappable": e.get("tappable"), "frame": e.get("frame")}
        for e in hits[:12]
    ],
    "source": source,
}

if os.environ.get("JSON") == "1":
    print(json.dumps(out, indent=2))
else:
    if not top:
        print(f"no target @ ({x:.1f},{y:.1f}) route={data.get('route')}")
        raise SystemExit(1)
    print(top["testID"])
    if top.get("label"):
        print(f"label: {top['label']}")
    print(f"tappable: {bool(top.get('tappable'))}")
    print(f"route: {data.get('route')}")
    if source:
        if source.get("entry"):
            print(f"entry: {source['entry']}")
        if source.get("skill"):
            print(f"skill: {source['skill']}")
        for f in source.get("files") or []:
            print(f"file: {f}")
    if len(hits) > 1:
        print(f"stack: {', '.join(str(e.get('testID')) for e in hits[:6])}")
PY
