import { useEffect, useState } from 'react';

import { useAddons } from '@/store/addons';
import { useAgents } from '@/store/agents';
import { useAuthAccess } from '@/store/auth-access';
import { usePlants } from '@/store/plants';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { useTodos } from '@/store/todos';
import { useTravel } from '@/store/travel';
import { useVehicles } from '@/store/vehicles';
import { useVisionBoard } from '@/store/vision-board';

/** Hard ceiling so a stuck persist never leaves the user on a blank shell. */
const HYDRATION_TIMEOUT_MS = 4_000;

async function rehydrateStore(
  rehydrate: () => Promise<unknown> | unknown,
): Promise<void> {
  try {
    await Promise.resolve(rehydrate());
  } catch {
    // Keep booting on empty/default state rather than white-screening.
  }
}

/** True only after every persisted store has finished rehydrating from disk. */
export function useHydrated(): boolean {
  // Keep the server and first browser render identical, then release the
  // loading shell at one deterministic point when all stores are ready.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const release = () => {
      if (active) setHydrated(true);
    };

    const timer = setTimeout(release, HYDRATION_TIMEOUT_MS);
    void Promise.all([
      rehydrateStore(() => usePreferences.persist.rehydrate()),
      rehydrateStore(() => useSchedule.persist.rehydrate()),
      rehydrateStore(() => usePlants.persist.rehydrate()),
      rehydrateStore(() => useAddons.persist.rehydrate()),
      rehydrateStore(() => useTravel.persist.rehydrate()),
      rehydrateStore(() => useAgents.persist.rehydrate()),
      rehydrateStore(() => useAuthAccess.persist.rehydrate()),
      rehydrateStore(() => useTodos.persist.rehydrate()),
      rehydrateStore(() => useVisionBoard.persist.rehydrate()),
      rehydrateStore(() => useVehicles.persist.rehydrate()),
    ]).then(release);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  return hydrated;
}
