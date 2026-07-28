import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import {
  isGuestDirtyTrackingSuppressed,
  withoutGuestDirtyTracking,
} from '@/features/auth/guest-dirty-tracking';
import { useAuthAccess } from '@/store/auth-access';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('guest edit tracking', () => {
  beforeEach(() => {
    useAuthAccess.getState().resetAccess();
  });

  it('marks edits only after guest access is active', () => {
    useAuthAccess.getState().markGuestDataDirty();
    expect(useAuthAccess.getState().guestDataDirty).toBe(false);

    useAuthAccess.getState().enterGuest();
    useAuthAccess.getState().markGuestDataDirty();
    expect(useAuthAccess.getState().guestDataDirty).toBe(true);
  });

  it('suppresses seed and migration writes without leaking suppression state', () => {
    expect(isGuestDirtyTrackingSuppressed()).toBe(false);
    withoutGuestDirtyTracking(() => {
      expect(isGuestDirtyTrackingSuppressed()).toBe(true);
    });
    expect(isGuestDirtyTrackingSuppressed()).toBe(false);
  });
});
