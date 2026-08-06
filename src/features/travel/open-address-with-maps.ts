import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { addressMapUrl } from '@/features/travel/address-map-link';

/**
 * Open a stay address via the system chooser:
 * - iOS: share sheet with Apple Maps URL so Maps / Google Maps / Waze lead
 * - Android: `geo:` intent (system Open with… when multiple apps handle it)
 * - web: open the default map search URL
 */
export function openAddressWithMapsChooser(address: string): void {
  const trimmed = address.trim();
  if (!trimmed) return;

  const url = addressMapUrl(
    trimmed,
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
  );
  if (!url) return;

  if (Platform.OS === 'ios') {
    // `url` must be a maps URL (not a google.com web search) so map apps rank first.
    // Keep `message` as the plain address — duplicating the URL as message shows "2 Links".
    void Share.share({
      url,
      message: trimmed,
    });
    return;
  }

  void Linking.openURL(url);
}
