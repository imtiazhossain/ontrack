#!/usr/bin/env node
/**
 * Expo Fast Refresh dies on Node 25+ because its global localStorage is broken
 * (`getItem` is not a function) and crashes Metro's SSR/web render path.
 * Prefer Node 24 via nvm: `nvm use` (see .nvmrc).
 */
const major = Number(process.versions.node.split('.')[0]);
if (!Number.isFinite(major) || major >= 25) {
  console.error(
    `[onTrack] Node ${process.version} breaks live reload (Expo Fast Refresh).\n` +
      `Use Node 24:  nvm use 24   (or: nvm install 24 && nvm use 24)\n` +
      `Do not put Homebrew node@25 ahead of nvm on PATH when starting Metro.`,
  );
  process.exit(1);
}
