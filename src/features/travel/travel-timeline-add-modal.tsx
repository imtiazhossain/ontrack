import { StyleSheet, View } from 'react-native';

import { AppText, Card, SheetScaffold, Symbol } from '@/components/primitives';
import { kindChrome, kindIcon } from '@/features/travel/travel-kind-chrome';
import { travelMainCardFill } from '@/features/travel/travel-surface';
import type { TravelItemKind } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

type TimelineChoice = {
  kind: TravelItemKind;
  label: string;
  description: string;
};

const TIMELINE_CHOICES: TimelineChoice[] = [
  { kind: 'moment', label: 'Moment', description: 'Capture a memory or trip highlight.' },
  { kind: 'activity', label: 'Activity', description: 'Add a tour or something you plan to do.' },
  { kind: 'flight', label: 'Flight', description: 'Add flight details and travel information.' },
  { kind: 'transport', label: 'Transport', description: 'Add driving, rail, transit, taxi, or ferry travel.' },
  { kind: 'stay', label: 'Stay', description: 'Add a hotel, hostel, or accommodation.' },
  { kind: 'rental', label: 'Rental', description: 'Add a rental car or transportation details.' },
];

function TimelineKindChoice({
  choice,
  onSelect,
}: {
  choice: TimelineChoice;
  onSelect: (kind: TravelItemKind) => void;
}) {
  const theme = useTheme();
  const colors = kindChrome(choice.kind, theme);
  const { spacing, s } = useResponsive();
  const iconSize = Math.max(46, s(48));
  return (
    <Card
      onPress={() => onSelect(choice.kind)}
      testID={AgentUiIds.travel.timelineAdd.kind(choice.kind)}
      accessibilityLabel={choice.label}
      style={[
        styles.choice,
        {
          gap: spacing.md,
          backgroundColor:
            theme.name === 'light' ? travelMainCardFill(theme) : theme.backgroundSunken,
          borderColor: theme.separator,
        },
      ]}>
      <View
        style={[
          styles.choiceIcon,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: iconSize / 2,
            backgroundColor: colors.tint,
          },
        ]}>
        <Symbol name={kindIcon(choice.kind)} size="lg" color={colors.accent} />
      </View>
      <View style={[styles.choiceCopy, { gap: spacing.xxs }]}>
        <AppText variant="subheading" fit>{choice.label}</AppText>
        <AppText variant="caption" color="secondary" numberOfLines={2}>
          {choice.description}
        </AppText>
      </View>
      <Symbol name="chevron-right" size="sm" color={colors.accent} />
    </Card>
  );
}

export function TravelTimelineAddModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (kind: TravelItemKind) => void;
}) {
  const { spacing } = useResponsive();
  return (
    <SheetScaffold
      visible={visible}
      eyebrow="Itinerary"
      title="Add to Timeline"
      subtitle="Choose what you’d like to add."
      onClose={onClose}
      closeAccessibilityLabel="Close add to timeline"
      closeTestID={AgentUiIds.travel.timelineAdd.close}>
      <View style={{ gap: spacing.sm }}>
        {TIMELINE_CHOICES.map((choice) => (
          <TimelineKindChoice key={choice.kind} choice={choice} onSelect={onSelect} />
        ))}
      </View>
    </SheetScaffold>
  );
}

const styles = StyleSheet.create({
  choice: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  choiceIcon: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  choiceCopy: { flex: 1, flexShrink: 1, minWidth: 0 },
});
