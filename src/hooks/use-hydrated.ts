import { useEffect, useState } from 'react';

import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { usePlants } from '@/store/plants';

/** True once persisted stores have rehydrated from disk. */
export function useHydrated(): boolean {
  // Keep the server and first browser render identical. Persisted stores can
  // already be hydrated when the client module loads, which would otherwise
  // replace the static shell during React hydration.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    let active = true;
    const check = () => {
      if (active && usePreferences.persist.hasHydrated() && useSchedule.persist.hasHydrated() && usePlants.persist.hasHydrated()) {
        setHydrated(true);
      }
    };
    const unsub1 = usePreferences.persist.onFinishHydration(check);
    const unsub2 = useSchedule.persist.onFinishHydration(check);
    const unsub3 = usePlants.persist.onFinishHydration(check);
    // Explicitly request hydration as well as subscribing. Static web rendering can
    // initialize the stores before this effect attaches its listeners.
    void Promise.all([
      usePreferences.persist.rehydrate(),
      useSchedule.persist.rehydrate(),
      usePlants.persist.rehydrate(),
    ]).then(check);
    const fallback = setTimeout(() => {
      if (active) setHydrated(true);
    }, 1000);
    return () => {
      active = false;
      clearTimeout(fallback);
      unsub1();
      unsub2();
      unsub3();
    };
  }, [hydrated]);

  return hydrated;
}
