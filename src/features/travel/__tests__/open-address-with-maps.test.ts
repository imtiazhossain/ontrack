import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { appPrompt } from '@/components/primitives';

import {
  addressMapUrl,
  appleMapsUrl,
  googleMapsUrl,
} from '../address-map-link';
import { openAddressWithMapsChooser } from '../open-address-with-maps';

describe('openAddressWithMapsChooser', () => {
  const address = 'Laugavegur 120, 105 Reykjavík, Iceland';
  const previousOs = Platform.OS;

  beforeEach(() => {
    jest.spyOn(appPrompt, 'alert').mockImplementation(() => undefined);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    jest.spyOn(Clipboard, 'setStringAsync').mockResolvedValue(true);
  });

  afterEach(() => {
    Platform.OS = previousOs;
    jest.restoreAllMocks();
  });

  it('does nothing for a blank address', () => {
    openAddressWithMapsChooser('   ');
    expect(appPrompt.alert).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('shows Apple Maps and Google Maps first on iOS', () => {
    Platform.OS = 'ios';
    openAddressWithMapsChooser(address);

    expect(appPrompt.alert).toHaveBeenCalledTimes(1);
    const [title, message, actions] = (appPrompt.alert as jest.Mock).mock
      .calls[0] as [string, string, Array<{ text: string; onPress?: () => void }>];
    expect(title).toBe('Open Address');
    expect(message).toBe(address);
    expect(actions.map((action) => action.text)).toEqual([
      'Apple Maps',
      'Google Maps',
      'Copy Address',
      'Cancel',
    ]);

    actions[0]?.onPress?.();
    expect(Linking.openURL).toHaveBeenCalledWith(appleMapsUrl(address));

    (Linking.openURL as jest.Mock).mockClear();
    actions[1]?.onPress?.();
    expect(Linking.openURL).toHaveBeenCalledWith(googleMapsUrl(address));
  });

  it('shows Maps and Google Maps first on Android', () => {
    Platform.OS = 'android';
    openAddressWithMapsChooser(address);

    const [, , actions] = (appPrompt.alert as jest.Mock).mock.calls[0] as [
      string,
      string,
      Array<{ text: string; onPress?: () => void }>,
    ];
    expect(actions.map((action) => action.text)).toEqual([
      'Maps',
      'Google Maps',
      'Copy Address',
      'Cancel',
    ]);

    actions[0]?.onPress?.();
    expect(Linking.openURL).toHaveBeenCalledWith(addressMapUrl(address, 'android'));
  });
});
