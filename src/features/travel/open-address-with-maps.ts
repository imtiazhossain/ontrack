import * as Linking from 'expo-linking';
import { Share } from 'react-native';

import { addressMapUrl } from '@/features/travel/address-map-link';

/**
 * Open a stay address via the system chooser:
 * - iOS: system share sheet (Maps / Google Maps / Waze / …)
 * - Android: `geo:` intent (system Open with… when multiple apps handle it)
 * - web: open the default map search URL
 */
export function openAddressWithMapsChooser(address: string): void {
  const trimmed = address.trim();
  if (!trimmed) return;

  const url = addressMapUrl(trimmed);
  if (!url) return;

  if (process.env.EXPO_OS === 'ios') {
    void Share.share({
      url,
      message: trimmed,
    });
    return;
  }

  void Linking.openURL(url);
}
