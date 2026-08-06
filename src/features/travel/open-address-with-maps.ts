import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { appPrompt } from '@/components/primitives';
import {
  addressMapUrl,
  appleMapsUrl,
  googleMapsUrl,
} from '@/features/travel/address-map-link';

function openUrl(url: string | undefined): void {
  if (!url) return;
  void Linking.openURL(url);
}

/**
 * Open a stay address via an in-app maps chooser (map apps first).
 * Avoids the system share sheet, which ranks browsers/share targets over Maps.
 */
export function openAddressWithMapsChooser(address: string): void {
  const trimmed = address.trim();
  if (!trimmed) return;

  const appleUrl = appleMapsUrl(trimmed);
  const googleUrl = googleMapsUrl(trimmed);
  const androidGeoUrl = addressMapUrl(trimmed, 'android');

  if (Platform.OS === 'ios') {
    appPrompt.alert('Open Address', trimmed, [
      {
        text: 'Apple Maps',
        onPress: () => openUrl(appleUrl),
      },
      {
        text: 'Google Maps',
        onPress: () => openUrl(googleUrl),
      },
      {
        text: 'Copy Address',
        onPress: () => {
          void Clipboard.setStringAsync(trimmed);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
    return;
  }

  if (Platform.OS === 'android') {
    appPrompt.alert('Open Address', trimmed, [
      {
        text: 'Maps',
        onPress: () => openUrl(androidGeoUrl),
      },
      {
        text: 'Google Maps',
        onPress: () => openUrl(googleUrl),
      },
      {
        text: 'Copy Address',
        onPress: () => {
          void Clipboard.setStringAsync(trimmed);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
    return;
  }

  openUrl(googleUrl);
}
