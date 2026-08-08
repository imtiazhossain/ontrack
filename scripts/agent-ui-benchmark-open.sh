#!/usr/bin/env bash
# Dual-open the app on headless agent-pool devices and append a benchmark row.
# Does NOT hand off to the user's headed Simulator / Galaxy.
#
# Usage:
#   ./scripts/agent-ui-benchmark-open.sh [--label <note>]
#   ./scripts/agent-ui-benchmark-open.sh --help
#
# Writes: docs/agent-ui-verify-benchmark.tsv
# Docs:   docs/agent-ui-verify-benchmark.md

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TSV="${ROOT}/docs/agent-ui-verify-benchmark.tsv"
LABEL="agent-pool-today-open"

usage() {
  cat >&2 <<'EOF'
usage: agent-ui-benchmark-open.sh [--label <note>]

Runs dual Today open on the agent pool (no headed handoff) and appends one
TSV row to docs/agent-ui-verify-benchmark.tsv. See docs/agent-ui-verify-benchmark.md.
EOF
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --label)
      LABEL="${2:-}"
      [[ -n "${LABEL}" ]] || usage
      shift 2
      ;;
    *) usage ;;
  esac
done

mkdir -p "$(dirname "${TSV}")"
if [[ ! -f "${TSV}" ]]; then
  printf '%s\n' $'date_iso\telapsed_s\tios_exit\tandroid_exit\tslot\tpath\tlabel\tnotes' >"${TSV}"
fi

LOG="$(mktemp -t agent-ui-bench.XXXXXX)"
trap 'rm -f "${LOG}"' EXIT

export AGENT_UI_SKIP_HEADED_HANDOFF=1
export ONTRACK_ANDROID_KEEP_HEADED=0

echo "agent-ui-benchmark: starting dual Today open (agent pool, no headed handoff)…" >&2
START_NS="$(python3 -c 'import time; print(time.time_ns())')"
set +e
"${ROOT}/scripts/agent-ui-verify-both.sh" \
  --route / \
  --flow today \
  --exists ontrack.today.addActivity \
  --exists ontrack.today.nextDay \
  >"${LOG}" 2>&1
EXIT=$?
set -e
END_NS="$(python3 -c 'import time; print(time.time_ns())')"
ELAPSED="$(python3 -c "print(int(round((${END_NS}-${START_NS})/1e9)))")"

# Stream a compact summary (full log stays in LOG if needed).
rg -n 'verify-both:|verify passed|verify failed|warm path|still quiet|still ensuring|ios_exit|acquired device slot|slot [0-9]+' "${LOG}" >&2 || true

IOS_EXIT="$(rg -o 'ios_exit=[0-9]+' "${LOG}" | tail -1 | cut -d= -f2 || true)"
ANDROID_EXIT="$(rg -o 'android_exit=[0-9]+' "${LOG}" | tail -1 | cut -d= -f2 || true)"
IOS_EXIT="${IOS_EXIT:-$EXIT}"
ANDROID_EXIT="${ANDROID_EXIT:-$EXIT}"

SLOT="$(rg -o 'acquired device slot [0-9]+' "${LOG}" | tail -1 | awk '{print $4}' | cut -d/ -f1 || true)"
SLOT="${SLOT:-?}"

PATH_KIND="mixed"
if rg -q 'Android warm path ok' "${LOG}"; then
  PATH_KIND="warm"
elif rg -q 'Android still quiet|still ensuring Android packager' "${LOG}"; then
  PATH_KIND="cold"
fi

DATE_ISO="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
NOTES="exit=${EXIT}; SKIP_HEADED_HANDOFF=1"
# Flatten tabs/newlines out of label/notes for TSV safety.
LABEL_SAFE="$(printf '%s' "${LABEL}" | tr '\t\n' '  ')"
NOTES_SAFE="$(printf '%s' "${NOTES}" | tr '\t\n' '  ')"

printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
  "${DATE_ISO}" "${ELAPSED}" "${IOS_EXIT}" "${ANDROID_EXIT}" \
  "${SLOT}" "${PATH_KIND}" "${LABEL_SAFE}" "${NOTES_SAFE}" \
  >>"${TSV}"

echo "agent-ui-benchmark: elapsed=${ELAPSED}s path=${PATH_KIND} slot=${SLOT} ios=${IOS_EXIT} android=${ANDROID_EXIT} → ${TSV}" >&2
exit "${EXIT}"
