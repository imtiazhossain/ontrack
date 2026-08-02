import { useEffect } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';

import { TravelPlanDetail } from '@/features/travel/travel-plan-detail';
import type { TravelItemKind } from '@/features/travel/types';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences, type ThemePreference } from '@/store/preferences';

const ADD_KINDS = new Set<TravelItemKind>([
  'moment',
  'activity',
  'flight',
  'stay',
  'rental',
]);

const THEME_PREFS = new Set<ThemePreference>(['system', 'light', 'dark']);

export default function TravelPlanScreen() {
  const {
    id,
    add,
    theme: themeParam,
    openStayBooking,
    reservationEmail,
  } = useLocalSearchParams<{
    id: string;
    add?: string;
    theme?: string;
    openStayBooking?: string;
    reservationEmail?: string;
  }>();
  const theme = useTheme();
  const setThemePreference = usePreferences((s) => s.setThemePreference);
  const initialAddKind =
    typeof add === 'string' && ADD_KINDS.has(add as TravelItemKind)
      ? (add as TravelItemKind)
      : undefined;
  const initialOpenAddPicker = __DEV__ && add === 'timeline';
  const autoOpenStayBooking =
    __DEV__ &&
    (openStayBooking === '1' || openStayBooking === 'true');
  const autoOpenReservationEmail =
    __DEV__ && typeof reservationEmail === 'string'
      ? reservationEmail
      : undefined;

  // DEV-only: deep-link `?theme=dark|light|system` for simulator QA of themed sheets.
  useEffect(() => {
    if (!__DEV__) return;
    if (typeof themeParam !== 'string' || !THEME_PREFS.has(themeParam as ThemePreference)) {
      return;
    }
    setThemePreference(themeParam as ThemePreference);
  }, [themeParam, setThemePreference]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.backgroundPrimary },
        }}
      />
      <TravelPlanDetail
        planId={id}
        initialAddKind={initialAddKind}
        initialOpenAddPicker={initialOpenAddPicker}
        autoOpenStayBooking={autoOpenStayBooking}
        autoOpenReservationEmail={autoOpenReservationEmail}
      />
    </>
  );
}
