const { withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

module.exports = function withOnTrackHealthKit(config) {
  config = withEntitlementsPlist(config, (result) => {
    result.modResults['com.apple.developer.healthkit'] = true;
    return result;
  });
  return withInfoPlist(config, (result) => {
    result.modResults.NSHealthShareUsageDescription =
      'onTrack reads activity, heart-rate, workout, sleep, and optional State of Mind data to show your private health trends.';
    result.modResults.NSHealthUpdateUsageDescription =
      'onTrack can save a mood check-in to Apple Health only when you explicitly enable State of Mind sync.';
    return result;
  });
};
