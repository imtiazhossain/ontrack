import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { applyAvailableOtaUpdate } from '@/services/updates/apply-ota';

/**
 * Production builds: download OTAs on launch/foreground. Apply happens on the
 * next cold start — same-session `reloadAsync` races AppContext/Fabric on iOS
 * and aborts via expo-updates ErrorRecovery (itinerary open after OTA).
 */
export function useApplyOtaUpdate() {
  const checkingRef = useRef(false);

  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) return;

    const check = () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      void applyAvailableOtaUpdate({
        isEnabled: Updates.isEnabled,
        checkForUpdateAsync: () => Updates.checkForUpdateAsync(),
        fetchUpdateAsync: () => Updates.fetchUpdateAsync(),
        reloadAsync: () => Updates.reloadAsync(),
      })
        .catch(() => undefined)
        .finally(() => {
          checkingRef.current = false;
        });
    };

    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, []);
}
