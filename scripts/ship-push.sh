#!/usr/bin/env bash
# Full ship flow for onTrack:
#   commit → branch → PR → merge main → delete branch → TestFlight OTA → Drive APK
#
# Agent / human phrases that mean this script:
#   "push" · "run the push script" · "push script" · "ship push" · "ship:push"
#
# Usage (from repo root):
#   npm run ship:push -- -m "Why this ships"
#   npm run ship:push -- -m "…" --branch feat/travel-home-ui
#   npm run ship:push -- --ota-apk-only -m "Reship current main"
#   npm run ship:push -- -m "…" --skip-apk
#   npm run ship:push -- -m "…" --skip-ota
#
# Flags:
#   -m, --message   Commit / PR / OTA message (required unless --ota-apk-only on clean main)
#   --branch        Feature branch name (default: ship/<slug>-<yyyymmdd>)
#   --ota-apk-only  Skip git/PR; publish OTA + Drive APK from current HEAD
#   --skip-ota      Skip TestFlight EAS Update
#   --skip-apk      Skip Android release → Google Drive
#   --dry-run       Print steps only

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MESSAGE=""
BRANCH=""
OTA_APK_ONLY=0
SKIP_OTA=0
SKIP_APK=0
DRY_RUN=0

usage() {
  awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"
}

die() {
  echo "error: $*" >&2
  exit 1
}

slugify() {
  # lowercase, non-alnum → -, squeeze, trim, max 48 chars
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g' \
    | cut -c1-48 \
    | sed -E 's/-$//'
}

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message)
      [[ $# -ge 2 ]] || die "--message requires a value"
      MESSAGE="$2"
      shift 2
      ;;
    --branch)
      [[ $# -ge 2 ]] || die "--branch requires a value"
      BRANCH="$2"
      shift 2
      ;;
    --ota-apk-only) OTA_APK_ONLY=1; shift ;;
    --skip-ota) SKIP_OTA=1; shift ;;
    --skip-apk) SKIP_APK=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown arg: $1 (try --help)"
      ;;
  esac
done

command -v git >/dev/null || die "git not found"
command -v gh >/dev/null || die "gh not found (GitHub CLI)"
command -v npm >/dev/null || die "npm not found"

if [[ -n "$(git status --porcelain)" ]]; then
  DIRTY=1
else
  DIRTY=0
fi

CURRENT_BRANCH="$(git branch --show-current)"
[[ -n "$CURRENT_BRANCH" ]] || die "detached HEAD is not supported"

PR_URL=""
MERGE_SHA=""

if [[ "$OTA_APK_ONLY" -eq 0 ]]; then
  if [[ "$DIRTY" -eq 0 ]]; then
    # Clean tree: if already ahead of origin/main on a feature branch, still PR/merge;
    # if on main with nothing to ship via git, fall through to OTA+APK only.
    AHEAD=0
    if [[ "$CURRENT_BRANCH" != "main" ]]; then
      git fetch origin main --quiet 2>/dev/null || true
      AHEAD="$(git rev-list --count "origin/main..HEAD" 2>/dev/null || echo 0)"
    fi
    if [[ "$CURRENT_BRANCH" == "main" || "$AHEAD" -eq 0 ]]; then
      echo "==> Working tree clean on $CURRENT_BRANCH — git/PR steps skipped (OTA/APK only)"
      OTA_APK_ONLY=1
    fi
  fi
fi

if [[ "$OTA_APK_ONLY" -eq 0 ]]; then
  [[ -n "$MESSAGE" ]] || die "pass -m \"commit/PR/OTA message\""

  if [[ "$CURRENT_BRANCH" == "main" ]]; then
    if [[ -z "$BRANCH" ]]; then
      SLUG="$(slugify "$MESSAGE")"
      [[ -n "$SLUG" ]] || SLUG="update"
      BRANCH="ship/${SLUG}-$(date +%Y%m%d)"
    fi
    echo "==> Creating branch $BRANCH from main"
    run git checkout -b "$BRANCH"
    CURRENT_BRANCH="$BRANCH"
  elif [[ -n "$BRANCH" && "$BRANCH" != "$CURRENT_BRANCH" ]]; then
    die "already on $CURRENT_BRANCH; omit --branch or checkout first"
  else
    BRANCH="$CURRENT_BRANCH"
    echo "==> Using current branch $BRANCH"
  fi

  if [[ "$DIRTY" -eq 1 ]]; then
    echo "==> Committing working tree"
    run git add -A
    # HEREDOC keeps multi-line messages intact without interactive editors.
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "[dry-run] git commit -m $(printf %q "$MESSAGE")"
    else
      git commit -m "$MESSAGE"
    fi
  else
    echo "==> No local changes to commit (branch already has commits ahead of main)"
  fi

  echo "==> Pushing $BRANCH"
  run git push -u origin HEAD

  echo "==> Opening PR"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] gh pr create …"
    PR_URL="https://example.com/pr/dry-run"
  else
    # Reuse an open PR for this branch if one exists.
    EXISTING="$(gh pr list --head "$BRANCH" --state open --json url --jq '.[0].url' 2>/dev/null || true)"
    if [[ -n "$EXISTING" ]]; then
      PR_URL="$EXISTING"
      echo "    existing PR: $PR_URL"
    else
      PR_URL="$(
        gh pr create \
          --title "$MESSAGE" \
          --body "$(cat <<EOF
## Summary
- ${MESSAGE}

## Test plan
- [ ] Smoke Travel / changed surfaces on iOS + Android
- [ ] Confirm TestFlight OTA + Drive APK after merge

EOF
)"
      )"
      echo "    created: $PR_URL"
    fi
  fi

  echo "==> Merging PR into main and deleting branch"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] gh pr merge --merge --delete-branch"
  else
    gh pr merge "$PR_URL" --merge --delete-branch
  fi

  echo "==> Syncing local main"
  run git checkout main
  run git pull origin main
  MERGE_SHA="$(git rev-parse --short HEAD)"
  echo "    main @ $MERGE_SHA"
else
  if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "==> --ota-apk-only: syncing to main first"
    run git checkout main
    run git pull origin main
  elif [[ -n "$(git status -sb | grep -E '\[behind' || true)" ]]; then
    run git pull origin main
  else
    # Still pull to be safe when tracking is ahead/behind-unknown.
    run git pull origin main 2>/dev/null || true
  fi
  MERGE_SHA="$(git rev-parse --short HEAD)"
  if [[ -z "$MESSAGE" ]]; then
    MESSAGE="$(git log -1 --pretty=%s)"
  fi
  echo "==> OTA/APK-only from main @ $MERGE_SHA"
fi

OTA_MSG="$MESSAGE"
[[ -n "$OTA_MSG" ]] || OTA_MSG="Ship $(git rev-parse --short HEAD)"

if [[ "$SKIP_OTA" -eq 0 ]]; then
  echo "==> Publishing TestFlight OTA"
  run npm run update:testflight -- --message "$OTA_MSG" --non-interactive
else
  echo "==> Skipping TestFlight OTA (--skip-ota)"
fi

if [[ "$SKIP_APK" -eq 0 ]]; then
  echo "==> Building APK and uploading to Google Drive"
  run npm run android:release-to-drive
else
  echo "==> Skipping Drive APK (--skip-apk)"
fi

echo
echo "======== ship:push complete ========"
[[ -n "$PR_URL" ]] && echo "pr=$PR_URL"
echo "main=$(git rev-parse --short HEAD)"
echo "message=$OTA_MSG"
[[ "$SKIP_OTA" -eq 0 ]] && echo "ota=testflight (see EAS Dashboard link above)"
[[ "$SKIP_APK" -eq 0 ]] && echo "apk=see Drive file=/folder= lines above"
echo "===================================="
