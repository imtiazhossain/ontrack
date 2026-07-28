import { useEffect, useState } from 'react';

import { useAddons } from '@/store/addons';
import { useAgents } from '@/store/agents';
import { useAuthAccess } from '@/store/auth-access';
import { usePlants } from '@/store/plants';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { useTodos } from '@/store/todos';
import { useTravel } from '@/store/travel';

/** True only after every persisted store has finished rehydrating from disk. */
export function useHydrated(): boolean {
  // Keep the server and first browser render identical, then release the
  // loading shell at one deterministic point when all stores are ready.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      usePreferences.persist.rehydrate(),
      useSchedule.persist.rehydrate(),
      usePlants.persist.rehydrate(),
      useAddons.persist.rehydrate(),
      useTravel.persist.rehydrate(),
      useAgents.persist.rehydrate(),
      useAuthAccess.persist.rehydrate(),
      useTodos.persist.rehydrate(),
    ]).then(() => {
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return hydrated;
}
