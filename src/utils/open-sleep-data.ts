import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

const APPLE_HEALTH_URL = 'x-apple-health://';
const HEALTH_CONNECT_URL = 'https://health.google/health-connect-android/';

export async function openSleepData(): Promise<void> {
  try {
    if (process.env.EXPO_OS === 'ios') {
      await Linking.openURL(APPLE_HEALTH_URL);
      return;
    }

    if (process.env.EXPO_OS === 'android') {
      try {
        await Linking.sendIntent('android.health.connect.action.HEALTH_HOME_SETTINGS');
      } catch {
        await Linking.sendIntent('androidx.health.ACTION_HEALTH_CONNECT_SETTINGS');
      }
      return;
    }

    await Linking.openURL(HEALTH_CONNECT_URL);
  } catch {
    Alert.alert(
      'Sleep data app unavailable',
      process.env.EXPO_OS === 'ios'
        ? 'Open the Health app to review your sleep data.'
        : 'Install or enable Health Connect to review your sleep data.',
    );
  }
}
