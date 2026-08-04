import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Screen,
  SegmentedControl,
  SectionHeader,
  SettingsActionRow,
  SettingsToggleRow,
} from '@/components/primitives';
import { ADDONS } from '@/addons/registry';
import type { AddonId } from '@/addons/types';
import { CloudAccountCard } from '@/features/account/cloud-account-card';
import { ProfileAvatar } from '@/features/account/profile-avatar';
import { ProfileAvatarEditorSheet } from '@/features/account/profile-avatar-editor-sheet';
import { resolveSelfDisplayName } from '@/features/account/self-display-name';
import { HomeLocationSheet } from '@/features/daily-tracking/home-location-sheet';
import { spacing } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useAuthSession } from '@/features/auth/auth-provider';
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
import { haptics } from '@/utils/haptics';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Primary carousel section for account and app preferences. */
export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { s, spacing: rs } = useResponsive();
  const { user } = useAuthSession();
  const name = usePreferences((s) => s.name);
  const goal = usePreferences((s) => s.goal);
  const homeLocation = usePreferences((s) => s.homeLocation);
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
  const [locationOpen, setLocationOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const displayName = resolveSelfDisplayName({ preferencesName: name, user });
  const avatarSize = Math.max(72, s(80));
  const openAvatar = () => {
    haptics.tap();
    setAvatarOpen(true);
  };
  const avatarAgent = useAgentUiTarget(AgentUiIds.profile.avatar, {
    label: 'Customize profile icon',
    onPress: openAvatar,
  });

  const handleReset = () => {
    confirmDestructiveAction({
      title: 'Reset All Data?',
      message:
        'This clears schedules, add-ons data, and app-owned photos on this device. Cloud account data is not deleted. You can sign in again to restore synced data.',
      actionLabel: 'Reset',
      onConfirm: () => {
        void (async () => {
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
        })();
      },
    });
  };

  return (
    <Screen>
      <Pressable
        ref={avatarAgent.ref}
        accessibilityRole="button"
        accessibilityLabel="Customize profile icon"
        testID={avatarAgent.testID}
        onLayout={avatarAgent.onLayout}
        onPress={openAvatar}
        style={[
          styles.hero,
          {
            gap: rs.md,
            marginBottom: rs.lg,
            paddingVertical: rs.md,
          },
        ]}>
        <ProfileAvatar displayName={displayName} size={avatarSize} isSelf />
        <View style={[styles.heroCopy, { gap: rs.xs, minWidth: 0, flexShrink: 1 }]}>
          <AppText variant="title" style={styles.title} fit numberOfLines={1}>
            Profile
          </AppText>
          <AppText variant="body" color="secondary" numberOfLines={2}>
            {displayName} · {goal || 'Living intentionally'}
          </AppText>
          <AppText variant="caption" color="accent" fit>
            Tap to customize icon
          </AppText>
        </View>
      </Pressable>

      <SectionHeader title="Account & Sync" />
      <CloudAccountCard />

      <SectionHeader title="Appearance" />
      <SegmentedControl
        value={themePreference}
        options={THEME_OPTIONS.map((option) => ({
          ...option,
          testID: AgentUiIds.profile.theme(option.value),
        }))}
        onChange={setThemePreference}
        style={styles.segment}
      />

      {__DEV__ ? (
        <>
          <SectionHeader title="Developer" />
          <SettingsActionRow
            label="Design System"
            detail="Canonical components, actions, states, and feature accents"
            icon="smart"
            testID={AgentUiIds.profile.designSystem}
            onPress={() => router.push('/design-system' as never)}
            accessibilityLabel="Open design-system gallery"
          />
        </>
      ) : null}

      <SectionHeader title="Preferences" />
      <SettingsActionRow
        label="Home location"
        detail={homeLocation.trim() || 'Uses phone location · tap to change'}
        icon="location"
        testID={AgentUiIds.profile.homeLocation}
        onPress={() => setLocationOpen(true)}
        accessibilityLabel="Set home location for weather"
      />
      <SettingsToggleRow
        label="AI Summaries"
        detail="Daily insights, meal analysis, and plant analysis"
        value={aiEnabled}
        onValueChange={setAiEnabled}
      />
      <SettingsToggleRow
        label="Haptic Feedback"
        detail="Subtle taps on key actions"
        value={hapticsEnabled}
        onValueChange={setHapticsEnabled}
      />

      <SectionHeader title="Add-ons" />
      <AppText variant="body" color="secondary" style={styles.sectionIntro}>
        Turn an add-on off to hide it on this account; its data is kept.
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
        label="Manage Agents"
        detail={
          installedAgentCount > 0
            ? `${installedAgentCount} installed · permissions and access`
            : 'None installed yet'
        }
        icon="agents"
        testID={AgentUiIds.profile.agents}
        onPress={() => router.push('/agents' as never)}
        accessibilityLabel="Manage Agents"
      />

      <SectionHeader title="Nutrition" />
      <Button
        variant="secondary"
        icon="nutrition-profiles"
        testID={AgentUiIds.profile.nutrition}
        onPress={() => router.push('/nutrition-profile' as never)}
        accessibilityLabel="Open nutrition profiles">
        Profiles, dependents & targets
      </Button>
      <AppText variant="caption" color="secondary" style={styles.clinicalNote}>
        Youth and infant clinical guidance is not available in this version.
      </AppText>

      <SectionHeader title="Legal" />
      <SettingsActionRow
        label="Privacy Policy"
        detail="How onTrack handles your data"
        icon="shield"
        testID={AgentUiIds.profile.privacy}
        onPress={() => router.push('/privacy' as never)}
        accessibilityLabel="Privacy Policy"
      />
      <SettingsActionRow
        label="Terms of Use"
        detail="Rules for using onTrack"
        icon="note"
        testID={AgentUiIds.profile.terms}
        onPress={() => router.push('/terms' as never)}
        accessibilityLabel="Terms of Use"
      />

      <SectionHeader title="Data" />
      <Button
        variant="danger"
        testID={AgentUiIds.profile.resetData}
        onPress={handleReset}
        accessibilityLabel="Reset All Data">
        Reset All Data
      </Button>

      <SectionHeader title="Movie Data" />
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

      <HomeLocationSheet visible={locationOpen} onClose={() => setLocationOpen(false)} />
      <ProfileAvatarEditorSheet visible={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCopy: {
    flex: 1,
  },
  title: { marginBottom: 0 },
  segment: {
    marginBottom: spacing.lg,
  },
  attribution: { gap: spacing.sm, marginBottom: spacing.xl },
  tmdbLogo: { width: 96, height: 40 },
  clinicalNote: { marginTop: spacing.sm, marginBottom: spacing.lg },
  sectionIntro: { marginBottom: spacing.md },
});
