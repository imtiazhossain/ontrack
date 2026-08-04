import { useEffect } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';

import { TravelPlanDetail } from '@/features/travel/travel-plan-detail';
import type { TravelImportResult } from '@/features/travel/travel-import-result-modal';
import { useTravelPageStyle } from '@/features/travel/travel-surface';
import type { TravelItemKind } from '@/features/travel/types';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences, type ThemePreference } from '@/store/preferences';

const ADD_KINDS = new Set<TravelItemKind>([
  'moment',
  'activity',
  'flight',
  'transport',
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
    previewModal,
  } = useLocalSearchParams<{
    id: string;
    add?: string;
    theme?: string;
    openStayBooking?: string;
    reservationEmail?: string;
    previewModal?: string;
  }>();
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
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
  const initialImportResult: TravelImportResult | undefined =
    __DEV__ && previewModal === 'import'
      ? { stage: 'imported', kindLabel: 'Flight', duplicateItinerary: false }
      : __DEV__ && previewModal === 'expense'
        ? { stage: 'expense-saved' }
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
          contentStyle: { ...travelStyle, paddingTop: 0 },
        }}
      />
      <TravelPlanDetail
        key={`${id}:${previewModal ?? ''}`}
        planId={id}
        initialAddKind={initialAddKind}
        initialOpenAddPicker={initialOpenAddPicker}
        autoOpenStayBooking={autoOpenStayBooking}
        autoOpenReservationEmail={autoOpenReservationEmail}
        initialImportResult={initialImportResult}
      />
    </>
  );
}
