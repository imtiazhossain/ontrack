const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Explicit Node watcher — avoid flaky Watchman subscriptions in agent sessions.
config.resolver.useWatchman = false;

module.exports = config;
