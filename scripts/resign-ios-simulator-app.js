#!/usr/bin/env node
/**
 * Re-signs an iOS Simulator .app with the local Keychain-capable identity.
 * Used after `expo run:ios` / xcodebuild, which ad-hoc sign simulator builds.
 */
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IDENTITY = process.env.ONTRACK_SIM_CODESIGN_IDENTITY || 'Apple Development: onTrack Local';
const BUNDLE_ID = 'com.imtihoss.ontracknow';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function findApp() {
  if (process.argv[2] && fs.existsSync(process.argv[2])) {
    return path.resolve(process.argv[2]);
  }
  const candidates = [
    path.join(
      process.env.HOME,
      'Library/Developer/Xcode/DerivedData',
    ),
    path.join(__dirname, '../ios/build/Build/Products/Debug-iphonesimulator'),
  ];
  for (const root of candidates) {
    if (!fs.existsSync(root)) continue;
    const found = sh(
      `find "${root}" -path "*iphonesimulator*" -name "onTrack.app" -type d 2>/dev/null | head -5`,
    )
      .split('\n')
      .filter(Boolean);
    if (found.length) {
      // Prefer newest
      found.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      return found[0];
    }
  }
  throw new Error('Could not find onTrack.app (iphonesimulator)');
}

function main() {
  const identities = sh('security find-identity -p codesigning -v || true');
  if (!identities.includes(IDENTITY)) {
    console.error(
      `Missing codesign identity "${IDENTITY}". Run: scripts/ensure-ios-simulator-codesign.sh`,
    );
    process.exit(1);
  }

  const app = findApp();
  console.log(`Re-signing ${app}`);

  const nested = sh(
    `find "${app}" \\( -name "*.framework" -o -name "*.dylib" \\) 2>/dev/null || true`,
  )
    .split('\n')
    .filter(Boolean);
  for (const item of nested) {
    try {
      execFileSync(
        'codesign',
        ['--force', '--sign', IDENTITY, '--timestamp=none', item],
        { stdio: 'ignore' },
      );
    } catch {
      // Best-effort for nested binaries.
    }
  }

  execFileSync(
    'codesign',
    [
      '--force',
      '--sign',
      IDENTITY,
      '--timestamp=none',
      '--generate-entitlement-der',
      app,
    ],
    { stdio: 'inherit' },
  );

  const auth = sh(`codesign -dvvv "${app}" 2>&1 | grep Authority || true`);
  console.log(auth || 'Signed.');

  if (process.env.ONTRACK_SIM_INSTALL === '1') {
    const udid =
      process.env.SIMULATOR_DEVICE_UDID ||
      sh(
        `xcrun simctl list devices booted -j | python3 -c "import json,sys; d=json.load(sys.stdin); print(next(x['udid'] for runtime in d['devices'].values() for x in runtime if x.get('state')=='Booted'))"`,
      );
    sh(`xcrun simctl terminate "${udid}" "${BUNDLE_ID}" || true`);
    sh(`xcrun simctl uninstall "${udid}" "${BUNDLE_ID}" || true`);
    sh(`xcrun simctl install "${udid}" "${app}"`);
    sh(`xcrun simctl launch "${udid}" "${BUNDLE_ID}"`);
    console.log(`Installed and launched on ${udid}`);
  }
}

main();
