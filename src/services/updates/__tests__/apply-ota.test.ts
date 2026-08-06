import { applyAvailableOtaUpdate, type OtaUpdatesClient } from '../apply-ota';

function client(partial: Partial<OtaUpdatesClient> = {}): OtaUpdatesClient {
  return {
    isEnabled: true,
    checkForUpdateAsync: async () => ({ isAvailable: false }),
    fetchUpdateAsync: async () => ({ isNew: false }),
    reloadAsync: async () => undefined,
    ...partial,
  };
}

describe('applyAvailableOtaUpdate', () => {
  it('skips when updates are disabled', async () => {
    const reloadAsync = jest.fn(async () => undefined);
    await expect(
      applyAvailableOtaUpdate(client({ isEnabled: false, reloadAsync })),
    ).resolves.toBe('skipped');
    expect(reloadAsync).not.toHaveBeenCalled();
  });

  it('noops when no update is available', async () => {
    const fetchUpdateAsync = jest.fn(async () => ({ isNew: true }));
    await expect(
      applyAvailableOtaUpdate(client({ fetchUpdateAsync })),
    ).resolves.toBe('noop');
    expect(fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('fetches and reloads when a new update is available', async () => {
    const fetchUpdateAsync = jest.fn(async () => ({ isNew: true }));
    const reloadAsync = jest.fn(async () => undefined);
    await expect(
      applyAvailableOtaUpdate(
        client({
          checkForUpdateAsync: async () => ({ isAvailable: true }),
          fetchUpdateAsync,
          reloadAsync,
        }),
      ),
    ).resolves.toBe('reloaded');
    expect(fetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(reloadAsync).toHaveBeenCalledTimes(1);
  });

  it('does not reload when fetch is not new', async () => {
    const reloadAsync = jest.fn(async () => undefined);
    await expect(
      applyAvailableOtaUpdate(
        client({
          checkForUpdateAsync: async () => ({ isAvailable: true }),
          fetchUpdateAsync: async () => ({ isNew: false }),
          reloadAsync,
        }),
      ),
    ).resolves.toBe('noop');
    expect(reloadAsync).not.toHaveBeenCalled();
  });
});
