import { decideAccountData } from '@/services/cloud/data-ownership';

describe('account data ownership', () => {
  it('promotes every device domain for a new account', () => {
    expect(decideAccountData(0, true, true)).toBe('upload-device');
    expect(decideAccountData(0, false, false)).toBe('upload-device');
  });

  it('restores cloud data for a pristine guest or an existing persisted session', () => {
    expect(decideAccountData(6, true, false)).toBe('restore-cloud');
    expect(decideAccountData(6, false, true)).toBe('restore-cloud');
  });

  it('requires a choice only when both an upgrading guest and cloud account have data', () => {
    expect(decideAccountData(1, true, true)).toBe('resolve-conflict');
  });
});
