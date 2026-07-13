import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, SectionHeader } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences, type ThemePreference } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function ProfileScreen() {
  const theme = useTheme();
  const name = usePreferences((s) => s.name);
  const goal = usePreferences((s) => s.goal);
  const themePreference = usePreferences((s) => s.themePreference);
  const aiEnabled = usePreferences((s) => s.aiEnabled);
  const hapticsEnabled = usePreferences((s) => s.hapticsEnabled);
  const setThemePreference = usePreferences((s) => s.setThemePreference);
  const setAiEnabled = usePreferences((s) => s.setAiEnabled);
  const setHapticsEnabled = usePreferences((s) => s.setHapticsEnabled);
  const resetPreferences = usePreferences((s) => s.resetAll);
  const resetSchedule = useSchedule((s) => s.resetAll);
  const seedIfNeeded = useSchedule((s) => s.seedIfNeeded);

  const handleReset = () => {
    resetPreferences();
    resetSchedule();
    seedIfNeeded();
  };

  return (
    <Screen>
      <AppText variant="title" style={styles.title}>
        Profile
      </AppText>
      <AppText variant="body" color="secondary">
        {name || 'You'} · {goal || 'Living intentionally'}
      </AppText>

      <SectionHeader title="Appearance" />
      <View style={styles.segment}>
        {THEME_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityLabel={`Theme ${opt.label}`}
            onPress={() => setThemePreference(opt.value)}
            style={[
              styles.segmentItem,
              {
                backgroundColor: themePreference === opt.value ? theme.accentFaint : theme.backgroundSunken,
                borderColor: themePreference === opt.value ? theme.accentPrimary : theme.separator,
              },
            ]}>
            <AppText variant="callout" color={themePreference === opt.value ? 'accent' : 'primary'}>
              {opt.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Preferences" />
      <ToggleRow
        label="AI summaries"
        detail="Daily insights and meal analysis"
        value={aiEnabled}
        onToggle={() => setAiEnabled(!aiEnabled)}
      />
      <ToggleRow
        label="Haptic feedback"
        detail="Subtle taps on key actions"
        value={hapticsEnabled}
        onToggle={() => setHapticsEnabled(!hapticsEnabled)}
      />

      <SectionHeader title="Data" />
      <Button variant="danger" onPress={handleReset} accessibilityLabel="Reset all data">
        Reset all data
      </Button>

      <SectionHeader title="Movie data" />
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Open The Movie Database"
        onPress={() => WebBrowser.openBrowserAsync('https://www.themoviedb.org')}
        style={styles.attribution}>
        <Image
          source="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
          style={styles.tmdbLogo}
          contentFit="contain"
        />
        <AppText variant="caption" color="secondary">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </AppText>
      </Pressable>
    </Screen>
  );
}

function ToggleRow({
  label,
  detail,
  value,
  onToggle,
}: {
  label: string;
  detail: string;
  value: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={onToggle}
      style={[styles.toggleRow, { backgroundColor: theme.backgroundSunken, borderColor: theme.separator }]}>
      <View style={styles.toggleText}>
        <AppText variant="callout">{label}</AppText>
        <AppText variant="caption" color="secondary">
          {detail}
        </AppText>
      </View>
      <AppText variant="callout" color={value ? 'accent' : 'tertiary'}>
        {value ? 'On' : 'Off'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.xs },
  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  toggleText: {
    flex: 1,
    gap: spacing.xxs,
  },
  attribution: { gap: spacing.sm, marginBottom: spacing.xl },
  tmdbLogo: { width: 96, height: 40 },
});
