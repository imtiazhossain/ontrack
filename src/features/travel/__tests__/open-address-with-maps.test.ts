import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { addressMapUrl } from '../address-map-link';
import { openAddressWithMapsChooser } from '../open-address-with-maps';

describe('openAddressWithMapsChooser', () => {
  const address = 'Laugavegur 120, 105 Reykjavík, Iceland';
  const iosUrl = addressMapUrl(address, 'ios');
  const androidUrl = addressMapUrl(address, 'android');
  const previousOs = Platform.OS;

  beforeEach(() => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    Platform.OS = previousOs;
    jest.restoreAllMocks();
  });

  it('does nothing for a blank address', () => {
    openAddressWithMapsChooser('   ');
    expect(Share.share).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('shares the Apple Maps URL on iOS so map apps lead the sheet', () => {
    Platform.OS = 'ios';
    openAddressWithMapsChooser(address);

    expect(iosUrl).toMatch(/^http:\/\/maps\.apple\.com\/\?q=/);
    expect(Share.share).toHaveBeenCalledWith({ url: iosUrl, message: address });
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('opens the geo intent on Android', () => {
    Platform.OS = 'android';
    openAddressWithMapsChooser(address);

    expect(androidUrl).toMatch(/^geo:0,0\?q=/);
    expect(Linking.openURL).toHaveBeenCalledWith(androidUrl);
    expect(Share.share).not.toHaveBeenCalled();
  });
});
