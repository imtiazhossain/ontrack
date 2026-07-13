import { useEffect, useState } from 'react';

import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';

/** True once persisted stores have rehydrated from disk. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(
    () => usePreferences.persist.hasHydrated() && useSchedule.persist.hasHydrated(),
  );

  useEffect(() => {
    if (hydrated) return;
    const check = () => {
      if (usePreferences.persist.hasHydrated() && useSchedule.persist.hasHydrated()) {
        setHydrated(true);
      }
    };
    const unsub1 = usePreferences.persist.onFinishHydration(check);
    const unsub2 = useSchedule.persist.onFinishHydration(check);
    check();
    return () => {
      unsub1();
      unsub2();
    };
  }, [hydrated]);

  return hydrated;
}
