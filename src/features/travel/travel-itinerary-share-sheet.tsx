import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/primitives';
import { radii } from '@/design-system';
import { TravelSheetModal } from '@/features/travel/travel-sheet';
import {
  canonicalTravelTripId,
  listTravelTripRoster,
} from '@/features/travel/trip-roster';
import type {
  TravelItemShareMode,
  TravelItineraryItem,
  TravelPlan,
  TravelTripRosterPerson,
} from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';

export type TravelItineraryShareDraft = {
  shareMode: TravelItemShareMode;
  sharedWithUserIds: string[];
};

type TravelItineraryShareSheetProps = {
  visible: boolean;
  plan: TravelPlan;
  item: TravelItineraryItem | undefined;
  localUserId: string | undefined;
  onClose: () => void;
  onSave: (draft: TravelItineraryShareDraft) => void;
};

function modeLabel(mode: TravelItemShareMode): string {
  if (mode === 'trip') return 'Everyone on trip';
  if (mode === 'selected') return 'Choose people';
  return 'Only me';
}

function modeHint(mode: TravelItemShareMode): string {
  if (mode === 'trip') return 'All co-travelers can see this stop.';
  if (mode === 'selected') return 'Only the people you pick can see it.';
  return 'Hidden from everyone else on this trip.';
}

export function TravelItineraryShareSheet({
  visible,
  plan,
  item,
  localUserId,
  onClose,
  onSave,
}: TravelItineraryShareSheetProps) {
  const theme = useTheme();
  const { spacing, s } = useResponsive();
  const [shareMode, setShareMode] = useState<TravelItemShareMode>('private');
  const [sharedWithUserIds, setSharedWithUserIds] = useState<string[]>([]);
  const [roster, setRoster] = useState<TravelTripRosterPerson[]>([]);

  useEffect(() => {
    if (!visible || !item) return;
    setShareMode(item.shareMode ?? 'private');
    setSharedWithUserIds(item.sharedWithUserIds ?? []);
  }, [visible, item]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    void listTravelTripRoster(canonicalTravelTripId(plan))
      .then((people) => {
        if (!active) return;
        setRoster(
          people.filter(
            (person) => !localUserId || person.userId !== localUserId,
          ),
        );
      })
      .catch(() => {
        if (active) setRoster([]);
      });
    return () => {
      active = false;
    };
  }, [visible, plan, localUserId]);

  const modes = useMemo(
    () => ['private', 'trip', 'selected'] as const,
    [],
  );

  if (!item) return null;

  const togglePerson = (userId: string) => {
    setSharedWithUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  return (
    <TravelSheetModal
      visible={visible}
      eyebrow="Sharing"
      title="Who can see this?"
      subtitle={item.title}
      onClose={onClose}
      closeAccessibilityLabel="Close share settings"
      closeTestID={AgentUiIds.travel.itineraryShare.close}
      footer={
        <Button
          variant="primary"
          shape="rounded"
          icon="check"
          testID={AgentUiIds.travel.itineraryShare.save}
          accessibilityLabel="Save share settings"
          onPress={() =>
            onSave({
              shareMode,
              sharedWithUserIds:
                shareMode === 'selected' ? sharedWithUserIds : [],
            })
          }>
          Save
        </Button>
      }>
      <AgentTestId testID={AgentUiIds.travel.itineraryShare.sheet}>
        <View style={{ gap: spacing.md }}>
          {modes.map((mode) => {
            const selected = shareMode === mode;
            return (
              <AgentTestId
                key={mode}
                testID={AgentUiIds.travel.itineraryShare.mode(mode)}
                label={modeLabel(mode)}
                onPress={() => setShareMode(mode)}
                style={[
                  styles.modeRow,
                  {
                    minHeight: s(56),
                    padding: spacing.md,
                    borderRadius: radii.lg,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected
                      ? theme.accentPrimary
                      : theme.separator,
                    backgroundColor: theme.backgroundSunken,
                  },
                ]}>
                <AppText variant="callout" fit>
                  {modeLabel(mode)}
                </AppText>
                <AppText variant="caption" color="secondary">
                  {modeHint(mode)}
                </AppText>
              </AgentTestId>
            );
          })}
          {shareMode === 'selected' ? (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="callout" fit>
                Co-travelers
              </AppText>
              {roster.length === 0 ? (
                <AppText variant="caption" color="secondary">
                  Invite co-travelers first, then choose who can see this stop.
                </AppText>
              ) : (
                roster.map((person) => {
                  const selected = sharedWithUserIds.includes(person.userId);
                  return (
                    <AgentTestId
                      key={person.userId}
                      testID={AgentUiIds.travel.itineraryShare.person(
                        person.userId,
                      )}
                      label={`Share with ${person.displayName}`}
                      onPress={() => togglePerson(person.userId)}
                      style={[
                        styles.personRow,
                        {
                          minHeight: s(48),
                          paddingHorizontal: spacing.md,
                          borderRadius: radii.md,
                          backgroundColor: selected
                            ? theme.accentSoft
                            : theme.backgroundSunken,
                        },
                      ]}>
                      <AppText
                        variant="callout"
                        fit
                        style={styles.personName}>
                        {person.displayName}
                      </AppText>
                      <AppText variant="caption" color="secondary" fit>
                        {selected ? 'Shared' : 'Not shared'}
                      </AppText>
                    </AgentTestId>
                  );
                })
              )}
            </View>
          ) : null}
        </View>
      </AgentTestId>
    </TravelSheetModal>
  );
}

const styles = StyleSheet.create({
  modeRow: { gap: 4 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  personName: { flexShrink: 1, minWidth: 0 },
});
