import { View } from 'react-native';

import { AppText, Button, SheetScaffold } from '@/components/primitives';
import { useResponsive } from '@/hooks/use-responsive';
import { AgentUiIds } from '@/utils/agent-ui';

export type TravelImportResult =
  | {
      stage: 'imported';
      kindLabel: string;
      duplicateItinerary: boolean;
    }
  | { stage: 'expense-saved' };

export function TravelImportResultModal({
  result,
  onClose,
  onReviewExpense,
}: {
  result: TravelImportResult | null;
  onClose: () => void;
  onReviewExpense: () => void;
}) {
  const { spacing } = useResponsive();
  if (!result) return null;

  const imported = result.stage === 'imported';
  const kindLabel = imported ? result.kindLabel : undefined;
  const message = imported
    ? result.duplicateItinerary
      ? `This ${kindLabel?.toLowerCase()} was already in your itinerary. Review the related expense to avoid duplicates.`
      : `Your ${kindLabel?.toLowerCase()} was imported. Review the related expense before moving on.`
    : 'Your imported expense is now part of this trip.';

  return (
    <SheetScaffold
      visible
      eyebrow="Success"
      title={imported ? `${kindLabel} Added` : 'Expense Saved'}
      subtitle={imported ? 'Your itinerary has been updated.' : 'Everything is up to date.'}
      onClose={onClose}
      closeAccessibilityLabel="Go to itinerary"
      closeTestID={AgentUiIds.travel.importResult.close}>
      <View style={{ gap: spacing.lg }}>
        <AppText color="secondary" align="center">
          {message}
        </AppText>
        <Button
          variant="primary"
          size="lg"
          icon="receipt"
          testID={AgentUiIds.travel.importResult.reviewExpense}
          accessibilityLabel="Review expense"
          onPress={onReviewExpense}>
          Review Expense
        </Button>
      </View>
    </SheetScaffold>
  );
}
