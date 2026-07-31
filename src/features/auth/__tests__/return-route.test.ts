import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { useAuthAccess } from '@/store/auth-access';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('authentication return route', () => {
  beforeEach(() => useAuthAccess.getState().resetAccess());

  it('keeps an invite route through authentication and consumes it once', () => {
    useAuthAccess.getState().setAuthReturnTo('/l/secure-code');
    useAuthAccess.getState().finishAuthentication();

    expect(useAuthAccess.getState().takeAuthReturnTo()).toBe('/l/secure-code');
    expect(useAuthAccess.getState().takeAuthReturnTo()).toBeUndefined();
  });

  it('rejects non-app return locations', () => {
    useAuthAccess.getState().setAuthReturnTo('https://example.com');
    expect(useAuthAccess.getState().takeAuthReturnTo()).toBeUndefined();
  });

  it('rejects protocol-relative return locations', () => {
    useAuthAccess.getState().setAuthReturnTo('//evil.example/phish');
    expect(useAuthAccess.getState().takeAuthReturnTo()).toBeUndefined();
  });
});
