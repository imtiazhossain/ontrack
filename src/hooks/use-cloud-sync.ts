import { useEffect } from 'react';

import { startCloudSync } from '@/services/cloud/sync';

export function useCloudSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    return startCloudSync();
  }, [enabled]);
}
