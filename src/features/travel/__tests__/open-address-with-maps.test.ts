import { Share } from 'react-native';

import { addressMapUrl } from '../address-map-link';
import { openAddressWithMapsChooser } from '../open-address-with-maps';

describe('openAddressWithMapsChooser', () => {
  const address = 'Laugavegur 120, 105 Reykjavík, Iceland';
  const webUrl = addressMapUrl(address, 'web');

  beforeEach(() => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does nothing for a blank address', () => {
    openAddressWithMapsChooser('   ');
    expect(Share.share).not.toHaveBeenCalled();
  });

  it('shares the web maps URL via the system sheet (not Apple Maps / geo)', () => {
    openAddressWithMapsChooser(address);

    expect(webUrl).toMatch(/^https:\/\/www\.google\.com\/maps\//);
    expect(Share.share).toHaveBeenCalledWith({ message: webUrl, url: webUrl });
  });
});
