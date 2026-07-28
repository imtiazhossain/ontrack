export type AccountDataDecision = 'upload-device' | 'restore-cloud' | 'resolve-conflict';

export function decideAccountData(
  remoteDomainCount: number,
  localCanConflict: boolean,
  hasMeaningfulDeviceData: boolean,
): AccountDataDecision {
  if (remoteDomainCount === 0) return 'upload-device';
  if (localCanConflict && hasMeaningfulDeviceData) return 'resolve-conflict';
  return 'restore-cloud';
}
