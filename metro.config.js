const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Expo null hybrid (Node crawl + Watchman watch). Requires
// scripts/patch-expo-metro-watchman.sh — without it, Expo coerces null→NativeWatcher
// and deep src/ edits stop applying while /status stays healthy.
//
// .watchmanconfig keeps node_modules ignored so Watchman does not flood FSEvents.
// The patch forces Node crawl so expo-router/entry still resolves.
config.resolver.useWatchman = null;

config.watcher.healthCheck = {
  ...(config.watcher.healthCheck ?? {}),
  enabled: true,
  filePrefix: '.metro-health-check',
  interval: 15_000,
  timeout: 5_000,
};

module.exports = config;
