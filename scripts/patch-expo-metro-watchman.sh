#!/usr/bin/env bash
# Make Expo's Metro match the Codex-working Fast Refresh path on this repo:
#   Node crawl (sees node_modules) + Watchman watch (ignores node_modules).
#
# Upstream Expo SDK 56+/57 breaks that hybrid two ways:
# 1) createFileMap-fork: `useWatchman ?? false` turns Expo's null into NativeWatcher
# 2) Even with useWatchman true, crawl still uses Watchman, so ignored node_modules
#    never enter the file map (Unable to resolve expo-router/entry).
#
# This patch is idempotent and re-applied by start-metro.sh before every launch.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FORK="$ROOT/node_modules/@expo/cli/build/src/start/server/metro/createFileMap-fork.js"
WATCHER="$ROOT/node_modules/@expo/metro-file-map/build/Watcher.js"

python3 - "$FORK" "$WATCHER" <<'PY'
from pathlib import Path
import sys

fork_path = Path(sys.argv[1])
watcher_path = Path(sys.argv[2])

if fork_path.is_file():
    text = fork_path.read_text()
    if "ontrack-watchman-hybrid" not in text:
        old = "        useWatchman: config.resolver.useWatchman ?? false,\n        watch,"
        new = (
            "        // ontrack-watchman-hybrid: null => Watchman watch + Node crawl\n"
            "        useWatchman: config.resolver.useWatchman == null ? true : !!config.resolver.useWatchman,\n"
            "        forceNodeFilesystemAPI: config.resolver.useWatchman == null ? true : !config.resolver.useWatchman,\n"
            "        watch,"
        )
        if old in text:
            fork_path.write_text(text.replace(old, new, 1))
            print(f"patched {fork_path}")
        else:
            print(f"warn: fork pattern missing in {fork_path}", file=sys.stderr)
    else:
        print(f"ok {fork_path.name}")

if watcher_path.is_file():
    text = watcher_path.read_text()
    if "ontrack-node-crawl-hybrid" not in text:
        old = "        const crawl = useWatchman ? watchman_1.default : node_1.default;"
        new = (
            "        // ontrack-node-crawl-hybrid: forceNodeFilesystemAPI => node crawl\n"
            "        // while useWatchman still selects WatchmanWatcher for subscribe.\n"
            "        const crawl = useWatchman && !options.forceNodeFilesystemAPI\n"
            "            ? watchman_1.default\n"
            "            : node_1.default;"
        )
        if old in text:
            watcher_path.write_text(text.replace(old, new, 1))
            print(f"patched {watcher_path}")
        else:
            print(f"warn: watcher pattern missing in {watcher_path}", file=sys.stderr)
    else:
        print(f"ok {watcher_path.name}")
PY
