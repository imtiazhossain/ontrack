import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
    appPrompt,
    AppText,
    Button,
    Card,
    GlassIconWell,
    Screen,
    SectionHeader,
    Symbol,
} from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { PeoplePicker } from '@/features/social/people-picker';
import { useTheme } from '@/hooks/use-theme';
import type { FriendProfile } from '@/services/friends';
import { useFriends } from '@/store/friends';
import { AgentUiIds } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

import { balloonFill } from './balloon-pop/colors';

/** Games add-on hub — lists available mini-games. */
export function GamesHub() {
  const theme = useTheme();
  const router = useRouter();
  const preview = ['red', 'blue', 'green', 'yellow'] as const;
  const [pickingFriends, setPickingFriends] = useState(false);
  const hydrateFriends = useFriends((state) => state.hydrate);

  const challengeFriends = (friends: FriendProfile[]) => {
    if (!friends.length) return;
    appPrompt.alert(
      'Coming Soon',
      `Challenges for ${friends.map((friend) => friend.displayName).join(', ')} are on the way.`,
    );
  };

  return (
    <>
      <Screen>
        <SectionHeader title="Games" detail="Short breaks, quick focus" />
        <AppText variant="body" color="secondary" style={styles.intro}>
          Toggle Games off anytime in Profile → Add-ons. Progress stays local to each round.
        </AppText>

        <Button
          variant="secondary"
          icon="people"
          testID={AgentUiIds.games.challengeFriend}
          style={styles.challenge}
          onPress={() => {
            void hydrateFriends().catch(() => undefined);
            setPickingFriends(true);
          }}>
          Challenge a Friend
        </Button>

        <Card
          testID={AgentUiIds.games.balloonPopCard}
          accessibilityLabel="Play Balloon Pop"
          onPress={() => {
            haptics.select();
            router.push('/games/balloon-pop' as never);
          }}
          style={styles.card}>
          <View style={styles.cardRow}>
            <GlassIconWell size={48} borderRadius={radii.md}>
              <Symbol name="games" size={28} color={theme.accentPrimary} />
            </GlassIconWell>
            <View style={styles.cardCopy}>
              <AppText variant="subheading">Balloon Pop</AppText>
              <AppText variant="callout" color="secondary">
                Pop the target color before the clock runs out. Fans add wind as levels climb.
              </AppText>
              <View style={styles.swatches}>
                {preview.map((id) => (
                  <View
                    key={id}
                    style={[
                      styles.swatch,
                      { backgroundColor: balloonFill(id, theme.name === 'dark') },
                    ]}
                  />
                ))}
              </View>
            </View>
            <Symbol name="chevron-right" size={20} color={theme.textTertiary} />
          </View>
        </Card>
      </Screen>
      <PeoplePicker
        visible={pickingFriends}
        title="Challenge a Friend"
        confirmLabel="Challenge"
        multi={false}
        onClose={() => setPickingFriends(false)}
        onConfirm={challengeFriends}
      />
    </>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: spacing.md,
  },
  challenge: {
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  swatches: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: radii.pill,
  },
});
