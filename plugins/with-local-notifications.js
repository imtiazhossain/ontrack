const { withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * onTrack schedules local plant-care reminders and never requests a push token.
 * expo-notifications adds APNs by default, so remove that unused entitlement
 * after its auto config plugin runs.
 */
module.exports = function withLocalNotifications(config) {
  return withEntitlementsPlist(config, (updatedConfig) => {
    delete updatedConfig.modResults['aps-environment'];
    return updatedConfig;
  });
};
