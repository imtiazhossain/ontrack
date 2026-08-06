import { Share } from 'react-native';

import { addressMapUrl } from '@/features/travel/address-map-link';

/**
 * Open a stay address via the system share sheet (Browser / Copy / Share).
 * Uses a web maps search URL so native Maps apps are not offered as open targets.
 */
export function openAddressWithMapsChooser(address: string): void {
  const trimmed = address.trim();
  if (!trimmed) return;

  const url = addressMapUrl(trimmed, 'web');
  if (!url) return;

  // iOS prefers `url` (Safari / Copy Link); Android uses `message`.
  void Share.share({ message: url, url });
}
