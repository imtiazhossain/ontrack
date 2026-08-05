import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { DEFAULT_ADDON_ENTITLEMENTS, DEFAULT_ADDON_STATE } from '@/addons/registry';
import { sanitizeAddonEnabled, useAddons } from '@/store/addons';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('addons store', () => {
  beforeEach(() => {
    useAddons.getState().reset();
  });

  it('strips unknown enabled keys from cloud/local payloads', () => {
    expect(
      sanitizeAddonEnabled({
        ...DEFAULT_ADDON_STATE,
        food: false,
        legacy: true,
      }),
    ).toEqual({ ...DEFAULT_ADDON_STATE, food: false });
  });

  it('does not throw when replacing entitlements after a stale enabled key', () => {
    useAddons.setState({
      enabled: { ...DEFAULT_ADDON_STATE, legacy: true } as typeof DEFAULT_ADDON_STATE & {
        legacy: boolean;
      },
    });

    expect(() => {
      useAddons.getState().replaceEntitlements(DEFAULT_ADDON_ENTITLEMENTS);
    }).not.toThrow();

    expect(useAddons.getState().enabled).toEqual(DEFAULT_ADDON_STATE);
    expect(useAddons.getState().entitlements).toEqual(DEFAULT_ADDON_ENTITLEMENTS);
  });

  it('disables local toggles when an entitlement is inactive', () => {
    useAddons.getState().replaceEntitlements({
      ...DEFAULT_ADDON_ENTITLEMENTS,
      travel: { active: false, source: 'included' },
    });

    expect(useAddons.getState().enabled.travel).toBe(false);
    expect(useAddons.getState().enabled.food).toBe(true);
  });

  it('ignores setEnabled when the entitlement entry is missing', () => {
    useAddons.setState({
      entitlements: {
        ...DEFAULT_ADDON_ENTITLEMENTS,
        games: undefined as unknown as (typeof DEFAULT_ADDON_ENTITLEMENTS)['games'],
      },
    });

    expect(() => {
      useAddons.getState().setEnabled('games', false);
    }).not.toThrow();
    expect(useAddons.getState().enabled.games).toBe(true);
  });
});
