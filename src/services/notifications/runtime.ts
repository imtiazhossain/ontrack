import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function notificationsAreAvailableInCurrentRuntime() {
  return (
    Platform.OS !== 'web' &&
    !(Platform.OS === 'android' && Constants.appOwnership === 'expo')
  );
}

export async function getNotificationsModule() {
  if (!notificationsAreAvailableInCurrentRuntime()) return undefined;
  try {
    return await import('expo-notifications');
  } catch {
    return undefined;
  }
}
