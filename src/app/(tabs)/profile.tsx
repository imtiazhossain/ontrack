import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Screen,
  SectionHeader,
  SettingsActionRow,
  SettingsToggleRow,
} from '@/components/primitives';
import { ADDONS } from '@/addons/registry';
import type { AddonId } from '@/addons/types';
import { CloudAccountCard } from '@/features/account/cloud-account-card';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences, type ThemePreference } from '@/store/preferences';
import { useAddons } from '@/store/addons';
import { useAgents } from '@/store/agents';
import { useSchedule } from '@/store/schedule';
import { usePlants } from '@/store/plants';
import { useTravel } from '@/store/travel';
import { useTodos } from '@/store/todos';
import { deletePlant } from '@/services/plants/schedule';
import { deleteAllVisionBoardImages } from '@/features/vision-board/media';
import { useVisionBoard } from '@/store/vision-board';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Primary carousel section for account and app preferences. */
export default function ProfileSettingsScreen() {
  const router = useRouter();
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
  const enabledAddons = useAddons((s) => s.enabled);
  const setAddonEnabled = useAddons((s) => s.setEnabled);
  const resetAddons = useAddons((s) => s.reset);
  const installedAgentCount = useAgents((s) => Object.keys(s.installations).length);
  const resetAgents = useAgents((s) => s.reset);
  const resetSchedule = useSchedule((s) => s.resetAll);
  const seedIfNeeded = useSchedule((s) => s.seedIfNeeded);
  const plants = usePlants((s) => s.plants);
  const resetPlants = usePlants((s) => s.reset);
  const resetTravel = useTravel((s) => s.reset);
  const resetTodos = useTodos((s) => s.reset);
  const resetVisionBoard = useVisionBoard((s) => s.reset);

  const handleReset = async () => {
    await Promise.all([
      ...plants.map((plant) => deletePlant(plant.id)),
      deleteAllVisionBoardImages(),
    ]);
    resetPlants();
    resetPreferences();
    resetAddons();
    resetAgents();
    resetSchedule();
    resetTravel();
    resetTodos();
    resetVisionBoard();
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

      <SectionHeader title="Account & sync" />
      <CloudAccountCard />

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
      <SettingsToggleRow
        label="AI summaries"
        detail="Daily insights, meal analysis, and plant analysis"
        value={aiEnabled}
        onValueChange={setAiEnabled}
      />
      <SettingsToggleRow
        label="Haptic feedback"
        detail="Subtle taps on key actions"
        value={hapticsEnabled}
        onValueChange={setHapticsEnabled}
      />

      <SectionHeader title="Add-ons" />
      <AppText variant="body" color="secondary" style={styles.sectionIntro}>
        Testers have access to every add-on. Turn one off to hide it on this account; its data is kept.
      </AppText>
      {ADDONS.map((addon) => (
        <SettingsToggleRow
          key={addon.id}
          label={addon.name}
          detail={addon.description}
          value={enabledAddons[addon.id]}
          onValueChange={(value) => setAddonEnabled(addon.id as AddonId, value)}
        />
      ))}

      <SectionHeader title="Agents" />
      <SettingsActionRow
        label="Manage agents"
        detail={
          installedAgentCount > 0
            ? `${installedAgentCount} installed · permissions and access`
            : 'Agent-ready · none installed'
        }
        icon="agents"
        onPress={() => router.push('/agents' as never)}
        accessibilityLabel="Manage agents"
      />

      <SectionHeader title="Nutrition" />
      <Button variant="secondary" icon="nutrition-profiles" onPress={() => router.push('/nutrition-profile' as never)} accessibilityLabel="Open nutrition profiles">
        Profiles, dependents & targets
      </Button>
      <AppText variant="caption" color="secondary" style={styles.clinicalNote}>
        Youth and infant guidance remains disabled until its release gates are complete.
      </AppText>

      <SectionHeader title="Data" />
      <Button variant="danger" onPress={() => void handleReset()} accessibilityLabel="Reset all data">
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
  attribution: { gap: spacing.sm, marginBottom: spacing.xl },
  tmdbLogo: { width: 96, height: 40 },
  clinicalNote: { marginTop: spacing.sm, marginBottom: spacing.lg },
  sectionIntro: { marginBottom: spacing.md },
});
