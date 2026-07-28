const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Xcode ad-hoc signs iphonesimulator builds ("Sign to Run Locally"). That signature
 * makes expo-secure-store / expo-notifications Keychain APIs fail with
 * errSecMissingEntitlement. Re-sign the .app with a local trusted identity when present.
 */
const SCRIPT_NAME = '[onTrack] Re-sign simulator app for Keychain';
const DEV_LAUNCHER_SCRIPT_NAME = '[Expo Dev Launcher] Strip Local Network Keys for Release';

const SHELL_SCRIPT = `set -e
if [ "\${PLATFORM_NAME}" != "iphonesimulator" ]; then
  exit 0
fi
IDENTITY="Apple Development: onTrack Local"
if ! security find-identity -p codesigning -v | grep -Fq "$IDENTITY"; then
  echo "warning: missing $IDENTITY — run scripts/ensure-ios-simulator-codesign.sh"
  exit 0
fi
APP="\${TARGET_BUILD_DIR}/\${WRAPPER_NAME}"
if [ ! -d "$APP" ]; then
  echo "warning: app bundle missing at $APP"
  exit 0
fi
/usr/bin/find "$APP" \\\\( -name "*.framework" -o -name "*.dylib" \\\\) -print0 2>/dev/null | while IFS= read -r -d '' item; do
  /usr/bin/codesign --force --sign "$IDENTITY" --timestamp=none "$item" 2>/dev/null || true
done
/usr/bin/codesign --force --sign "$IDENTITY" --timestamp=none --generate-entitlement-der "$APP"
echo "Re-signed simulator app with $IDENTITY"
`;

function ensureResignPhase(project) {
  const section = project.hash.project.objects.PBXShellScriptBuildPhase || {};
  let hasResignPhase = false;

  for (const key of Object.keys(section)) {
    const phase = section[key];
    if (
      phase &&
      typeof phase === 'object' &&
      (phase.name === SCRIPT_NAME || phase.name === DEV_LAUNCHER_SCRIPT_NAME)
    ) {
      phase.alwaysOutOfDate = 1;
      if (phase.name === SCRIPT_NAME) {
        hasResignPhase = true;
      }
    }
  }
  if (hasResignPhase) {
    return project;
  }

  const target = project.getFirstTarget();
  if (!target?.uuid) {
    return project;
  }
  const addedPhase = project.addBuildPhase([], 'PBXShellScriptBuildPhase', SCRIPT_NAME, target.uuid, {
    shellPath: '/bin/sh',
    shellScript: SHELL_SCRIPT,
  });
  if (addedPhase?.buildPhase) {
    addedPhase.buildPhase.alwaysOutOfDate = 1;
  }
  return project;
}

module.exports = function withSimulatorKeychainCodesign(config) {
  return withXcodeProject(config, (config) => {
    config.modResults = ensureResignPhase(config.modResults);
    return config;
  });
};
